const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String, required: true },
    title: { type: String },
    department: { type: String },
    type: { type: String }, // Decision Maker, etc.
    linkedin: { type: String },
    whatsapp: { type: String },
    address: { type: String },
    notes: { type: String },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Contact', contactSchema);
