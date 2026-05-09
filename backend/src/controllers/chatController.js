const Message = require('../models/Message');
const Channel = require('../models/Channel');
const User = require('../models/User');
const { emitToUser, emitToChannel } = require('../services/socketService');
const { logActivity } = require('../services/activityService');

exports.getChannels = async (req, res) => {
    try {
        const { id: userId, role, companyId, departmentId } = req.user;

        // 1. Find all projects where this user is a member
        const Project = require('../models/Project');
        const userProjects = await Project.find({
            companyId,
            $or: [
                { type: 'public' },
                { members: userId }
            ]
        }).select('_id');
        const projectIds = userProjects.map(p => p._id);

        let query = { companyId };
        if (role !== 'admin') {
            query.$or = [
                { type: 'public' },
                { type: 'announcement' },
                { type: 'department', departmentId },
                { members: userId },
                // Allow visibility if user is part of the project AND the channel is PUBLIC to that project
                { projectId: { $in: projectIds }, type: 'public' }
            ];
        }
        // IMPORTANT: Private channels (type: 'group' or 'team' depending on schema) 
        // with projectId set should ONLY be visible if userId is in 'members' list.
        // The current query already handles this via { members: userId }.
        
        let channels = await Channel.find(query).populate('members', 'name role designation').sort({ lastMessageAt: -1 });

        // Add unread count for each channel
        const channelsWithUnread = await Promise.all(channels.map(async (channel) => {
            const unreadCount = await Message.countDocuments({
                channelId: channel._id,
                readBy: { $ne: userId },
                senderId: { $ne: userId } // Exclude own messages
            });
            return { ...channel._doc, unreadCount };
        }));

        res.json({ success: true, channels: channelsWithUnread });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching channels', error: error.message });
    }
};

exports.createChannel = async (req, res) => {
    try {
        const { name, type, members, projectId, departmentId, description, topic } = req.body;
        const companyId = req.user.companyId;
        const createdBy = req.user.id;
        const role = req.user.role?.toLowerCase();

        // RBAC: Only Admin, HR, and Managers can create channels (unless it's a direct message via another route)
        if (!['admin', 'hr', 'manager'].includes(role) && type !== 'direct') {
            return res.status(403).json({ success: false, message: 'You do not have permission to create channels.' });
        }

        const channel = await Channel.create({
            name, type, members: members || [createdBy], companyId, projectId, departmentId, description, topic, createdBy
        });

        await logActivity({
            action: 'Channel Created',
            details: `Channel "#${name}" was created.`,
            userId: createdBy,
            companyId,
            referenceId: channel._id,
            referenceType: 'Channel'
        });

        res.status(201).json({ success: true, channel });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating channel', error: error.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { channelId } = req.params;
        const userId = req.user.id;

        await Message.updateMany(
            { channelId, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error marking messages as read', error: error.message });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { channelId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const companyId = req.user.companyId;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const messages = await Message.find({ channelId, companyId })
            .populate('senderId', 'name role designation')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({ 
            success: true, 
            messages: messages.reverse(),
            hasMore: messages.length === parseInt(limit)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching messages', error: error.message });
    }
};

exports.createDirectMessage = async (req, res) => {
    try {
        const { targetUserId } = req.body;
        const userId = req.user.id;
        const companyId = req.user.companyId;

        // Check if DM exists
        let channel = await Channel.findOne({
            type: 'direct',
            companyId,
            members: { $all: [userId, targetUserId], $size: 2 }
        }).populate('members', 'name role designation');

        if (!channel) {
            const targetUser = await User.findById(targetUserId);
            if (!targetUser) return res.status(404).json({ success: false, message: 'Target user not found' });

            channel = await Channel.create({
                name: `DM_${userId}_${targetUserId}`,
                type: 'direct',
                companyId,
                members: [userId, targetUserId]
            });
            channel = await channel.populate('members', 'name role designation');
        }

        res.json({ success: true, channel });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating DM channel', error: error.message });
    }
};

// REST fallback for messages (called via socket logic usually)
exports.sendMessageRest = async (req, res) => {
    try {
        const { channelId, text, attachments } = req.body;
        const senderId = req.user.id;
        const companyId = req.user.companyId;

        const message = await Message.create({
            channelId, senderId, companyId, text, attachments
        });
        
        const populatedMsg = await message.populate('senderId', 'name role designation');
        emitToChannel(channelId, 'newMessage', populatedMsg);

        res.json({ success: true, message: populatedMsg });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error sending message', error: error.message });
    }
};

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        
        res.json({ 
            success: true, 
            file: {
                url: req.file.path,
                name: req.file.originalname,
                fileType: req.file.mimetype
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
    }
};

exports.broadcastMessage = async (req, res) => {
    try {
        const { targetChannelIds = [], targetUserIds = [], text, attachments = [] } = req.body;
        const senderId = req.user.id;
        const companyId = req.user.companyId;
        const results = [];

        // 1. Broadcast to Channels
        for (const channelId of targetChannelIds) {
            const message = await Message.create({
                channelId, senderId, companyId, text, attachments
            });
            const populated = await message.populate('senderId', 'name role designation');
            emitToChannel(channelId, 'newMessage', populated);
            results.push(populated);
        }

        // 2. Broadcast to Users (Individual DMs)
        for (const targetUserId of targetUserIds) {
            // Find or create DM channel
            let channel = await Channel.findOne({
                type: 'direct',
                companyId,
                members: { $all: [senderId, targetUserId], $size: 2 }
            });

            if (!channel) {
                channel = await Channel.create({
                    name: `DM_${senderId}_${targetUserId}`,
                    type: 'direct',
                    companyId,
                    members: [senderId, targetUserId]
                });
            }

            const message = await Message.create({
                channelId: channel._id,
                senderId,
                companyId,
                text,
                attachments
            });
            const populated = await message.populate('senderId', 'name role designation');
            emitToChannel(channel._id, 'newMessage', populated);
            results.push(populated);
        }

        res.json({ success: true, count: results.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Broadcast failed', error: error.message });
    }
};
exports.reactToMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user.id?.toString();

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

        const existing = message.reactions.find(r => r.emoji === emoji);
        if (existing) {
            if (existing.users.includes(userId)) {
                // Toggle off
                existing.users = existing.users.filter(u => u !== userId);
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
        const { emitToChannel } = require('../services/socketService');
        emitToChannel(message.channelId.toString(), 'messageReacted', {
            messageId: message._id,
            reactions: message.reactions
        });

        res.json({ success: true, reactions: message.reactions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error reacting to message', error: error.message });
    }
};

exports.inviteToChannel = async (req, res) => {
    try {
        const { channelId } = req.params;
        const { userIds } = req.body; // Array of user IDs to invite

        const channel = await Channel.findById(channelId);
        if (!channel) return res.status(404).json({ success: false, message: "Channel not found" });

        // Replace members array with new list (allows both addition and removal)
        channel.members = userIds;

        await channel.save();
        const populatedChannel = await Channel.findById(channelId).populate('members', 'name role designation image');
        
        res.status(200).json({ 
            success: true, 
            message: "Members invited successfully", 
            members: populatedChannel.members 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
