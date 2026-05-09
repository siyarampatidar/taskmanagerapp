const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    companyId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Company', 
        required: true 
    },
    planId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Plan', 
        required: true 
    },
    startDate: { 
        type: Date, 
        default: Date.now 
    },
    expiryDate: { 
        type: Date, 
        required: true 
    },
    amountPaid: { 
        type: Number, 
        default: 0 
    },
    paymentId: { 
        type: String, 
        default: null 
    },
    razorpayOrderId: {
        type: String,
        default: null
    },
    razorpayPaymentId: {
        type: String,
        default: null
    },
    razorpaySignature: {
        type: String,
        default: null
    },
    status: { 
        type: String, 
        enum: ['active', 'expired', 'cancelled'], 
        default: 'active' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
