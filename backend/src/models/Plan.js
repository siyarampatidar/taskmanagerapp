const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Free, Basic, Pro, Enterprise
    price: { type: Number, required: true },
    durationDays: { type: Number, required: true },
    maxUsers: { type: Number, required: true },
    type: { type: String, enum: ['free', 'paid'], default: 'paid' },
    billingCycle: { type: String, enum: ['monthly', 'half-yearly', 'yearly', 'none'], default: 'none' },
    features: { type: [String] }
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
