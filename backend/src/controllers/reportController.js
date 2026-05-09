const User = require('../models/User');
const Department = require('../models/Department');
const Lead = require('../models/Lead');
const Task = require('../models/Task');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const DailyReport = require('../models/DailyReport');
const Deal = require('../models/Deal');
const xlsx = require('xlsx');
const mongoose = require('mongoose');

exports.getDashboardStats = async (req, res) => {
    try {
        const { companyId, role, id: userId, departmentId } = req.user;
        const { period } = req.query; // 'today', 'week', 'month'
        
        const cId = new mongoose.Types.ObjectId(companyId);
        let stats = {};

        // Date calculation for filtering
        let dateQuery = { companyId };
        const now = new Date();
        const startOfToday = new Date(now.setHours(0, 0, 0, 0));
        
        if (period === 'today') {
            dateQuery.createdAt = { $gte: startOfToday };
        } else if (period === 'week') {
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            dateQuery.createdAt = { $gte: startOfWeek };
        } else if (period === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            dateQuery.createdAt = { $gte: startOfMonth };
        }

        // --- GLOBAL VIEW (Admin, Manager, HR) ---
        if (role === 'admin' || role === 'manager' || role === 'hr') {
            const totalEmployees = await User.countDocuments({ companyId, isActive: true });
            const totalDepts = await Department.countDocuments({ companyId });
            
            // Attendance Today
            const presentToday = await Attendance.countDocuments({ 
                companyId, 
                date: { $gte: startOfToday }, 
                status: 'present' 
            });
            
            const pendingLeaves = await Leave.countDocuments({ companyId, status: 'pending' });

            // CRM Summary (Filtered by Period)
            const totalLeads = await Lead.countDocuments(dateQuery);
            const convertedLeads = await Lead.countDocuments({ ...dateQuery, status: 'converted' });
            
            const pipelineRevenue = await Deal.aggregate([
                { $match: { ...dateQuery, companyId: cId, stage: 'closed-won' } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]);

            // Task Summary (Filtered by Period)
            const totalTasks = await Task.countDocuments(dateQuery);
            const completedTasks = await Task.countDocuments({ ...dateQuery, status: 'completed' });
            
            // --- NEW PREMIUM DATA ---
            
            // 1. Monthly Revenue Trend (Last 12 months)
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
            twelveMonthsAgo.setDate(1);

            const revenueTrend = await Deal.aggregate([
                { 
                    $match: { 
                        companyId: cId, 
                        stage: 'closed-won', 
                        updatedAt: { $gte: twelveMonthsAgo } 
                    } 
                },
                {
                    $group: {
                        _id: { month: { $month: "$updatedAt" }, year: { $year: "$updatedAt" } },
                        total: { $sum: "$amount" }
                    }
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } }
            ]);

            // 2. Recent Team Activity (Merged from Leads & Tasks)
            const recentLeadActivity = await Lead.find({ companyId })
                .sort({ 'activityLog.timestamp': -1 })
                .limit(10)
                .populate('activityLog.userId', 'name role')
                .select('name activityLog');
            
            const recentTaskActivity = await Task.find({ companyId })
                .sort({ 'activityLog.timestamp': -1 })
                .limit(10)
                .populate('activityLog.userId', 'name role')
                .select('title activityLog');

            let mergedActivity = [];
            
            recentLeadActivity.forEach(lead => {
                lead.activityLog.forEach(log => {
                    mergedActivity.push({
                        user: log.userId?.name || 'System',
                        initials: log.userId?.name?.split(' ').map(n => n[0]).join('') || 'SY',
                        text: `${log.userId?.name || 'System'} updated lead "${lead.name}": ${log.note || log.action}`,
                        time: log.timestamp,
                        color: '#4F46E5'
                    });
                });
            });

            recentTaskActivity.forEach(task => {
                task.activityLog.forEach(log => {
                    mergedActivity.push({
                        user: log.userId?.name || 'System',
                        initials: log.userId?.name?.split(' ').map(n => n[0]).join('') || 'SY',
                        text: `${log.userId?.name || 'System'} updated task "${task.title}": ${log.action || log.note}`,
                        time: log.timestamp,
                        color: '#22C55E'
                    });
                });
            });

            mergedActivity = mergedActivity.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

            // 3. Pipeline Snapshot
            const pipelineSnapshot = await Lead.aggregate([
                { $match: { companyId: cId } },
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]);

            const pipelineMap = {
                'New Lead': pipelineSnapshot.find(s => s._id === 'new')?.count || 0,
                'Contacted': pipelineSnapshot.find(s => s._id === 'contacted')?.count || 0,
                'Proposal': pipelineSnapshot.find(s => s._id === 'qualified')?.count || 0,
                'Won': pipelineSnapshot.find(s => s._id === 'converted')?.count || 0,
                'Lost': pipelineSnapshot.find(s => s._id === 'lost')?.count || 0
            };

            // 4. Today's Urgent Missions
            const todayMissions = await Task.find({ 
                companyId, 
                deadline: { $gte: startOfToday, $lt: new Date(new Date().setDate(now.getDate() + 1)) },
                status: { $ne: 'completed' }
            })
            .populate('assignedTo', 'name')
            .sort({ priority: -1 })
            .limit(5);

            // Charts (Global)
            const leadsByStatus = await Lead.aggregate([
                { $match: { companyId: cId } },
                { $group: { _id: "$status", value: { $sum: 1 } } },
                { $project: { name: "$_id", value: 1, _id: 0 } }
            ]);

            const employeesByDept = await User.aggregate([
                { $match: { companyId: cId, isActive: true } },
                { $group: { _id: "$departmentId", count: { $sum: 1 } } },
                { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
                { $project: { name: { $arrayElemAt: ["$dept.name", 0] }, value: "$count", _id: 0 } }
            ]);

            const tasksByStatus = await Task.aggregate([
                { $match: { companyId: cId } },
                { $group: { _id: "$status", value: { $sum: 1 } } },
                { $project: { name: "$_id", value: 1, _id: 0 } }
            ]);

            const leavesByStatus = await Leave.aggregate([
                { $match: { companyId: cId } },
                { $group: { _id: "$status", value: { $sum: 1 } } },
                { $project: { name: "$_id", value: 1, _id: 0 } }
            ]);

            stats = {
                employees: totalEmployees,
                departments: totalDepts,
                presentToday,
                pendingLeaves,
                crm: {
                    totalLeads,
                    convertedLeads,
                    revenue: pipelineRevenue[0]?.total || 0,
                    conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(2) : 0,
                    chartData: leadsByStatus || [],
                    pipelineMap,
                    revenueTrend: revenueTrend.map(r => ({ month: r._id.month, total: r.total }))
                },
                tasks: {
                    total: totalTasks,
                    completed: completedTasks,
                    completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0,
                    chartData: tasksByStatus || [],
                    todayMissions: todayMissions.map(m => ({
                        id: m._id,
                        title: m.title,
                        priority: m.priority,
                        assignee: m.assignedTo?.name || 'Unassigned',
                        initials: m.assignedTo?.name?.split(' ').map(n => n[0]).join('') || '?',
                        due: 'Today'
                    }))
                },
                hr: {
                    deptDistribution: employeesByDept || [],
                    leavesByStatus: leavesByStatus || []
                },
                recentActivity: mergedActivity
            };
        } 
        // --- DEPARTMENT VIEW (Teamhead) ---
        else if (role === 'teamhead') {
            const teamSize = await User.countDocuments({ companyId, departmentId, isActive: true });
            const deptTasks = await Task.countDocuments({ ...dateQuery, departmentId });
            const deptCompletedTasks = await Task.countDocuments({ ...dateQuery, departmentId, status: 'completed' });
            
            const deptLeads = await Lead.countDocuments({ ...dateQuery, departmentId });
            const myTasks = await Task.countDocuments({ assignedTo: userId });

            // Department Specific Charts
            const leadsByStatus = await Lead.aggregate([
                { $match: { companyId, departmentId } },
                { $group: { _id: "$status", value: { $sum: 1 } } },
                { $project: { name: "$_id", value: 1, _id: 0 } }
            ]);

            stats = {
                teamSize,
                deptTasks: {
                    total: deptTasks,
                    completed: deptCompletedTasks,
                    rate: deptTasks > 0 ? ((deptCompletedTasks / deptTasks) * 100).toFixed(1) : 0
                },
                deptLeads,
                personalTasks: { total: myTasks },
                crm: {
                    chartData: leadsByStatus || []
                }
            };
        } 
        // --- PERSONAL VIEW (Employee, Sales, Marketing) ---
        else {
            const myTasks = await Task.countDocuments({ assignedTo: userId });
            const myCompletedTasks = await Task.countDocuments({ assignedTo: userId, status: 'completed' });
            
            const myLeads = await Lead.countDocuments({ assignedTo: userId });
            const myConvertedLeads = await Lead.countDocuments({ assignedTo: userId, status: 'converted' });

            const myAttendance = await Attendance.findOne({ userId, date: { $gte: startOfToday } });

            stats = {
                personalTasks: { 
                    total: myTasks, 
                    completed: myCompletedTasks,
                    pending: myTasks - myCompletedTasks
                },
                personalLeads: { total: myLeads, converted: myConvertedLeads },
                attendance: myAttendance ? { 
                    status: myAttendance.status,
                    checkIn: myAttendance.checkIn ? new Date(myAttendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
                } : null
            };
        }

        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching dashboard stats', error: error.message });
    }
};

// --- DAILY REPORTS ---

exports.submitDailyReport = async (req, res) => {
    try {
        if (!req.body) return res.status(400).json({ success: false, message: 'No data received' });
        const { workDone, blockers, date } = req.body;
        const { companyId, id: userId } = req.user;

        // Handle Attachments
        const attachments = req.files ? req.files.map(file => file.path) : [];

        const report = await DailyReport.create({
            userId,
            companyId,
            workDone,
            blockers,
            date: date || new Date(),
            status: 'submitted',
            attachments
        });

        const populatedReport = await DailyReport.findById(report._id)
            .populate({
                path: 'userId',
                select: 'name role email departmentId image initials',
                populate: { path: 'departmentId', select: 'name' }
            });

        res.status(201).json({ success: true, message: 'Daily report submitted', report: populatedReport });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to submit report', error: error.message });
    }
};

exports.getDailyReports = async (req, res) => {
    try {
        const { companyId, role, id: userId, departmentId: userDeptId } = req.user;
        const { startDate, endDate, specificUserId, departmentId } = req.query;

        let query = { companyId };

        // 1. Role-based visibility
        if (role === 'teamhead') {
            // Team Head sees their department's reports
            const teamMembers = await User.find({ departmentId: userDeptId }).select('_id');
            const memberIds = teamMembers.map(m => m._id);
            query.userId = { $in: memberIds };
        } else if (role !== 'admin' && role !== 'manager' && role !== 'hr') {
            // Regular employees see only their own
            query.userId = userId;
            query.hiddenByReporter = { $ne: true };
        }

        // 2. Filter by specific user (Admin/Manager override)
        if (specificUserId && (role === 'admin' || role === 'manager' || role === 'hr')) {
            query.userId = specificUserId;
        }

        // 3. Filter by department (Admin/Manager filter)
        if (departmentId && (role === 'admin' || role === 'manager' || role === 'hr')) {
            const deptMembers = await User.find({ departmentId }).select('_id');
            const memberIds = deptMembers.map(m => m._id);
            query.userId = { $in: memberIds };
        }

        // 4. Date filtering
        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                query.date.$gte = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        const reports = await DailyReport.find(query)
            .sort({ date: -1 })
            .populate({
                path: 'userId',
                select: 'name role email departmentId image initials',
                populate: { path: 'departmentId', select: 'name' }
            })
            .populate('reactions.userId', 'name role');

        res.json({ success: true, reports });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch reports', error: error.message });
    }
};

exports.addReaction = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ success: false, message: 'Report ID is required' });
        const { reactionType } = req.body;
        const { id: userId, name } = req.user;

        const report = await DailyReport.findById(id);
        if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

        // Find if user already reacted with this type
        const existingIndex = report.reactions.findIndex(
            r => r.userId.toString() === userId.toString() && r.reactionType === reactionType
        );

        if (existingIndex > -1) {
            // Remove the reaction (toggle off)
            report.reactions.splice(existingIndex, 1);
        } else {
            // Add new reaction
            report.reactions.push({ userId, name, reactionType });
        }

        await report.save();

        const populatedReport = await DailyReport.findById(report._id)
            .populate({
                path: 'userId',
                select: 'name role email departmentId image initials',
                populate: { path: 'departmentId', select: 'name' }
            })
            .populate('reactions.userId', 'name role');

        res.json({ success: true, report: populatedReport });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error adding reaction', error: error.message });
    }
};

exports.exportDailyReports = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { startDate, endDate } = req.query;

        let query = { companyId };
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(new Date(startDate).setHours(0,0,0,0));
            if (endDate) query.date.$lte = new Date(new Date(endDate).setHours(23,59,59,999));
        }

        const reports = await DailyReport.find(query)
            .sort({ date: -1 })
            .populate('userId', 'name role email departmentId')
            .populate({
                path: 'userId',
                populate: { path: 'departmentId', select: 'name' }
            });

        const workbookData = reports.map(r => ({
            'Date': new Date(r.date).toLocaleDateString(),
            'Employee Name': r.userId?.name || 'Unknown',
            'Role': r.userId?.role?.toUpperCase() || '-',
            'Department': r.userId?.departmentId?.name || '-',
            'Email': r.userId?.email || '-',
            'Work Accomplished': r.workDone,
            'Blockers/Challenges': r.blockers || 'None',
            'Status': r.status?.toUpperCase(),
            'Attachments Count': r.attachments?.length || 0,
            'Submission Time': new Date(r.createdAt).toLocaleString()
        }));

        const worksheet = xlsx.utils.json_to_sheet(workbookData);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Daily Reports');

        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Daily_Reports_${new Date().toISOString().split('T')[0]}.xlsx`);
        res.send(buffer);

    } catch (error) {
        res.status(500).json({ success: false, message: 'Error exporting reports', error: error.message });
    }
};

exports.updateDailyReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { workDone, blockers } = req.body;
        const { id: userId } = req.user;

        const report = await DailyReport.findById(id);

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        // Check ownership
        if (report.userId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to edit this report' });
        }

        report.workDone = workDone || report.workDone;
        report.blockers = blockers || report.blockers;
        
        await report.save();

        const populatedReport = await DailyReport.findById(report._id)
            .populate({
                path: 'userId',
                select: 'name role email departmentId image initials',
                populate: { path: 'departmentId', select: 'name' }
            })
            .populate('reactions.userId', 'name role');

        res.json({ success: true, message: 'Report updated successfully', report: populatedReport });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update report', error: error.message });
    }
};

exports.deleteDailyReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, id: userId } = req.user;

        const report = await DailyReport.findById(id);

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        // CHECK PERMISSIONS AND PERFORM DELETE/HIDE
        const isAdminOrManager = ['admin', 'manager', 'hr', 'teamhead'].includes(role.toLowerCase());
        const isOwner = report.userId.toString() === userId.toString();

        if (!isAdminOrManager && !isOwner) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this report' });
        }

        if (isAdminOrManager) {
            // Admin/Manager performs hard delete
            await DailyReport.findByIdAndDelete(id);
            res.json({ success: true, message: 'Report deleted permanently by Administrator' });
        } else {
            // Employee performs soft delete (hide from their view only)
            report.hiddenByReporter = true;
            await report.save();
            res.json({ success: true, message: 'Report removed from your view' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete report', error: error.message });
    }
};


