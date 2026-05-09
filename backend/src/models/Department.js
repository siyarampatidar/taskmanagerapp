const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., Sales, Marketing, HR, Development, Finance
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    
    // CRM Access configuration for THIS particular department
    // Overrides global CRM settings if specified, otherwise uses Company's default.
    // For simplicity, we stick to the rules defined by Admin.
    crmAccessLevel: { 
        type: String, 
        enum: ['full', 'create_only', 'reports_only', 'read_only', 'none'],
        default: 'none'
    }
}, { timestamps: true });

// Ensure department name is unique within a company
departmentSchema.index({ name: 1, companyId: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
