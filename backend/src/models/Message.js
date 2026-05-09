const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    text: { type: String },
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    attachments: [{ 
        url: { type: String },
        fileType: { type: String },
        name: { type: String }
    }],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reactions: [{
        emoji: { type: String },
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // Changed to ObjectId for better querying
    }],
    replyTo: {
        _id: { type: String },
        text: { type: String },
        senderName: { type: String }
    },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
