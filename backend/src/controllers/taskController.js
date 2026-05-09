const Task = require('../models/Task');
const User = require('../models/User');
const Department = require('../models/Department');
const { createNotification } = require('../services/notificationService');
const { emitToCompany } = require('../services/socketService');

exports.createTask = async (req, res) => {
    try {
        const { title, description, priority, deadline, assignedTo, subTasks, targetDeptId, leadId, dealId } = req.body;
        const creatorId = req.user.id;
        const companyId = req.user.companyId;

        let finalAssigneeId = assignedTo;

        // If assigning to a department, find the manager/head
        if (targetDeptId && targetDeptId !== "") {
            const dept = await Department.findById(targetDeptId);
            if (!dept) return res.status(404).json({ success: false, message: 'Target department not found' });

            // SMART DETECTION: 
            // 1. Check if model has a managerId linked
            // 2. If not, find first 'manager' in that department
            // 3. If not, find first 'teamhead' in that department
            let headFound = dept.managerId;

            if (!headFound) {
                const headInDept = await User.findOne({ 
                    departmentId: targetDeptId, 
                    role: { $in: ['manager', 'teamhead', 'hr', 'sales', 'marketing'] }, 
                    companyId 
                });
                if (headInDept) headFound = headInDept._id;
            }

            if (!headFound) {
                return res.status(404).json({ 
                    success: false, 
                    message: `No Department Head (Manager or Team Head) was found for the "${dept.name}" department. Please add a Team Head to this department first.` 
                });
            }
            finalAssigneeId = headFound;
        }

        // Verify assignee
        const assignee = await User.findOne({ _id: finalAssigneeId || creatorId, companyId });
        if (!assignee) return res.status(404).json({ success: false, message: 'Assignee not found' });

        // Scoping
        const creatorRole = req.user.role;
        const isDepartmental = (targetDeptId && targetDeptId !== "");

        if (creatorRole === 'employee' && !isDepartmental && finalAssigneeId && finalAssigneeId.toString() !== creatorId.toString()) {
            return res.status(403).json({ success: false, message: 'Employees can only assign tasks to themselves.' });
        }
        
        if (creatorRole === 'teamhead' && !isDepartmental) {
            if (finalAssigneeId && finalAssigneeId.toString() !== creatorId.toString() && assignee.reportingTo?.toString() !== creatorId.toString()) {
                return res.status(403).json({ success: false, message: 'Team Heads can only assign tasks to their direct team members.' });
            }
        }

        if (creatorRole === 'manager' && !isDepartmental) {
            const managedDepts = await Department.find({ managerId: creatorId });
            const managedDeptIds = managedDepts.map(d => d._id.toString());
            if (finalAssigneeId && finalAssigneeId.toString() !== creatorId.toString() && !managedDeptIds.includes(assignee.departmentId?.toString())) {
                return res.status(403).json({ success: false, message: 'Managers can only assign tasks to employees in their departments.' });
            }
        }

        let attachments = [];
        if (req.files) {
            attachments = req.files.map(file => file.path);
        }

        let parsedSubTasks = [];
        try {
            if (subTasks) {
                parsedSubTasks = typeof subTasks === 'string' ? JSON.parse(subTasks) : subTasks;
            }
        } catch (e) {
            console.error("Subtask parsing error:", e);
        }

        const task = await Task.create({
            title,
            description,
            priority,
            deadline,
            assignedTo: finalAssigneeId || creatorId,
            teamHeadId: finalAssigneeId ? creatorId : null, // If creator assigns to someone, creator is the initial head
            createdBy: creatorId,
            companyId,
            leadId: (leadId && leadId !== "") ? leadId : null, // Ensure leadId is handled correctly
            dealId: (dealId && dealId !== "") ? dealId : null,
            subTasks: parsedSubTasks,
            attachments,
            activityLog: [{ 
                action: targetDeptId ? `Task assigned to ${assignee.name} (Department Head)` : 'Task Created', 
                userId: creatorId 
            }]
        });

        // If this is a handover task linked to a Deal, update the Deal's assignment and attach documents
        if (dealId && dealId !== "") {
            const Deal = require('../models/Deal');
            let dealUpdates = {};
            
            // Sync attachments to Deal's documents
            let attachedFilesList = "";
            if (attachments && attachments.length > 0) {
                const docObjects = attachments.map(url => {
                    const fileName = url.split('/').pop() || 'Handover Document';
                    attachedFilesList += (attachedFilesList ? ", " : "") + fileName;
                    return {
                        url,
                        name: fileName,
                        uploadedBy: creatorId,
                        uploadedAt: new Date()
                    };
                });
                dealUpdates.$push = { documents: { $each: docObjects } };
            }

            const historyNote = `Operations task assigned to ${assignee.name}${attachedFilesList ? ` with files: ${attachedFilesList}` : ""}`;
            
            if (!dealUpdates.$push) dealUpdates.$push = {};
            dealUpdates.$push.activityLog = { note: historyNote, userId: creatorId };
            
            // Assign deal to the same person assigned to the task
            if (finalAssigneeId) {
                dealUpdates.assignedTo = finalAssigneeId;
            }

            await Deal.findOneAndUpdate(
                { _id: dealId, companyId },
                dealUpdates
            );
        }

        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'name role departmentId')
            .populate('teamHeadId', 'name role')
            .populate('createdBy', 'name')
            .populate('activityLog.userId', 'name');

        // Notify Assignee
        await createNotification(req.io, {
            userId: finalAssigneeId || creatorId,
            type: 'task_assigned',
            title: 'New Task Mission',
            message: `You have been assigned a new mission: ${title}. Please Accept or Reject it.`,
            referenceId: task._id,
            referenceType: 'Task',
            companyId
        });

        // Real-time update for the company
        emitToCompany(companyId, 'taskCreated', populatedTask);

        res.status(201).json({ success: true, message: 'Task created successfully', task: populatedTask });
    } catch (error) {
        console.error("CREATE TASK ERROR:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating task', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        });
    }
};

exports.getTasks = async (req, res) => {
    try {
        const { id: userId, role, companyId } = req.user;
        let query = { companyId };

        if (role === 'employee' || role === 'sales' || role === 'marketing') {
            // Find all users in the same department
            const deptUsers = await User.find({ departmentId: req.user.departmentId }).select('_id');
            const deptUserIds = deptUsers.map(u => u._id);

            query.$or = [
                { assignedTo: userId }, 
                { createdBy: userId },
                { teamHeadId: userId },
                { createdBy: { $in: deptUserIds } }
            ];
        } else if (role === 'teamhead') {
            const team = await User.find({ reportingTo: userId }).select('_id');
            const teamIds = team.map(u => u._id);
            
            const deptUsers = await User.find({ departmentId: req.user.departmentId }).select('_id');
            const deptUserIds = deptUsers.map(u => u._id);

            query.$or = [
                { assignedTo: userId }, 
                { createdBy: userId }, 
                { teamHeadId: userId },
                { assignedTo: { $in: teamIds } },
                { createdBy: { $in: deptUserIds } }
            ];
        } else if (role === 'manager' || role === 'hr') {
            // Managers and HR should see all tasks in their company for full transparency
            query = { companyId };
        }

        query.isArchived = { $ne: true };

        const tasks = await Task.find(query)
            .populate('assignedTo', 'name email role')
            .populate('teamHeadId', 'name role')
            .populate('createdBy', 'name email')
            .populate('comments.userId', 'name')
            .populate('activityLog.userId', 'name')
            .sort({ createdAt: -1 });
            
        res.json({ success: true, tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching tasks', error: error.message });
    }
};

exports.updateTaskStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user.id;

        const task = await Task.findOne({ _id: id, companyId: req.user.companyId });
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        // Role-based restrictions
        if (req.user.role === 'employee' || req.user.role === 'sales' || req.user.role === 'marketing') {
            // Employees can ONLY move to 'inprogress' or 'inreview'
            if (!['inprogress', 'inreview'].includes(status)) {
                return res.status(403).json({ 
                    success: false, 
                    message: `You can only change status to "In Progress" or "In Review". Final completion requires manager approval.` 
                });
            }
        }

        if (status === 'completed' || status === 'revision') {
            // Only Higher-ups can Approve (Complete) or Reject (Revision)
            if (!['admin', 'manager', 'teamhead', 'hr'].includes(req.user.role)) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Only Managers or Team Heads can approve or request revisions for tasks.' 
                });
            }
        }

        task.status = status;
        task.activityLog.push({ 
            action: `Status updated to ${status} by ${req.user.name}`, 
            userId 
        });
        await task.save();

        // Notify Team Head or Creator for review
        if (status === 'inreview') {
            const notifyTarget = task.teamHeadId || task.createdBy;
            await createNotification(req.io, {
                userId: notifyTarget,
                type: 'task_review',
                title: 'Mission Awaiting Verification',
                message: `Task "${task.title}" has been submitted for review by ${req.user.name}. Please verify the results.`,
                referenceId: task._id,
                referenceType: 'Task',
                companyId: req.user.companyId
            });
        } else if (userId.toString() !== task.createdBy.toString()) {
            await createNotification(req.io, {
                userId: task.createdBy,
                type: 'task_review',
                title: 'Task Status Updated',
                message: `Task "${task.title}" status has been updated to ${status} by ${req.user.name}`,
                referenceId: task._id,
                referenceType: 'Task',
                companyId: req.user.companyId
            });
        }

        // Real-time update
        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'name role departmentId')
            .populate('teamHeadId', 'name role')
            .populate('createdBy', 'name')
            .populate('activityLog.userId', 'name');

        emitToCompany(req.user.companyId, 'taskUpdated', populatedTask);

        res.json({ success: true, message: `Task status updated to ${status}`, task: populatedTask });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating task', error: error.message });
    }
};

exports.addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        const userId = req.user.id;

        const task = await Task.findOneAndUpdate(
            { _id: id, companyId: req.user.companyId },
            { $push: { comments: { text, userId } } },
            { new: true }
        ).populate('comments.userId', 'name');

        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        res.json({ success: true, message: 'Comment added', task });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error adding comment', error: error.message });
    }
};

exports.updateSubTask = async (req, res) => {
    try {
        const { id, subTaskId } = req.params;
        const { isDone } = req.body;

        const task = await Task.findOneAndUpdate(
            { _id: id, companyId: req.user.companyId, 'subTasks._id': subTaskId },
            { $set: { 'subTasks.$.isDone': isDone } },
            { new: true }
        );

        if (!task) return res.status(404).json({ success: false, message: 'Task or sub-task not found' });

        res.json({ success: true, message: 'Sub-task updated', task });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating sub-task', error: error.message });
    }
};

exports.transferTaskToDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { deptId } = req.body;
        const userId = req.user.id;

        const task = await Task.findOne({ _id: id, companyId: req.user.companyId });
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        const dept = await Department.findById(deptId);
        if (!dept) return res.status(404).json({ success: false, message: 'Target department not found' });

        // SMART DETECTION: Match logic from createTask
        let headFound = dept.managerId;
        if (!headFound) {
            const headInDept = await User.findOne({ 
                departmentId: deptId, 
                role: { $in: ['manager', 'teamhead', 'hr', 'sales', 'marketing'] }, 
                companyId: req.user.companyId 
            });
            if (headInDept) headFound = headInDept._id;
        }

        if (!headFound) {
            return res.status(404).json({ 
                success: false, 
                message: `No Department Head (Manager/Team Head) found for the "${dept.name}" department. Please add a Head to this department first.` 
            });
        }

        // Get transferrer's department name
        const transferrer = await User.findById(userId).populate('departmentId', 'name');
        const fromDeptName = transferrer.departmentId ? transferrer.departmentId.name : 'Unknown';

        task.transferredFromDept = fromDeptName;
        task.assignedTo = headFound;
        task.status = 'todo';
        task.isApprovedByTeamHead = false; // Reset approval for new dept
        
        task.activityLog.push({ 
            action: `Task transferred from ${fromDeptName} to ${dept.name} by ${req.user.name}`, 
            userId 
        });

        await task.save();
        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'name role departmentId')
            .populate('teamHeadId', 'name role')
            .populate('createdBy', 'name')
            .populate('activityLog.userId', 'name');

        res.json({ success: true, message: 'Task transferred to new department', task: populatedTask });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error transferring task', error: error.message });
    }
};

exports.approveTaskState = async (req, res) => {
    try {
        const { id } = req.params;
        const { approvalType, status, revisionNote } = req.body; // approvalType: 'teamhead' or 'manager'
        const userId = req.user.id;

        const task = await Task.findOne({ _id: id, companyId: req.user.companyId });
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        if (approvalType === 'teamhead') {
            // Validate that the user is the one who delegated/teamhead
            if (task.teamHeadId && task.teamHeadId.toString() !== userId.toString() && !['admin', 'manager'].includes(req.user.role)) {
                return res.status(403).json({ success: false, message: 'Only the Team Head who delegated this task can verify it.' });
            }

            task.isApprovedByTeamHead = (status === 'approved');
            task.activityLog.push({ 
                action: `Task verified by Team Head ${req.user.name}`, 
                userId 
            });

            if (status === 'approved') {
                // Notify the Original Assigner (createdBy)
                await createNotification(req.io, {
                    userId: task.createdBy,
                    type: 'task_review',
                    title: 'Task Verified by Head',
                    message: `Task "${task.title}" has been verified by the department head (${req.user.name}). Please provide final approval.`,
                    referenceId: task._id,
                    referenceType: 'Task',
                    companyId: req.user.companyId
                });
            }
        } else if (approvalType === 'assigner' || approvalType === 'manager') {
            // Final Assigner or Manager approval
            const isCreator = task.createdBy.toString() === userId.toString();
            const isAdminManager = ['admin', 'manager'].includes(req.user.role);
            
            if (!isCreator && !isAdminManager) {
                return res.status(403).json({ success: false, message: 'Only the Original Assigner or a Manager can provide final completion approval.' });
            }

            // If there's a team head, they MUST approve first
            if (task.teamHeadId && !task.isApprovedByTeamHead && status === 'approved') {
                return res.status(400).json({ success: false, message: 'This task must be verified by the Department Head first.' });
            }

            task.isApprovedByManager = (status === 'approved');
            
            // Final Completion
            if (status === 'approved') {
                task.status = 'completed';
            }
            
            task.activityLog.push({ 
                action: `Task final approval ${status} by ${req.user.name}`, 
                userId 
            });
        }
        
        // Safety check: if task was rejected by manager/teamhead, move to revision
        if (status === 'rejected') {
            task.status = 'revision';
            task.revisionNote = revisionNote || 'Please review and update the task as requested.';
            task.isApprovedByTeamHead = false;
            task.isApprovedByManager = false;

            // Determine who to notify based on who rejected it
            let notifyUserId = task.assignedTo;
            if (approvalType === 'assigner' && task.teamHeadId) {
                notifyUserId = task.teamHeadId;
            }

            // Notify appropriate person about revision
            await createNotification(req.io, {
                userId: notifyUserId,
                type: 'task_review',
                title: 'Revision Required ❗',
                message: `Task "${task.title}" has been rejected during review by ${req.user.name}. Reason: ${task.revisionNote}`,
                referenceId: task._id,
                referenceType: 'Task',
                companyId: req.user.companyId
            });
        }

        await task.save();

        // Notify Creator/Assigner when Team Head verifies
        if (approvalType === 'teamhead' && status === 'approved') {
            await createNotification(req.io, {
                userId: task.createdBy,
                type: 'task_review',
                title: 'Team Head Verified Task',
                message: `Task "${task.title}" has been verified by Team Head ${req.user.name}. Ready for your final approval.`,
                referenceId: task._id,
                referenceType: 'Task',
                companyId: req.user.companyId
            });
        }

        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'name role departmentId')
            .populate('teamHeadId', 'name role')
            .populate('createdBy', 'name')
            .populate('activityLog.userId', 'name');

        res.json({ success: true, message: `Task ${status} by ${approvalType}`, task: populatedTask });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error approving task', error: error.message });
    }
};

exports.updateTaskAssignee = async (req, res) => {
    try {
        const { id } = req.params;
        const { assigneeId } = req.body;
        const userId = req.user.id;

        const task = await Task.findOne({ _id: id, companyId: req.user.companyId });
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        // Authorization: Admin, Manager, the Creator, or the current assignee (if re-delegating)
        const canReassign = ['admin', 'manager'].includes(req.user.role) || 
                           task.createdBy.toString() === userId || 
                           task.assignedTo.toString() === userId;
        
        if (!canReassign) {
            return res.status(403).json({ success: false, message: 'You do not have permission to re-assign this task.' });
        }

        const newAssignee = await User.findById(assigneeId);
        if (!newAssignee) return res.status(404).json({ success: false, message: 'New assignee not found' });

        task.assignedTo = assigneeId;
        task.teamHeadId = userId; // The head who is delegating/re-assigning
        task.acceptanceStatus = 'pending';
        task.status = 'todo';
        task.rejectionReason = null;
        task.isApprovedByTeamHead = false;
        task.isApprovedByManager = false;
        
        task.activityLog.push({ 
            action: `Task re-assigned to ${newAssignee.name} by ${req.user.name}`, 
            userId 
        });

        await task.save();
        const updatedTask = await Task.findById(id)
            .populate('assignedTo', 'name email role')
            .populate('teamHeadId', 'name role')
            .populate('createdBy', 'name')
            .populate('activityLog.userId', 'name');
        
        // Notify New Assignee
        await createNotification(req.io, {
            userId: assigneeId,
            type: 'task_assigned',
            title: 'Task Re-assigned',
            message: `You have been re-assigned a mission: ${task.title}.`,
            referenceId: task._id,
            referenceType: 'Task',
            companyId: req.user.companyId
        });

        // Real-time update
        emitToCompany(req.user.companyId, 'taskUpdated', updatedTask);

        res.json({ success: true, message: 'Task re-assigned successfully', task: updatedTask });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error re-assigning task', error: error.message });
    }
};

exports.acceptTask = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const task = await Task.findOne({ _id: id, companyId: req.user.companyId });
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        if (task.assignedTo.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to accept this task' });
        }

        task.acceptanceStatus = 'accepted';
        task.activityLog.push({ action: 'Task Accepted', userId });
        await task.save();

        // Notify Creator
        await createNotification(req.io, {
            userId: task.createdBy,
            type: 'system_alert',
            title: 'Task Accepted',
            message: `${req.user.name} has accepted the task: ${task.title}`,
            referenceId: task._id,
            referenceType: 'Task',
            companyId: req.user.companyId
        });

        const populatedTask = await Task.findById(id)
            .populate('assignedTo', 'name role departmentId')
            .populate('teamHeadId', 'name role')
            .populate('createdBy', 'name')
            .populate('activityLog.userId', 'name');

        emitToCompany(req.user.companyId, 'taskUpdated', populatedTask);
        res.json({ success: true, message: 'Task accepted successfully', task: populatedTask });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error accepting task', error: error.message });
    }
};

exports.rejectTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user.id;

        const task = await Task.findOne({ _id: id, companyId: req.user.companyId });
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        if (task.assignedTo.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to reject this task' });
        }

        task.acceptanceStatus = 'rejected';
        task.rejectionReason = reason;
        task.activityLog.push({ action: `Task Rejected. Reason: ${reason}`, userId });
        await task.save();

        // Notify Creator
        await createNotification(req.io, {
            userId: task.createdBy,
            type: 'system_alert',
            title: 'Task Rejected',
            message: `${req.user.name} has rejected the task: ${task.title}. Reason: ${reason}`,
            referenceId: task._id,
            referenceType: 'Task',
            companyId: req.user.companyId
        });

        const populatedTask = await Task.findById(id)
            .populate('assignedTo', 'name role departmentId')
            .populate('teamHeadId', 'name role')
            .populate('createdBy', 'name')
            .populate('activityLog.userId', 'name');

        emitToCompany(req.user.companyId, 'taskUpdated', populatedTask);
        res.json({ success: true, message: 'Task rejected successfully', task: populatedTask });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error rejecting task', error: error.message });
    }
};

exports.deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        // Only admin, manager, or task creator can delete
        const taskToArchive = await Task.findOne({ _id: id, companyId: req.user.companyId });
        if(!taskToArchive) return res.status(404).json({ success: false, message: 'Task not found' });

        if (!['admin', 'manager'].includes(req.user.role) && taskToArchive.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this task.' });
        }

        taskToArchive.isArchived = true;
        taskToArchive.activityLog.push({ action: `Task archived by ${req.user.name}`, userId: req.user.id });
        await taskToArchive.save();

        res.json({ success: true, message: 'Task archived successfully', taskId: id });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting task', error: error.message });
    }
};

exports.getArchivedTasks = async (req, res) => {
    try {
        const { id: userId, role, companyId } = req.user;
        let query = { companyId, isArchived: true };

        if (role === 'employee' || role === 'sales' || role === 'marketing') {
            query.$or = [{ assignedTo: userId }, { createdBy: userId }, { teamHeadId: userId }];
        } else if (role === 'teamhead') {
            const team = await User.find({ reportingTo: userId }).select('_id');
            const teamIds = team.map(u => u._id);
            query.$or = [{ assignedTo: userId }, { createdBy: userId }, { teamHeadId: userId }, { assignedTo: { $in: teamIds } }];
        }
        
        const tasks = await Task.find(query)
            .populate('assignedTo', 'name email role')
            .populate('teamHeadId', 'name role')
            .populate('createdBy', 'name email')
            .sort({ updatedAt: -1 });
            
        res.json({ success: true, tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching archived tasks', error: error.message });
    }
};

exports.restoreTask = async (req, res) => {
    try {
        const { id } = req.params;
        
        const taskToRestore = await Task.findOne({ _id: id, companyId: req.user.companyId });
        if(!taskToRestore) return res.status(404).json({ success: false, message: 'Task not found' });

        if (!['admin', 'manager'].includes(req.user.role) && taskToRestore.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to restore this task.' });
        }

        taskToRestore.isArchived = false;
        taskToRestore.activityLog.push({ action: `Task restored from archive by ${req.user.name}`, userId: req.user.id });
        await taskToRestore.save();
        
        const populatedTask = await Task.findById(id)
            .populate('assignedTo', 'name role departmentId')
            .populate('teamHeadId', 'name role')
            .populate('createdBy', 'name')
            .populate('activityLog.userId', 'name');

        res.json({ success: true, message: 'Task restored successfully', task: populatedTask });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error restoring task', error: error.message });
    }
};

exports.addTaskAttachment = async (req, res) => {
    try {
        const { id } = req.params;
        const task = await Task.findOne({ _id: id, companyId: req.user.companyId });
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        if (req.files && req.files.length > 0) {
            const newFiles = req.files.map(f => f.path);
            task.attachments.push(...newFiles);
            task.activityLog.push({ 
                action: `Added ${req.files.length} attachment(s) by ${req.user.name}`, 
                userId: req.user.id 
            });
            await task.save();
        }

        const populatedTask = await Task.findById(id)
            .populate('assignedTo', 'name email role')
            .populate('teamHeadId', 'name role')
            .populate('createdBy', 'name')
            .populate('activityLog.userId', 'name');

        emitToCompany(req.user.companyId, 'taskUpdated', populatedTask);
        res.json({ success: true, message: 'Attachments added successfully', task: populatedTask });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error adding attachments', error: error.message });
    }
};
