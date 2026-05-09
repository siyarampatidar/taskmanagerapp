const Leave = require('../models/Leave');
const User = require('../models/User');
const Attendance = require('../models/Attendance');

exports.applyLeave = async (req, res) => {
    try {
        const { type, startDate, endDate, reason } = req.body;
        const userId = req.user.id;
        const companyId = req.user.companyId;

        const leave = await Leave.create({
            userId, companyId, type, startDate, endDate, reason
        });

        res.status(201).json({ success: true, message: 'Leave application submitted', leave });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error applying for leave', error: error.message });
    }
};

exports.getLeaves = async (req, res) => {
    try {
        const { id: userId, role, companyId } = req.user;
        let query = { companyId };

        if (role === 'employee' || role === 'sales' || role === 'marketing') {
            query.userId = userId;
        } else if (role === 'teamhead') {
            // See team leaves
            const team = await User.find({ reportingTo: userId }).select('_id');
            const teamIds = team.map(u => u._id);
            query.$or = [{ userId: userId }, { userId: { $in: teamIds } }];
        } else if (role === 'manager') {
            // See all leaves in their department
            const user = await User.findById(userId);
            const deptUsers = await User.find({ departmentId: user.departmentId }).select('_id');
            const userIds = deptUsers.map(u => u._id);
            query.userId = { $in: userIds };
        } else if (role === 'admin' || role === 'hr') {
            // Admin/HR sees everything in company
            query.companyId = companyId;
        }

        const leaves = await Leave.find(query)
            .populate('userId', 'name email role designation')
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 });

        res.json({ success: true, leaves });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching leaves', error: error.message });
    }
};

exports.processLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;
        const processedBy = req.user.id;

        const leave = await Leave.findById(id);
        if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });

        leave.status = status;
        leave.approvedBy = processedBy;
        if (rejectionReason) leave.rejectionReason = rejectionReason;

        await leave.save();

        // AUTOMATION: If approved, mark attendance as paid-leave
        if (status === 'approved') {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                // Skip Sundays
                if (d.getDay() === 0) continue;

                const dateToMark = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                
                await Attendance.findOneAndUpdate(
                    { userId: leave.userId, date: dateToMark, companyId: leave.companyId },
                    { 
                        status: 'paid-leave', 
                        userId: leave.userId, 
                        companyId: leave.companyId, 
                        date: dateToMark 
                    },
                    { upsert: true, new: true }
                );
            }
        }

        res.json({ success: true, message: `Leave ${status} successfully`, leave });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error processing leave', error: error.message });
    }
};

exports.getPendingLeaves = async (req, res) => {
    try {
        const { id: userId, role, companyId } = req.user;
        let query = { companyId, status: 'pending' };

        if (role === 'employee' || role === 'sales' || role === 'marketing') {
            // Employees shouldn't really be seeing pending leaves of others here, 
            // but we can let them see their own pending status if needed.
            query.userId = userId;
        } else if (role === 'teamhead') {
            const team = await User.find({ reportingTo: userId }).select('_id');
            const teamIds = team.map(u => u._id);
            query.userId = { $in: teamIds };
        } else if (role === 'manager') {
            const user = await User.findById(userId);
            const deptUsers = await User.find({ departmentId: user.departmentId }).select('_id');
            const userIds = deptUsers.map(u => u._id);
            query.userId = { $in: userIds };
        }
        // Admin and HR query remains { companyId, status: 'pending' }

        const leaves = await Leave.find(query)
            .populate('userId', 'name role image')
            .sort({ createdAt: -1 });
        res.json({ success: true, leaves });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching pending leaves', error: error.message });
    }
};
