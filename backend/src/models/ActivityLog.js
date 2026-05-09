const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    action: { type: String, required: true }, // e.g. 'Project Created', 'Member Added', 'Task Completed'
    details: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId }, // ID of the project/channel/task
    referenceType: { type: String, enum: ['Project', 'Channel', 'Task', 'System'] },
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
