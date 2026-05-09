const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { 
        type: String, 
        enum: ['todo', 'inprogress', 'inreview', 'revision', 'completed', 'overdue'], 
        default: 'todo' 
    },
    acceptanceStatus: { 
        type: String, 
        enum: ['pending', 'accepted', 'rejected'], 
        default: 'pending' 
    },
    rejectionReason: { type: String, default: null },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teamHeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // The head who delegated this task
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', default: null },
    isApprovedByTeamHead: { type: Boolean, default: false },
    isApprovedByManager: { type: Boolean, default: false },
    transferredFromDept: { type: String, default: null },
    revisionNote: { type: String, default: null },
    deadline: { type: Date },
    attachments: [{ type: String }], // Array of file URLs
    subTasks: [{
        title: { type: String, required: true },
        isDone: { type: Boolean, default: false }
    }],
    activityLog: [{
        action: { type: String }, // e.g., 'Status changed to In Progress'
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now }
    }],
    comments: [{
        text: { type: String, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    isArchived: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
