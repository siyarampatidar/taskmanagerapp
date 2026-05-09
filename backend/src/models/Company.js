const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    name: { type: String, required: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    companyEmail: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    website: { type: String, default: '' },
    address: { type: String, default: '' },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null },
    isActive: { type: Boolean, default: false }, // false until plan bought
    isFreeUsed: { type: Boolean, default: false }, // Free plan used flag — permanent
    expiryDate: { type: Date },
    crmDeptSettings: {
        salesFull: { type: Boolean, default: true },
        marketingCreate: { type: Boolean, default: true },
        hrReports: { type: Boolean, default: true },
        devNone: { type: Boolean, default: true },
        financeRead: { type: Boolean, default: true }
    },
    officeLocation: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null }
    },
    allowedRadius: { type: Number, default: 200 }, // in meters
    googleEmailSettings: {
        connected: { type: Boolean, default: false },
        email: { type: String },
        refreshToken: { type: String },
        accessToken: { type: String },
        expiryDate: { type: Number }
    },
    shiftSettings: {
        startTime: { type: String, default: "10:00" }, // 24hr format
        gracePeriod: { type: Number, default: 15 }, // in minutes
        halfDayThreshold: { type: Number, default: 4 } // in hours
    }
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
