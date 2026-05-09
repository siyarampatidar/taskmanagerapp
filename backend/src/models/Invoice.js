const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    invoiceNumber: { type: String, required: true },
    date: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    items: [{
        description: { type: String, required: true },
        quantity: { type: Number, default: 1 },
        rate: { type: Number, required: true },
        tax: { type: Number, default: 0 }, // Percentage
        amount: { type: Number, required: true }
    }],
    subTotal: { type: Number, required: true },
    taxTotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['draft', 'sent', 'paid', 'partially-paid', 'overdue', 'cancelled'],
        default: 'draft'
    },
    currency: { type: String, default: 'INR' },
    notes: { type: String },
    terms: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    activityLog: [{
        action: { type: String },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

// Ensure unique invoice number per company
invoiceSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
