const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(20);
        
        const unreadCount = await Notification.countDocuments({ userId, isRead: false });

        res.json({ success: true, notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching notifications', error: error.message });
    }
};

exports.markRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;

        if (notificationId === 'all') {
            await Notification.updateMany({ userId, isRead: false }, { isRead: true });
        } else {
            await Notification.findOneAndUpdate({ _id: notificationId, userId }, { isRead: true });
        }

        res.json({ success: true, message: 'Notification(s) marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating notification', error: error.message });
    }
};
