const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, default: null },
    contact: { type: String, required: true },
    company: { type: String },
    rejectionReason: { type: String, default: null },
    source: { 
        type: String, 
        enum: ['website', 'manual', 'referral', 'cold-call', 'campaign', 'social-media', 'facebook', 'instagram', 'linkedin', 'google', 'email', 'walk-in', 'other'], 
        default: 'manual' 
    },
    title: { type: String }, // Job Title
    industry: { type: String },
    gstNumber: { type: String },
    website: { type: String },
    annualRevenue: { type: String },
    budgetRange: { type: String },
    notes: { type: String },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    status: { 
        type: String, 
        enum: ['new', 'contacted', 'qualified', 'converted', 'lost', 'not-interested'], 
        default: 'new' 
    },
    approvalStatus: { 
        type: String, 
        enum: ['none', 'pending', 'approved', 'rejected'], 
        default: 'none' 
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    transferredFrom: { type: String, default: null },
    dealValue: { type: Number, default: 0 },
    nextFollowUpDate: { type: Date, default: null },
    followUpNote: { type: String, default: null },
    followUpNotified: { type: Boolean, default: false },
    activityLog: [{
        note: { type: String },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now }
    }],
    isImported: { type: Boolean, default: false },
    isConverted: { type: Boolean, default: false },
    convertedAt: { type: Date, default: null },
    checklist: [
        { 
            task: { type: String, required: true }, 
            completed: { type: Boolean, default: false },
            updatedAt: { type: Date, default: Date.now }
        }
    ],
    isArchived: { type: Boolean, default: false },
    remarks: [{
        text: { type: String },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        date: { type: Date, default: Date.now }
    }],
    customFields: { type: Map, of: String, default: {} },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);

