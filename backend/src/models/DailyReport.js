const mongoose = require('mongoose');

const dailyReportSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    workDone: {
        type: String,
        required: true
    },
    blockers: {
        type: String,
        default: ''
    },
    date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['submitted', 'reviewed'],
        default: 'submitted'
    },
    reactions: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        reactionType: { type: String, enum: ['👍', '✅', '🌟'] }
    }],
    attachments: [{
        type: String
    }],
    hiddenByReporter: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Compound index for faster filtering by company and date
dailyReportSchema.index({ companyId: 1, date: -1 });
dailyReportSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('DailyReport', dailyReportSchema);
