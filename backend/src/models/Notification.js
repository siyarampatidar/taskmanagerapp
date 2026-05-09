const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    type: { 
        type: String, 
        enum: ['task_assigned', 'task_review', 'lead_assigned', 'system_alert', 'mention'], 
        required: true 
    },
    title: { 
        type: String, 
        required: true 
    },
    message: { 
        type: String, 
        required: true 
    },
    referenceId: { 
        type: mongoose.Schema.Types.ObjectId, 
        default: null 
    },
    referenceType: { 
        type: String, 
        enum: ['Task', 'Lead', 'Channel', 'Message', 'User'],
        default: null
    },
    isRead: { 
        type: Boolean, 
        default: false 
    },
    companyId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Company', 
        required: true 
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
