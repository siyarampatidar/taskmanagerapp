const Notification = require('../models/Notification');

exports.createNotification = async (io, { userId, type, title, message, referenceId, referenceType, companyId }) => {
    try {
        const notification = await Notification.create({
            userId, 
            type, 
            title, 
            message, 
            referenceId, 
            referenceType, 
            companyId
        });
        
        if (io) {
            // Emit to the user's private room
            io.to(userId.toString()).emit('newNotification', notification);
        }
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};
