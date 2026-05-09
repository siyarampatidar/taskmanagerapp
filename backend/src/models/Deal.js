const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
    name: { type: String, required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
    amount: { type: Number, default: 0 },
    stage: { 
        type: String, 
        enum: ['qualification', 'needs-analysis', 'value-proposition', 'proposal', 'negotiation', 'closed-won', 'closed-lost'],
        default: 'qualification'
    },
    closingDate: { type: Date },
    probability: { type: Number, default: 10 }, // Percentage
    type: { type: String }, // New Business, Renewal, etc.
    description: { type: String },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    activityLog: [{
        note: { type: String, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now }
    }],
    nextFollowUpDate: { type: Date, default: null },
    followUpNote: { type: String, default: null },
    notes: [{
        text: { type: String, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now }
    }],
    documents: [{
        url: { type: String, required: true },
        name: { type: String, required: true },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now }
    }],
    isArchived: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Deal', dealSchema);
