const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    method: { 
        type: String, 
        enum: ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Credit Card', 'Debit Card', 'Other'],
        required: true 
    },
    transactionId: { type: String },
    notes: { type: String },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
