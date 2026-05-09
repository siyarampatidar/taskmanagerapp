const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
require('dotenv').config();
const express = require('express');
// Triggering restart for new routes
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');

// Models
require('./src/models/Company');
require('./src/models/User');
require('./src/models/Plan');
require('./src/models/Subscription');
require('./src/models/Department');
require('./src/models/Task');
require('./src/models/Lead');
require('./src/models/Channel');
require('./src/models/Message');
require('./src/models/Notification');
require('./src/models/Invite');
require('./src/models/Leave');
require('./src/models/Attendance');
require('./src/models/Invoice');
require('./src/models/Payment');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",
            "https://taskmanagementfrontend-es8h.onrender.com"
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true
    }
});

// Database Connection
connectDB();

// Services Initialization
const { initSocket } = require('./src/services/socketService');
initSocket(io);

// Middleware
app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://taskmanagementfrontend-es8h.onrender.com"
    ],
    credentials: true
}));
app.use((req, res, next) => {
    req.io = io;
    next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Import Routes
const authRoutes = require('./src/routes/authRoutes');
const superAdminRoutes = require('./src/routes/superAdminRoutes');
const departmentRoutes = require('./src/routes/departmentRoutes');
const employeeRoutes = require('./src/routes/employeeRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const crmRoutes = require('./src/routes/crmRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const leaveRoutes = require('./src/routes/leaveRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const companyRoutes = require('./src/routes/companyRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const projectRoutes = require('./src/routes/projectRoutes');
const billingRoutes = require('./src/routes/billingRoutes');
const subscriptionRoutes = require('./src/routes/subscriptionRoutes');
const livekitRoutes = require('./src/routes/livekitRoutes');


// Import Middlewares
const authMiddleware = require('./src/middleware/authMiddleware');
const subscriptionMiddleware = require('./src/middleware/subscriptionMiddleware');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superAdminRoutes);

// Protected Modules (Requires Active Subscription for Write Actions)
app.use('/api/departments', authMiddleware, subscriptionMiddleware, departmentRoutes);
app.use('/api/employees', authMiddleware, subscriptionMiddleware, employeeRoutes);
app.use('/api/tasks', authMiddleware, subscriptionMiddleware, taskRoutes);
app.use('/api/crm', authMiddleware, subscriptionMiddleware, crmRoutes);
app.use('/api/chat', authMiddleware, subscriptionMiddleware, chatRoutes);
app.use('/api/reports', authMiddleware, subscriptionMiddleware, reportRoutes);
app.use('/api/leaves', authMiddleware, subscriptionMiddleware, leaveRoutes);
app.use('/api/attendance', authMiddleware, subscriptionMiddleware, attendanceRoutes);
app.use('/api/company', authMiddleware, subscriptionMiddleware, companyRoutes);
app.use('/api/notifications', authMiddleware, subscriptionMiddleware, notificationRoutes);
app.use('/api/projects', authMiddleware, subscriptionMiddleware, projectRoutes);
app.use('/api/billing', authMiddleware, subscriptionMiddleware, billingRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/livekit', livekitRoutes);


// Serve static files from uploads directory
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ message: 'TeamFlow API is running!', status: 'healthy', timestamp: new Date() });
});

// Setup Socket.io logic
const jwt = require('jsonwebtoken');
const Message = require('./src/models/Message');
const Channel = require('./src/models/Channel');

io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error - No Token'));
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (err) {
        next(new Error('Authentication error - Invalid Token'));
    }
});

io.on('connection', (socket) => {
    // console.log('User connected to socket:', socket.id, socket.user.role);
    socket.join(socket.user.id); // JOIN PRIVATE ROOM FOR NOTIFICATIONS
    socket.join(socket.user.companyId); // JOIN COMPANY ROOM FOR SITE-WIDE UPDATES (Tasks, CRM, etc)

    // Online Status Tracking
    const updateOnlineUsers = () => {
        const onlineUsers = Array.from(io.sockets.sockets.values())
            .map(s => s.user.id);
        const uniqueUsers = [...new Set(onlineUsers)];
        io.emit('onlineUsers', uniqueUsers);
    };
    updateOnlineUsers();

    // Group users by room (channelId)
    socket.on('joinRoom', (channelId) => {
        socket.join(channelId);
        console.log(`User ${socket.user.id} joined channel ${channelId}`);
    });

    // Real-time message broadcasting + persisting logic
    socket.on('sendMessage', async (data) => {
        try {
            const { channelId, text, attachments, replyTo } = data;
            const message = await Message.create({
                text,
                channelId,
                senderId: socket.user.id,
                companyId: socket.user.companyId,
                attachments: attachments || [],
                replyTo: replyTo?.  _id ? replyTo : undefined
            });

            // Update channel's last message info for sorting
            await Channel.findByIdAndUpdate(channelId, {
                lastMessage: text || (attachments?.length > 0 ? 'Attachment' : ''),
                lastMessageAt: new Date()
            });

            // Populate sender info before broadcasting
            const populatedMsg = await message.populate('senderId', 'name role');

            io.to(channelId).emit('newMessage', populatedMsg);
        } catch (error) {
            console.error('Socket message error:', error);
        }
    });

    socket.on('editMessage', async (data) => {
        try {
            const { messageId, text, channelId } = data;
            const message = await Message.findOneAndUpdate(
                { _id: messageId, senderId: socket.user.id },
                { text, isEdited: true },
                { new: true }
            ).populate('senderId', 'name role');

            if (message) {
                io.to(channelId).emit('messageUpdated', message);
            }
        } catch (error) {
            console.error('Edit message error:', error);
        }
    });

    socket.on('unsendMessage', async (data) => {
        try {
            const { messageId, channelId } = data;
            const message = await Message.findOneAndUpdate(
                { _id: messageId, senderId: socket.user.id },
                { text: 'This message was deleted', isDeleted: true, deletedAt: new Date(), attachments: [] },
                { new: true }
            ).populate('senderId', 'name role');

            if (message) {
                io.to(channelId).emit('messageUpdated', message);
            }
        } catch (error) {
            console.error('Unsend message error:', error);
        }
    });

    socket.on('reactToMessage', async (data) => {
        try {
            const { messageId, emoji, channelId } = data;
            const userId = socket.user.id;

            const message = await Message.findById(messageId);
            if (!message) return;

            const existing = message.reactions.find(r => r.emoji === emoji);
            if (existing) {
                if (existing.users.map(u => u.toString()).includes(userId.toString())) {
                    existing.users = existing.users.filter(u => u.toString() !== userId.toString());
                    if (existing.users.length === 0) {
                        message.reactions = message.reactions.filter(r => r.emoji !== emoji);
                    }
                } else {
                    existing.users.push(userId);
                }
            } else {
                message.reactions.push({ emoji, users: [userId] });
            }

            await message.save();
            io.to(channelId).emit('messageReacted', { messageId, reactions: message.reactions });
        } catch (error) {
            console.error('React message error:', error);
        }
    });

    socket.on('deleteMessage', async (data) => {
        try {
            const { messageId, channelId } = data;
            // Admin or sender can physically delete if needed, but here we just delete
            await Message.findByIdAndDelete(messageId);
            io.to(channelId).emit('messageDeleted', messageId);
        } catch (error) {
            console.error('Delete message error:', error);
        }
    });

    socket.on('forwardMessage', async ({ message, targetChannelIds, targetUserIds }) => {
        try {
            const companyId = socket.user.companyId;
            const senderId = socket.user.id;

            // Collect all target channel IDs (including from userIds)
            let allChannelIds = [...(targetChannelIds || [])];

            if (targetUserIds?.length > 0) {
                const resolvedUserChannelIds = await Promise.all(targetUserIds.map(async (uid) => {
                    let channel = await Channel.findOne({
                        type: 'direct',
                        companyId,
                        members: { $all: [senderId, uid], $size: 2 }
                    });
                    if (!channel) {
                        channel = await Channel.create({
                            name: `DM_${senderId}_${uid}`,
                            type: 'direct',
                            companyId,
                            members: [senderId, uid]
                        });
                    }
                    return channel._id.toString();
                }));
                allChannelIds = [...new Set([...allChannelIds, ...resolvedUserChannelIds])];
            }

            const results = await Promise.all(allChannelIds.map(async (channelId) => {
                const newMessage = await Message.create({
                    text: message.text,
                    channelId,
                    senderId,
                    companyId,
                    attachments: message.attachments || []
                });

                await Channel.findByIdAndUpdate(channelId, {
                    lastMessage: message.text || (message.attachments?.length > 0 ? 'Forwarded Attachment' : 'Forwarded Message'),
                    lastMessageAt: new Date()
                });

                const populated = await newMessage.populate('senderId', 'name role');
                io.to(channelId).emit('newMessage', populated);
                return populated;
            }));
        } catch (error) {
            console.error('Forward error:', error);
        }
    });

    socket.on('markAsRead', async ({ channelId }) => {
        try {
            const userId = socket.user.id;
            await Message.updateMany(
                { channelId, readBy: { $ne: userId }, senderId: { $ne: userId } },
                { $addToSet: { readBy: userId } }
            );
            // Notify others in the room that messages were read
            io.to(channelId).emit('messagesRead', { channelId, userId });
        } catch (error) {
            console.error('Mark read error:', error);
        }
    });

    // --- Call Invitation Events (LiveKit) ---
    socket.on('inviteToCall', (data) => {
        // data: { userToCall, roomName, type, fromName, fromId, isChannel, channelId }
        const target = data.isChannel ? data.channelId : data.userToCall;
        
        if (data.isChannel) {
            socket.to(target).emit('incomingCall', { 
                roomName: data.roomName,
                from: data.fromId, 
                name: data.fromName,
                type: data.type,
                isChannel: true,
                channelId: data.channelId
            });
        } else {
            io.to(target).emit('incomingCall', { 
                roomName: data.roomName,
                from: data.fromId, 
                name: data.fromName,
                type: data.type 
            });
        }
    });

    socket.on('acceptCall', (data) => {
        // data: { to, roomName }
        io.to(data.to).emit('callAccepted', { from: socket.user.id, roomName: data.roomName });
    });

    socket.on('rejectCall', (data) => {
        io.to(data.to).emit('callRejected', { from: socket.user.id });
    });

    socket.on('endCall', (data) => {
        io.to(data.to).emit('callEnded', { from: socket.user.id });
    });


    // Typing Indicators
    socket.on('typing', ({ channelId, userName }) => {
        socket.to(channelId).emit('typing', { channelId, userId: socket.user.id, userName });
    });

    socket.on('stopTyping', ({ channelId }) => {
        socket.to(channelId).emit('stopTyping', { channelId, userId: socket.user.id });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        updateOnlineUsers();
    });
});

// Setup Cron Jobs
require('./src/cron/subscriptionCheck');
require('./src/cron/autoAbsentCheck');

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('GLOBAL ERROR:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// BACKGROUND JOBS (e.g., Lead Reminders)
const Lead = require('./src/models/Lead');
const { createNotification } = require('./src/services/notificationService');

setInterval(async () => {
    try {
        const soon = new Date();
        soon.setHours(soon.getHours() + 1); // Check for follow-ups in the next 1 hour

        const upcomingLeads = await Lead.find({
            nextFollowUpDate: { $lte: soon, $gte: new Date() },
            followUpNotified: false,
            assignedTo: { $ne: null }
        });

        for (const lead of upcomingLeads) {
            await createNotification(io, {
                userId: lead.assignedTo,
                type: 'system_alert',
                title: 'Upcoming Lead Follow-up',
                message: `Reminder: You have a scheduled follow-up for ${lead.name} at ${new Date(lead.nextFollowUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
                referenceId: lead._id,
                referenceType: 'Lead',
                companyId: lead.companyId
            });
            lead.followUpNotified = true;
            await lead.save();
        }
    } catch (err) {
        console.error('Background Job Error:', err);
    }
}, 1000 * 60 * 15); // Every 15 minutes

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
