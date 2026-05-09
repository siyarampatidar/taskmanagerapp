const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    name: { type: String, required: true },
    industry: { type: String },
    size: { type: String }, // Company Size (range)
    gstNumber: { type: String },
    website: { type: String },
    phone: { type: String },
    email: { type: String },
    street: { type: String },
    city: { type: String },
    state: { type: String },
    pin: { type: String },
    description: { type: String },
    notes: { type: String },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Account', accountSchema);
