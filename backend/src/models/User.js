const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['superadmin', 'admin', 'hr', 'manager', 'teamhead', 'employee', 'sales', 'marketing'], 
        required: true 
    },
    permissions: {
        crm: { type: String, enum: ['none', 'view', 'full'], default: 'none' },
        tasks: { type: String, enum: ['none', 'own', 'dept', 'all'], default: 'own' },
        reports: { type: Boolean, default: false },
        hr: { type: Boolean, default: false }
    },
    companyId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Company', 
        default: null // null for superadmin
    },
    departmentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Department',
        default: null
    },
    reportingTo: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        default: null
    },
    designation: { type: String },
    joiningDate: { type: Date, default: Date.now },
    salary: { type: Number, default: 0 },
    phone: { type: String, default: "" },
    image: { type: String, default: "" },
    gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Compound index to ensure email is unique per company
userSchema.index({ email: 1, companyId: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
