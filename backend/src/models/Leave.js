const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    type: { 
        type: String, 
        enum: ['sick', 'casual', 'earned', 'emergency', 'maternity', 'unpaid'], 
        required: true 
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectionReason: { type: String, default: null },
    appliedOn: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Leave', leaveSchema);
