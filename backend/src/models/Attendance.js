const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    date: { type: Date, required: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
    status: { 
        type: String, 
        enum: ['present', 'late', 'half-day', 'paid-leave', 'unpaid-leave', 'absent'], 
        default: 'present' 
    },
    checkInLocation: {
        lat: { type: Number },
        lng: { type: Number }
    },
    isWFH: { type: Boolean, default: false },
    overtimeHours: { type: Number, default: 0 }
}, { timestamps: true });

// Ensure one entry per user per day
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
