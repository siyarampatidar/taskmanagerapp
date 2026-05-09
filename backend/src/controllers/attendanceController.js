const Attendance = require('../models/Attendance');
const Company = require('../models/Company');
const User = require('../models/User');

// Internal Distance Calculation (Haversine Formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

exports.checkIn = async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const { id: userId, companyId } = req.user;
        const today = new Date().setHours(0, 0, 0, 0);

        // 1. Get Company Office Location
        const company = await Company.findById(companyId);
        if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

        // 2. Validate Location (Geofencing)
        if (company.officeLocation && company.officeLocation.lat) {
            const distance = calculateDistance(
                lat, lng,
                company.officeLocation.lat, company.officeLocation.lng
            );

            if (distance > company.allowedRadius) {
                return res.status(403).json({ 
                    success: false, 
                    message: `You are outside the office radius (${distance}m away). Attendance rejected.` 
                });
            }
        }

        // 3. Create or Update Attendance
        let attendance = await Attendance.findOne({ userId, date: today });
        if (attendance) {
            return res.status(400).json({ success: false, message: 'Already checked in for today' });
        }

        // 4. Check for Late status
        let status = 'present';
        if (company.shiftSettings && company.shiftSettings.startTime) {
            const [sHours, sMinutes] = company.shiftSettings.startTime.split(':').map(Number);
            const graceMinutes = company.shiftSettings.gracePeriod || 0;
            
            const now = new Date();
            const checkInLimit = new Date();
            checkInLimit.setHours(sHours, sMinutes + graceMinutes, 0, 0);

            if (now > checkInLimit) {
                status = 'late';
            }
        }

        attendance = await Attendance.create({
            userId,
            companyId,
            date: today,
            checkIn: new Date(),
            checkInLocation: { lat, lng },
            status: status
        });

        res.status(201).json({ success: true, message: 'Checked in successfully', attendance });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error during check-in', error: error.message });
    }
};

exports.checkOut = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const today = new Date().setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({ userId, date: today });
        if (!attendance) return res.status(404).json({ success: false, message: 'Check-in record not found' });

        attendance.checkOut = new Date();
        
        // Calculate work hours
        const workMs = attendance.checkOut.getTime() - attendance.checkIn.getTime();
        const workHours = workMs / (1000 * 60 * 60);

        // Fetch company for shift threshold
        const company = await Company.findById(req.user.companyId);
        const threshold = company?.shiftSettings?.halfDayThreshold || 4;

        // Auto Half-day if worked less than threshold (and not already late or leave)
        if (workHours < threshold && attendance.status === 'present') {
            attendance.status = 'half-day';
        }

        // Calculate overtime (assuming standard 9 hour shift)
        if (workHours > 9) {
            attendance.overtimeHours = Number((workHours - 9).toFixed(2));
        } else {
            attendance.overtimeHours = 0;
        }

        await attendance.save();

        res.json({ success: true, message: 'Checked out successfully', attendance });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error during check-out', error: error.message });
    }
};

exports.getAttendance = async (req, res) => {
    try {
        const { id: userId, companyId, role } = req.user;
        let query = { companyId };

        if (req.query.userId && (role === 'admin' || role === 'hr' || role === 'manager')) {
            query.userId = req.query.userId;
        } else {
            query.userId = userId;
        }

        const attendance = await Attendance.find(query).sort({ date: -1 });
        res.json({ success: true, attendance });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching attendance', error: error.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const { role } = req.user;

        if (role !== 'admin' && role !== 'hr') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const attendance = await Attendance.findByIdAndUpdate(id, { status }, { new: true });
        res.json({ success: true, message: 'Status updated', attendance });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating status', error: error.message });
    }
};

exports.getSalaryReport = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { month, year } = req.query; // 0-indexed month

        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, parseInt(month) + 1, 0);

        const employees = await User.find({ companyId, role: { $ne: 'superadmin' } });
        const Leave = require('../models/Leave'); // Import Leave model

        const report = await Promise.all(employees.map(async (emp) => {
            const records = await Attendance.find({
                userId: emp._id,
                date: { $gte: startDate, $lte: endDate }
            });

            const approvedLeaves = await Leave.find({
                userId: emp._id,
                status: 'approved',
                $or: [
                    { startDate: { $gte: startDate, $lte: endDate } },
                    { endDate: { $gte: startDate, $lte: endDate } }
                ]
            });

            const presentDays = records.filter(r => r.status === 'present' || r.status === 'late').length;
            const lateDays = records.filter(r => r.status === 'late').length;
            const paidLeaves = records.filter(r => r.status === 'paid-leave').length;
            const absentDays = records.filter(r => r.status === 'absent').length;
            
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const missingCheckouts = records.filter(r => (r.status === 'present' || r.status === 'late') && !r.checkOut && new Date(r.date) < todayStart).length;
            
            const halfDays = records.filter(r => r.status === 'half-day').length + missingCheckouts;
            
            // Auto-Absent for unlogged working days (excluding Sundays and Approved Leaves)
            let autoAbsentDays = 0;
            const limitDate = new Date(Math.min(todayStart.getTime(), endDate.getTime()));
            for (let d = new Date(startDate); d < limitDate; d.setDate(d.getDate() + 1)) {
                if (d.getDay() !== 0) { // Not Sunday
                    const currentDayTime = new Date(d).setHours(0,0,0,0);
                    const hasRecord = records.some(r => new Date(r.date).setHours(0,0,0,0) === currentDayTime);
                    
                    // Check if this day is within an approved leave range
                    const onLeave = approvedLeaves.some(l => {
                        const s = new Date(l.startDate).setHours(0,0,0,0);
                        const e = new Date(l.endDate).setHours(0,0,0,0);
                        return currentDayTime >= s && currentDayTime <= e;
                    });

                    if (!hasRecord && !onLeave) {
                        autoAbsentDays++;
                    }
                }
            }
            
            const totalAbsents = absentDays + autoAbsentDays;

            // Overtime sum
            const totalOvertimeHours = records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);

            const daysInMonth = endDate.getDate();
            const perDaySalary = (emp.salary || 0) / daysInMonth;
            const perHourSalary = perDaySalary / 9; 
            
            const deductionForAbsents = totalAbsents * perDaySalary;
            const deductionForHalfDays = (halfDays * 0.5) * perDaySalary;
            const totalDeductions = deductionForAbsents + deductionForHalfDays;
            
            const overtimePay = totalOvertimeHours * (perHourSalary * 1.5);
            
            const calculatedSalary = Math.max(0, (emp.salary || 0) - totalDeductions) + overtimePay;
            const totalPayableDays = daysInMonth - totalAbsents - (halfDays * 0.5);

            return {
                userId: emp._id,
                name: emp.name,
                baseSalary: emp.salary,
                presentDays,
                lateDays,
                halfDays,
                paidLeaves: paidLeaves + approvedLeaves.length, // Include approved leaves from collection
                absentDays: totalAbsents,
                autoAbsentDays,
                missingCheckouts,
                totalOvertimeHours: Number(totalOvertimeHours.toFixed(1)),
                overtimePay: Math.round(overtimePay),
                totalPayableDays,
                calculatedSalary: Math.round(calculatedSalary),
                records
            };
        }));

        res.json({ success: true, report });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error generating salary report', error: error.message });
    }
};

exports.manualUpdate = async (req, res) => {
    try {
        const { userId, date, status } = req.body;
        const { role, companyId } = req.user;

        if (role !== 'admin' && role !== 'hr') {
            return res.status(403).json({ success: false, message: 'Only HR or Admin can perform manual updates' });
        }

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        let attendance = await Attendance.findOne({ userId, date: targetDate });

        if (attendance) {
            attendance.status = status;
            await attendance.save();
        } else {
            attendance = await Attendance.create({
                userId,
                companyId,
                date: targetDate,
                status
            });
        }

        res.json({ success: true, message: 'Attendance updated manually', attendance });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error in manual update', error: error.message });
    }
};
