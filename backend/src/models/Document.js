const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['Agreement', 'Proposal', 'Quotation', 'Invoice', 'PO', 'NDA', 'Other'],
        required: true 
    },
    fileUrl: { type: String, required: true },
    fileType: { type: String }, // pdf, docx, etc.
    fileSize: { type: Number }, // in bytes
    relatedTo: { 
        type: String, 
        enum: ['Lead', 'Contact', 'Account', 'Deal', 'General'],
        required: true 
    },
    relatedId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: false,
        refPath: 'relatedTo' 
    },
    notes: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
