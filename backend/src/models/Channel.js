const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g. '#general' or User IDs for DM
    type: { 
        type: String, 
        enum: ['public', 'department', 'team', 'direct', 'group', 'announcement'], 
        default: 'public' 
    },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }, // Link to a Project
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    description: { type: String },
    topic: { type: String },
    isSystem: { type: Boolean, default: false }, 
    lastMessage: { type: String },
    lastMessageAt: { type: Date, default: new Date(0) },
    permissions: {
        canInvite: { type: [String], default: ['admin', 'manager', 'teamhead'] },
        canPost: { type: [String], default: ['admin', 'manager', 'teamhead', 'employee'] }
    }
}, { timestamps: true });

module.exports = mongoose.model('Channel', channelSchema);
