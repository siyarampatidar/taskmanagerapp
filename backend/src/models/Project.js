const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { 
        type: String, 
        enum: ['active', 'completed', 'onhold', 'archived'], 
        default: 'active' 
    },
    type: { 
        type: String, 
        enum: ['public', 'private'], 
        default: 'public' 
    },
    deadline: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
