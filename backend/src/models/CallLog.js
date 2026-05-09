const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
    leadId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Lead',
        required: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    },
    companyId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Company',
        required: true 
    },
    callSid: { 
        type: String, 
        required: true,
        unique: true 
    },
    duration: { 
        type: Number, 
        default: 0 
    },
    recordingUrl: { 
        type: String, 
        default: "" 
    },
    status: { 
        type: String, 
        default: "pending" 
    },
    startTime: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('CallLog', callLogSchema);
