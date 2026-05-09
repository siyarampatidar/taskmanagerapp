const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        enum: ['admin', 'manager', 'teamhead', 'employee'], 
        required: true 
    },
    companyId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Company', 
        required: true 
    },
    departmentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Department',
        default: null
    },
    token: { 
        type: String, 
        required: true, 
        unique: true 
    },
    expiresAt: { 
        type: Date, 
        required: true 
    },
    isAccepted: { 
        type: Boolean, 
        default: false 
    }
}, { timestamps: true });

module.exports = mongoose.model('Invite', inviteSchema);
