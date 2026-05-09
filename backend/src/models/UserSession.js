const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
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
    loginTime: { 
        type: Date, 
        default: Date.now 
    },
    logoutTime: { 
        type: Date 
    },
    ipAddress: { 
        type: String 
    },
    userAgent: { 
        type: String 
    }
}, { timestamps: true });

module.exports = mongoose.model('UserSession', userSessionSchema);
