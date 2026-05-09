const Lead = require('../models/Lead');
const User = require('../models/User');
const Department = require('../models/Department');
const Company = require('../models/Company');
const Task = require('../models/Task');
const Account = require('../models/Account');
const Contact = require('../models/Contact');
const Deal = require('../models/Deal');
const Document = require('../models/Document');
const CallLog = require('../models/CallLog');
const twilioService = require('../services/twilioService');
const { createNotification } = require('../services/notificationService');
const emailService = require('../services/emailService');
const { emitToCompany } = require('../services/socketService');
const xlsx = require('xlsx');

const DEFAULT_CHECKLIST = [
    { task: "Identify target customer profile (ICP)" },
    { task: "Set up lead capture channels" },
    { task: "Connect CRM to all lead sources" },
    { task: "Assign lead owner immediately upon entry" },
    { task: "Lead Qualification (BANT/MEDDIC)" },
    { task: "Outreach & First Contact" },
    { task: "Discovery & Needs Analysis" },
    { task: "Proposal & Negotiation" },
    { task: "Close & Handoff" }
];

exports.getCRMConfig = async (req, res) => {
    try {
        res.json({
            success: true,
            config: {
                allowedDealRoles: ['admin', 'manager', 'hr', 'sales', 'marketing']
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching CRM config', error: error.message });
    }
};

exports.createLead = async (req, res) => {
    try {
        const { name, email, contact, company, source, assignedTo, dealValue, priority } = req.body;
        const creatorId = req.user.id;
        const companyId = req.user.companyId;

        const lead = await Lead.create({
            name, email, contact, company, source, dealValue,
            priority: priority || 'medium',
            assignedTo: assignedTo || null,
            departmentId: req.user.departmentId || null,
            createdBy: creatorId,
            companyId,
            checklist: DEFAULT_CHECKLIST,
            activityLog: [{ note: 'Lead Created', userId: creatorId }]
        });

        // Notify Assignee if assigned
        if (assignedTo) {
            await createNotification(req.io, {
                userId: assignedTo,
                type: 'lead_assigned',
                title: 'New Lead Assigned',
                message: `You have been assigned a new lead: ${name} (${company}).`,
                referenceId: lead._id,
                referenceType: 'Lead',
                companyId
            });
        }

        // Automated Follow-up: Send Welcome Email if email exists (Asynchronous)
        if (email) {
            const companyIdForEmail = companyId; // scope for async
            const emailForLead = email;
            const nameForLead = name;
            
            // Do not await - let it run in background to prevent UI hang
            Company.findById(companyIdForEmail).then(company => {
                const companyDisplayName = company ? company.name : "TeamFlow CRM";
                return emailService.sendLeadWelcomeEmail(emailForLead, nameForLead, companyDisplayName);
            }).then(() => {
                // Log the automated action asynchronously
                return Lead.findByIdAndUpdate(lead._id, {
                    $push: { activityLog: { note: `Automated Welcome Email sent to ${emailForLead}`, userId: creatorId } }
                });
            }).catch(emailErr => {
                console.error("Automated Welcome Email Background Process Failed:", emailErr.message);
            });
        }

        const populatedLead = await Lead.findById(lead._id).populate('assignedTo', 'name email');
        
        // Emit Real-time event for the company
        emitToCompany(companyId, 'leadCreated', populatedLead);

        res.status(201).json({ success: true, message: 'Lead created successfully', lead: populatedLead });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating lead', error: error.message });
    }
};

// ==========================================
// Webhook API: Capture Leads from External Sources (Facebook, Website, Zapier)
// ==========================================
exports.captureExternalLead = async (req, res) => {
    try {
        const { webhook_key, companyId, name, email, contact, company, source, notes } = req.body;

        // Security Check
        const secretKey = process.env.WEBHOOK_SECRET_KEY;
        if (!secretKey) {
            return res.status(500).json({ success: false, message: 'Webhook system is not configured on the server. Missing WEBHOOK_SECRET_KEY.' });
        }
        if (webhook_key !== secretKey) {
            return res.status(401).json({ success: false, message: 'Invalid Webhook Key. Access Denied.' });
        }
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'companyId is required in the payload.' });
        }
        if (!name || !contact) {
            return res.status(400).json({ success: false, message: 'name and contact are required fields.' });
        }

        // Validate Source enum mapping
        const VALID_SOURCES = ['website', 'manual', 'referral', 'cold-call', 'campaign', 'social-media', 'facebook', 'instagram', 'linkedin', 'google', 'email', 'walk-in', 'other'];
        let mappedSource = source ? source.toString().toLowerCase() : 'website';
        if (mappedSource.includes('facebook')) mappedSource = 'facebook';
        else if (mappedSource.includes('instagram')) mappedSource = 'instagram';
        else if (mappedSource.includes('linkedin')) mappedSource = 'linkedin';
        else if (mappedSource.includes('google')) mappedSource = 'google';
        else if (!VALID_SOURCES.includes(mappedSource)) mappedSource = 'other';

        // Auto-detect correct Company for testing/fallback
        let finalCompanyId = companyId;
        const validCompany = await Company.findById(companyId);
        if (!validCompany) {
            const defaultCompany = await Company.findOne(); // Grab the first company in DB
            if (defaultCompany) finalCompanyId = defaultCompany._id;
        }

        // We need a creator for the database constraint.
        let sysUser = await User.findOne({ companyId: finalCompanyId });
        if (!sysUser) {
            // Fallback for isolated testing/invalid companyId
            sysUser = await User.findOne({});
        }
        const creatorId = sysUser ? sysUser._id : null; 

        if (!creatorId) {
            return res.status(400).json({ success: false, message: 'No system user found to assign createdBy mapping.' });
        }

        // Create the Lead
        const lead = await Lead.create({
            name, email, contact, company, 
            source: mappedSource,
            priority: 'medium',
            status: 'new',
            companyId: finalCompanyId,
            createdBy: creatorId, // Must be provided based on your DB schema
            checklist: DEFAULT_CHECKLIST,
            activityLog: [{ note: `Lead automatically captured via Webhook. Source Note: ${source || 'Website'}. Notes: ${notes || 'None'}`, userId: creatorId }] 
        });

        // Emit Real-time event for the company so active users see it instantly
        const populatedLead = await Lead.findById(lead._id);
        emitToCompany(finalCompanyId, 'leadCreated', populatedLead);

        res.status(201).json({ success: true, message: 'Lead captured successfully', leadId: lead._id });
    } catch (error) {
        console.error('Webhook Lead Capture Error:', error);
        res.status(500).json({ success: false, message: 'Error capturing lead via webhook', error: error.message });
    }
};

exports.getLeads = async (req, res) => {
    try {
        const { id: userId, role, companyId } = req.user;
        let query = { companyId };

        if (role === 'employee' || role === 'sales' || role === 'marketing') {
            // New: Find all users in the same department for B-type visibility
            const deptUsers = await User.find({ departmentId: req.user.departmentId }).select('_id');
            const deptUserIds = deptUsers.map(u => u._id);

            // Can see leads assigned to them OR leads they created OR leads created in their department OR leads owned by their department
            query.$or = [
                { assignedTo: userId }, 
                { createdBy: userId },
                { createdBy: { $in: deptUserIds } },
                { departmentId: req.user.departmentId }
            ];
            
            // Marketing can also see 'new' leads to qualify them
            if (role === 'marketing') {
                query.$or.push({ status: 'new' });
            }
        } else if (role === 'teamhead') {
            const team = await User.find({ reportingTo: userId }).select('_id');
            const teamIds = team.map(u => u._id);
            
            // Also include department-wide leads for teamheads
            const deptUsers = await User.find({ departmentId: req.user.departmentId }).select('_id');
            const deptUserIds = deptUsers.map(u => u._id);

            query.$or = [
                { assignedTo: userId }, 
                { createdBy: userId }, 
                { assignedTo: { $in: teamIds } },
                { createdBy: { $in: deptUserIds } },
                { departmentId: req.user.departmentId }
            ];
        } else if (role === 'manager' || role === 'admin') {
            // Managers and Admins see all leads in the company
            // No additional $or query needed, use the base companyId query
        }

        // New Logic: Filter out leads that are too old (archived) OR already converted
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        query.$and = query.$and || [];
        query.$and.push({ isArchived: { $ne: true } }); // Exclude archived leads
        query.$and.push({
            isConverted: { $ne: true } // Always exclude converted leads from lead list
        });
        query.$and.push({
            $or: [
                { status: { $nin: ['lost'] } }, // Keep all Active leads (except Lost)
                { updatedAt: { $gte: twoDaysAgo } } // Keep recent Lost leads for 48h
            ]
        });

        const leads = await Lead.find(query)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.json({ success: true, leads });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching leads', error: error.message });
    }
};

exports.updateLeadStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note, dealValue, nextFollowUpDate, followUpNote } = req.body;
        const userId = req.user.id;

        const lead = await Lead.findOne({ _id: id, companyId: req.user.companyId });
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        if (status) {
            lead.status = status;
            lead.activityLog.push({ 
                note: `Status changed to ${status.toUpperCase()} by ${req.user.name}`, 
                userId 
            });

            // Auto-transfer to Sales Department if status = 'contacted'
            if (status === 'contacted') {
                const salesDept = await Department.findOne({ companyId: req.user.companyId, name: { $regex: /sales/i } });
                if (salesDept && (!lead.departmentId || lead.departmentId.toString() !== salesDept._id.toString())) {
                    lead.departmentId = salesDept._id;
                    lead.assignedTo = null; // Remove specific assignment so Teamhead can decide
                    lead.activityLog.push({ 
                        note: `Lead automatically handed over to Sales Department`, 
                        userId 
                    });
                }
            }
        }
        if (dealValue) {
            lead.dealValue = dealValue;
            lead.activityLog.push({ 
                note: `Estimated deal value updated to ₹${dealValue} by ${req.user.name}`, 
                userId 
            });
        }
        if (nextFollowUpDate !== undefined) lead.nextFollowUpDate = nextFollowUpDate;
        if (followUpNote !== undefined) lead.followUpNote = followUpNote;
        
        if (note || nextFollowUpDate) {
            lead.activityLog.push({ 
                note: note || (nextFollowUpDate ? `Follow-up scheduled for ${new Date(nextFollowUpDate).toLocaleDateString()}` : `Status updated to ${status}`), 
                userId 
            });
        }

        await lead.save();
        res.json({ success: true, message: 'Lead updated successfully', lead });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating lead', error: error.message });
    }
};

exports.scheduleFollowUp = async (req, res) => {
    try {
        const { id } = req.params;
        const { nextFollowUpDate, followUpNote } = req.body;
        const userId = req.user.id;

        const lead = await Lead.findOneAndUpdate(
            { _id: id, companyId: req.user.companyId },
            { 
                nextFollowUpDate, 
                followUpNote,
                $push: { activityLog: { note: `Next follow-up scheduled for ${new Date(nextFollowUpDate).toLocaleString()}`, userId } }
            },
            { new: true }
        );

        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        res.json({ success: true, message: 'Follow-up scheduled', lead });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error scheduling follow-up', error: error.message });
    }
};

exports.transferLead = async (req, res) => {
    try {
        const { id } = req.params;
        const { assignedToId, deptId } = req.body; 
        const userId = req.user.id;

        const lead = await Lead.findOne({ _id: id, companyId: req.user.companyId });
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        let targetId = assignedToId;
        let targetName = 'Manager';

        if (deptId) {
            const dept = await Department.findById(deptId);
            if (dept && dept.managerId) {
                targetId = dept.managerId;
                const manager = await User.findById(dept.managerId);
                targetName = manager ? manager.name : 'Dept Manager';
            }
        }

        // Get transferrer's department
        const transferrer = await User.findById(userId).populate('departmentId', 'name');
        const deptName = transferrer.departmentId ? transferrer.departmentId.name : 'Unknown Department';

        // If transferring to a department with no manager, clear assignedTo
        // so it becomes an "unassigned" lead in the target department.
        lead.assignedTo = targetId || null;
        lead.departmentId = deptId || lead.departmentId;
        lead.transferredFrom = deptName;
        lead.activityLog.push({ 
            note: `Lead transferred from ${deptName} to ${targetName} by ${transferrer.name}`, 
            userId 
        });

        await lead.save();

        // Notify Target Manager
        if (targetId) {
            await createNotification(req.io, {
                userId: targetId,
                type: 'lead_assigned',
                title: 'Lead Transferred to You',
                message: `Lead ${lead.name} has been transferred to your department from ${deptName}.`,
                referenceId: lead._id,
                referenceType: 'Lead',
                companyId: req.user.companyId
            });

            // New: Create a Task for the target manager/team head
            await Task.create({
                title: `Handle Transferred Lead: ${lead.name}`,
                description: `A new lead has been transferred from the ${deptName} department. Please review and assign to a team member.\n\nLead Details:\n- Name: ${lead.name}\n- Company: ${lead.company || 'N/A'}\n- Contact: ${lead.contact || 'N/A'}`,
                priority: 'high',
                status: 'todo',
                assignedTo: targetId,
                createdBy: userId,
                companyId: req.user.companyId,
                activityLog: [{ action: 'Task automatically created via Lead Transfer', userId }]
            });
        }

        res.json({ success: true, message: 'Lead transferred and task created successfully', lead });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error transferring lead', error: error.message });
    }
};

exports.requestLeadApproval = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await Lead.findOne({ _id: id, companyId: req.user.companyId });
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        lead.approvalStatus = 'pending';
        lead.activityLog.push({ 
            note: `Manager approval requested by ${req.user.name}`, 
            userId: req.user.id 
        });

        await lead.save();
        res.json({ success: true, message: 'Approval requested from Manager', lead });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error requesting approval', error: error.message });
    }
};

exports.approveLead = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body; // 'approved' or 'rejected'
        
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Only Managers or Admins can approve leads.' });
        }

        const lead = await Lead.findOne({ _id: id, companyId: req.user.companyId });
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        lead.approvalStatus = status;
        
        if (status === 'rejected') {
            lead.rejectionReason = rejectionReason || 'No reason provided';
            lead.activityLog.push({ 
                note: `Lead REJECTED by Manager ${req.user.name}. Reason: ${lead.rejectionReason}`, 
                userId: req.user.id 
            });
        } else if (status === 'approved') {
            lead.rejectionReason = null;
            lead.status = 'converted'; // Mark as project ready
            lead.activityLog.push({ 
                note: `Lead APPROVED by Manager ${req.user.name}`, 
                userId: req.user.id 
            });
        } else {
            lead.activityLog.push({ 
                note: `Lead ${status} by Manager ${req.user.name}`, 
                userId: req.user.id 
            });
        }

        await lead.save();

        // Notify Submitter
        await createNotification(req.io, {
            userId: lead.createdBy,
            type: 'system_alert',
            title: `Lead Approval ${status.toUpperCase()}`,
            message: `Your lead ${lead.name} has been ${status} by Manager. ${status === 'rejected' ? 'Reason: ' + rejectionReason : ''}`,
            referenceId: lead._id,
            referenceType: 'Lead',
            companyId: req.user.companyId
        });

        res.json({ success: true, message: `Lead ${status} successfully`, lead });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error approving lead', error: error.message });
    }
};

exports.getLeadHistory = async (req, res) => {
    try {
        const { companyId } = req.user;
        // History shows ALL leads that are Converted or Lost, sorted by date
        const leads = await Lead.find({ 
            companyId, 
            status: { $in: ['converted', 'lost'] } 
        })
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email')
        .sort({ updatedAt: -1 });

        res.json({ success: true, leads });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching history', error: error.message });
    }
};

exports.deleteLead = async (req, res) => {
    try {
        const { id } = req.params;
        // Only admin/manager can delete
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Only Admins or Managers can delete leads.' });
        }
        const lead = await Lead.findOneAndDelete({ _id: id, companyId: req.user.companyId });
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        res.json({ success: true, message: 'Lead deleted successfully', leadId: id });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting lead', error: error.message });
    }
};

exports.updateLead = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name, email, contact, company, source, dealValue, assignedTo, priority, 
            title, industry, gstNumber, website, annualRevenue, budgetRange, notes,
            status, nextFollowUpDate, followUpNote, customFields 
        } = req.body;

        const updateData = {};
        const standardFields = [
            'name', 'email', 'contact', 'company', 'source', 'dealValue', 'priority', 
            'title', 'industry', 'gstNumber', 'website', 'annualRevenue', 'budgetRange', 'notes',
            'status', 'nextFollowUpDate', 'followUpNote'
        ];

        // Only add provided fields to updateData
        standardFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = field === 'assignedTo' ? (req.body[field] || null) : req.body[field];
            }
        });

        // Handle customFields merge
        if (customFields) {
            updateData.customFields = customFields;
        }

        const lead = await Lead.findOneAndUpdate(
            { _id: id, companyId: req.user.companyId },
            { 
              $set: updateData,
              $push: { activityLog: { note: `Lead details updated by ${req.user.name}`, userId: req.user.id } }
            },
            { new: true }
        )
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email');

        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        res.json({ success: true, message: 'Lead updated', lead });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating lead', error: error.message });
    }
};

// --- MODULAR CRM: ACCOUNTS, CONTACTS, DEALS ---

exports.getAccounts = async (req, res) => {
    try {
        const accounts = await Account.find({ companyId: req.user.companyId }).populate('ownerId', 'name');
        res.json({ success: true, accounts });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getContacts = async (req, res) => {
    try {
        const contacts = await Contact.find({ companyId: req.user.companyId }).populate('accountId', 'name').populate('ownerId', 'name');
        res.json({ success: true, contacts });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getDeals = async (req, res) => {
    try {
        const deals = await Deal.find({ companyId: req.user.companyId, isArchived: { $ne: true } })
            .populate('accountId', 'name email')
            .populate('contactId', 'name email')
            .populate('ownerId', 'name')
            .populate('assignedTo', 'name role')
            .populate('activityLog.userId', 'name');
        res.json({ success: true, deals });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createDeal = async (req, res) => {
    try {
        const { name, accountId, contactId, amount, closingDate, stage, ownerId } = req.body;
        const deal = await Deal.create({
            name, accountId, contactId, amount, closingDate, stage: stage || 'qualification',
            ownerId: ownerId || req.user.id,
            companyId: req.user.companyId,
            activityLog: [{ note: `Deal created by ${req.user.name}`, userId: req.user.id }]
        });
        const populated = await Deal.findById(deal._id)
            .populate('accountId', 'name email').populate('contactId', 'name email')
            .populate('ownerId', 'name').populate('assignedTo', 'name role')
            .populate('activityLog.userId', 'name');
        res.json({ success: true, deal: populated });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateDeal = async (req, res) => {
    try {
        const deal = await Deal.findOneAndUpdate(
            { _id: req.params.id, companyId: req.user.companyId },
            { ...req.body, $push: { activityLog: { note: `Deal updated by ${req.user.name}`, userId: req.user.id } } },
            { new: true }
        ).populate('accountId', 'name email').populate('contactId', 'name email')
         .populate('ownerId', 'name').populate('assignedTo', 'name role')
         .populate('activityLog.userId', 'name');
        res.json({ success: true, deal });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteDeal = async (req, res) => {
    try {
        await Deal.findOneAndUpdate(
            { _id: req.params.id, companyId: req.user.companyId },
            { 
               isArchived: true, 
               $push: { activityLog: { note: `Deal archived by ${req.user.name}`, userId: req.user.id } } 
            }
        );
        res.json({ success: true, dealId: req.params.id });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getArchivedDeals = async (req, res) => {
    try {
        const deals = await Deal.find({ companyId: req.user.companyId, isArchived: true })
            .populate('accountId', 'name email').populate('contactId', 'name email')
            .populate('ownerId', 'name').populate('assignedTo', 'name role');
        res.json({ success: true, deals });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.restoreDeal = async (req, res) => {
    try {
        const deal = await Deal.findOneAndUpdate(
            { _id: req.params.id, companyId: req.user.companyId },
            { 
               isArchived: false, 
               $push: { activityLog: { note: `Deal restored from archive by ${req.user.name}`, userId: req.user.id } } 
            },
            { new: true }
        ).populate('accountId', 'name email').populate('contactId', 'name email')
         .populate('ownerId', 'name').populate('assignedTo', 'name role')
         .populate('activityLog.userId', 'name');
        if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
        res.json({ success: true, deal });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateDealStage = async (req, res) => {
    try {
        const { stage } = req.body;
        const deal = await Deal.findOneAndUpdate(
            { _id: req.params.id, companyId: req.user.companyId },
            { 
                stage,
                $push: { activityLog: { note: `Stage moved to "${stage}" by ${req.user.name}`, userId: req.user.id } }
            },
            { new: true }
        ).populate('accountId', 'name email').populate('contactId', 'name email')
         .populate('ownerId', 'name').populate('assignedTo', 'name role')
         .populate('activityLog.userId', 'name');
        if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
        res.json({ success: true, deal });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.assignDeal = async (req, res) => {
    try {
        const { assignedTo } = req.body;
        const assignee = await require('../models/User').findById(assignedTo).select('name');
        const deal = await Deal.findOneAndUpdate(
            { _id: req.params.id, companyId: req.user.companyId },
            { 
                assignedTo,
                $push: { activityLog: { note: `Deal assigned to ${assignee?.name || 'Unknown'} by ${req.user.name}`, userId: req.user.id } }
            },
            { new: true }
        ).populate('accountId', 'name email').populate('contactId', 'name email')
         .populate('ownerId', 'name').populate('assignedTo', 'name role')
         .populate('activityLog.userId', 'name');
        if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
        res.json({ success: true, deal });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.convertLead = async (req, res) => {
    try {
        const { id } = req.params;
        const { dealName, amount, closingDate, accountName } = req.body;
        const companyId = req.user.companyId;
        const userId = req.user.id;

        const lead = await Lead.findOne({ _id: id, companyId });
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        if (lead.isConverted) return res.status(400).json({ success: false, message: 'Lead already converted' });

        // 1. Create Account
        const account = await Account.create({
            name: accountName || lead.company || `${lead.name}'s Account`,
            industry: lead.industry,
            gstNumber: lead.gstNumber,
            website: lead.website,
            size: lead.annualRevenue,
            email: lead.email,
            phone: lead.contact,
            ownerId: userId,
            companyId
        });

        // 2. Create Contact
        const contact = await Contact.create({
            name: lead.name,
            email: lead.email,
            phone: lead.contact,
            title: lead.title,
            notes: lead.notes,
            accountId: account._id,
            leadId: lead._id,
            ownerId: userId,
            companyId
        });

        // 3. Create Deal
        const deal = await Deal.create({
            name: dealName || `Deal with ${lead.name}`,
            accountId: account._id,
            contactId: contact._id,
            amount: amount || lead.dealValue || 0,
            closingDate: closingDate || null,
            ownerId: userId,
            companyId
        });

        // 4. Update Lead
        lead.isConverted = true;
        lead.convertedAt = new Date();
        lead.activityLog.push({ note: `Lead converted to Contact, Account, and Deal by ${req.user.name}`, userId });
        await lead.save();

        const populatedDeal = await Deal.findById(deal._id)
            .populate('accountId', 'name email')
            .populate('contactId', 'name email')
            .populate('ownerId', 'name')
            .populate('assignedTo', 'name role')
            .populate('activityLog.userId', 'name');

        res.json({ success: true, message: 'Lead converted successfully', account, contact, deal: populatedDeal });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Conversion failed', error: error.message });
    }
};

exports.updateLeadChecklist = async (req, res) => {
    try {
        const { id } = req.params;
        const { checklist } = req.body;
        const lead = await Lead.findOneAndUpdate(
            { _id: id, companyId: req.user.companyId },
            { checklist },
            { new: true }
        );
        res.json({ success: true, lead });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ACCOUNTS CRUD
exports.createAccount = async (req, res) => {
    try {
        const account = await Account.create({ ...req.body, companyId: req.user.companyId, ownerId: req.body.ownerId || req.user.id });
        const populated = await Account.findById(account._id).populate('ownerId', 'name');
        res.json({ success: true, account: populated });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateAccount = async (req, res) => {
    try {
        const account = await Account.findOneAndUpdate({ _id: req.params.id, companyId: req.user.companyId }, req.body, { new: true }).populate('ownerId', 'name');
        res.json({ success: true, account });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteAccount = async (req, res) => {
    try {
        await Account.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
        res.json({ success: true, accountId: req.params.id });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// CONTACTS CRUD
exports.createContact = async (req, res) => {
    try {
        const contact = await Contact.create({ ...req.body, companyId: req.user.companyId, ownerId: req.body.ownerId || req.user.id });
        const populated = await Contact.findById(contact._id).populate('accountId', 'name').populate('ownerId', 'name');
        res.json({ success: true, contact: populated });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateContact = async (req, res) => {
    try {
        const contact = await Contact.findOneAndUpdate({ _id: req.params.id, companyId: req.user.companyId }, req.body, { new: true }).populate('accountId', 'name').populate('ownerId', 'name');
        res.json({ success: true, contact });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteContact = async (req, res) => {
    try {
        await Contact.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
        res.json({ success: true, contactId: req.params.id });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// --- SEND BULK EMAIL ---
exports.sendBulkCrmEmail = async (req, res) => {
    try {
        const { emails, subject, message } = req.body;
        
        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({ success: false, message: 'No recipient emails provided.' });
        }
        if (!subject || !message) {
            return res.status(400).json({ success: false, message: 'Subject and message are required.' });
        }

        const company = await Company.findById(req.user.companyId);
        const fromName = `${req.user.name} | ${company ? company.name : 'TeamFlow'}`;
        const replyTo = req.user.email;

        // For privacy, sending individually or using BCC is better. Let's send individually.
        const sendPromises = emails.map(email => 
            emailService.sendEmail(
                email, 
                subject, 
                `<div style="font-family: Arial, sans-serif; white-space: pre-wrap;">${message}</div>`,
                { fromName, replyTo, companyId: req.user.companyId }
            )
        );
        
        await Promise.all(sendPromises);

        res.json({ success: true, message: `Successfully sent email to ${emails.length} recipient(s).` });
    } catch (err) { 
        console.error('Bulk Email Error:', err);
        res.status(500).json({ success: false, message: 'Failed to send emails.', error: err.message }); 
    }
};

// DOCUMENTS CRUD
exports.getDocuments = async (req, res) => {
    try {
        const documents = await Document.find({ companyId: req.user.companyId })
            .populate('uploadedBy', 'name')
            .populate('relatedId', 'name');
        res.json({ success: true, documents });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createDocument = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

        const document = await Document.create({
            ...req.body,
            fileUrl: req.file.path, // Cloudinary URL
            fileType: req.file.mimetype.split('/')[1],
            fileSize: req.file.size,
            uploadedBy: req.user.id,
            companyId: req.user.companyId
        });
        
        const populated = await Document.findById(document._id).populate('uploadedBy', 'name').populate('relatedId', 'name');
        res.json({ success: true, document: populated });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteDocument = async (req, res) => {
    try {
        await Document.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
        res.json({ success: true, documentId: req.params.id });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};


exports.importLeads = async (req, res) => {
    try {
        const { leads } = req.body;
        if (!leads || !Array.isArray(leads)) return res.status(400).json({ success: false, message: 'No leads data provided' });

        const data = leads;
        const companyId = req.user.companyId;
        const userId = req.user.id;
        const importedLeads = [];

        // Define flexible mapping for standard fields
        const fieldMapping = {
            name: ['name', 'full name', 'lead name', 'client name', 'customer', 'customer name', 'lead'],
            contact: ['contact', 'phone', 'mobile', 'cell', 'number', 'phone number', 'contact number', 'mobile number'],
            email: ['email', 'email id', 'email address'],
            company: ['company', 'firm', 'organization', 'company name'],
            source: ['source', 'lead source', 'channel'],
            priority: ['priority', 'lead priority'],
            dealValue: ['deal value', 'value', 'amount', 'deal amount', 'estimated value'],
            notes: ['notes', 'remark', 'remarks', 'comment', 'description'],
            title: ['title', 'job title', 'designation'],
            industry: ['industry', 'sector'],
            gstNumber: ['gst', 'gst number', 'gstin'],
            website: ['website', 'url', 'site'],
        };

        const standardFields = Object.keys(fieldMapping);

        for (const row of data) {
            const leadData = {
                createdBy: userId,
                companyId,
                status: 'new',
                isImported: true,
                isArchived: false,
                checklist: DEFAULT_CHECKLIST,
                customFields: {}, // To store unmapped columns
                activityLog: [{ note: `Lead imported from Excel by ${req.user.name}`, userId }]
            };

            // Iterate through every column in the Excel row
            Object.keys(row).forEach(header => {
                const normalizedHeader = header.toLowerCase().trim();
                let mapped = false;

                // Try to find if this header matches any standard field aliases
                for (const field of standardFields) {
                    if (fieldMapping[field].includes(normalizedHeader)) {
                        leadData[field] = row[header];
                        mapped = true;
                        break;
                    }
                }

                // If not mapped to a standard field, store in customFields
                if (!mapped) {
                    leadData.customFields[header] = row[header];
                }
            });

            // Minimum validation: Name and Contact (or at least one of them to be useful)
            if (!leadData.name && !leadData.contact && !leadData.email) continue;
            
            // Add fallbacks for MongoDB required fields
            leadData.name = leadData.name ? leadData.name.toString() : "Unknown Lead";
            leadData.contact = leadData.contact ? leadData.contact.toString() : "No Contact";
            
            // Handle enums and specific types
            if (leadData.source) {
                const s = leadData.source.toString().toLowerCase();
                const allowed = ['website', 'manual', 'referral', 'cold-call', 'campaign', 'social-media', 'facebook', 'instagram', 'linkedin', 'google', 'email', 'walk-in', 'other'];
                leadData.source = allowed.includes(s) ? s : 'other';
            }
            if (leadData.priority) {
                const p = leadData.priority.toString().toLowerCase();
                const allowed = ['low', 'medium', 'high'];
                leadData.priority = allowed.includes(p) ? p : 'medium';
            }
            if (leadData.dealValue) leadData.dealValue = Number(leadData.dealValue) || 0;

            const newLead = await Lead.create(leadData);
            importedLeads.push(newLead);
        }

        res.json({ success: true, message: `Successfully imported ${importedLeads.length} leads.`, count: importedLeads.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Import failed', error: error.message });
    }
};

exports.moveToPipeline = async (req, res) => {
    try {
        const { leadIds } = req.body;
        const companyId = req.user.companyId;
        const userId = req.user.id;

        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No lead IDs provided.' });
        }

        await Lead.updateMany(
            { _id: { $in: leadIds }, companyId },
            { 
                $set: { isImported: false },
                $push: { activityLog: { note: `Lead moved to Active Pipeline by ${req.user.name}`, userId } }
            }
        );

        // Fetch updated leads to return to frontend
        const updatedLeads = await Lead.find({ _id: { $in: leadIds }, companyId })
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email');

        res.json({ success: true, message: `${updatedLeads.length} leads moved to pipeline.`, leads: updatedLeads });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to move leads to pipeline', error: error.message });
    }
};

exports.archiveLead = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await Lead.findOneAndUpdate(
            { _id: id, companyId: req.user.companyId },
            { 
                isArchived: true,
                $push: { activityLog: { note: `Lead archived by ${req.user.name}`, userId: req.user.id } }
            },
            { new: true }
        );
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        res.json({ success: true, message: 'Lead moved to archive', leadId: id });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Archive failed', error: error.message });
    }
};

exports.restoreLead = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await Lead.findOneAndUpdate(
            { _id: id, companyId: req.user.companyId },
            { 
                isArchived: false,
                $push: { activityLog: { note: `Lead restored from archive by ${req.user.name}`, userId: req.user.id } }
            },
            { new: true }
        );
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        res.json({ success: true, message: 'Lead restored successfully', lead });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Restore failed', error: error.message });
    }
};

exports.getArchivedLeads = async (req, res) => {
    try {
        const leads = await Lead.find({ 
            companyId: req.user.companyId, 
            isArchived: true 
        })
        .populate('assignedTo', 'name')
        .sort({ updatedAt: -1 });
        res.json({ success: true, leads });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch archived leads', error: error.message });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const deals = await Deal.find({ companyId });
        const leads = await Lead.find({ companyId });

        const totalRevenue = deals.filter(d => d.stage === 'closed-won').reduce((sum, d) => sum + (d.amount || 0), 0);
        const expectedRevenue = deals.filter(d => d.stage !== 'closed-won' && d.stage !== 'closed-lost').reduce((sum, d) => sum + (d.amount || 0), 0);
        
        const funnel = {
            qualification: deals.filter(d => d.stage === 'qualification').length,
            needsAnalysis: deals.filter(d => d.stage === 'needs-analysis').length,
            proposal: deals.filter(d => d.stage === 'proposal').length,
            negotiation: deals.filter(d => d.stage === 'negotiation').length,
            closedWon: deals.filter(d => d.stage === 'closed-won').length,
            closedLost: deals.filter(d => d.stage === 'closed-lost').length
        };

        const today = new Date();
        today.setHours(0,0,0,0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23,59,59,999);

        const followUpsToday = [
            ...leads.filter(l => l.nextFollowUpDate && l.nextFollowUpDate >= today && l.nextFollowUpDate <= endOfDay).map(l => ({ type: 'Lead', item: l })),
            ...deals.filter(d => d.nextFollowUpDate && d.nextFollowUpDate >= today && d.nextFollowUpDate <= endOfDay).map(d => ({ type: 'Deal', item: d }))
        ];

        // Recent Activity Feed: Aggregate last 10 activities from all leads and deals
        const allActivities = [];
        
        leads.forEach(l => {
            if (l.activityLog && l.activityLog.length > 0) {
                l.activityLog.forEach(log => {
                    allActivities.push({
                        ...log.toObject(),
                        type: 'Lead',
                        name: l.name,
                        id: l._id,
                        timestamp: log.timestamp || l.updatedAt
                    });
                });
            }
        });

        deals.forEach(d => {
            if (d.activityLog && d.activityLog.length > 0) {
                d.activityLog.forEach(log => {
                    allActivities.push({
                        ...log.toObject(),
                        type: 'Deal',
                        name: d.name,
                        id: d._id,
                        timestamp: log.timestamp || d.updatedAt
                    });
                });
            }
        });

        // Sort by timestamp descending and take top 10
        const recentActivities = allActivities
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);

        res.json({ 
            success: true, 
            analytics: { 
                totalRevenue, 
                expectedRevenue, 
                funnel, 
                totalLeads: leads.length, 
                convertedLeads: leads.filter(l => l.isConverted).length, 
                followUpsToday,
                recentActivities 
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch analytics', error: error.message });
    }
};

exports.addDealNote = async (req, res) => {
    try {
        const { text } = req.body;
        const deal = await Deal.findOneAndUpdate(
            { _id: req.params.id, companyId: req.user.companyId },
            { $push: { notes: { text, userId: req.user.id } } },
            { new: true }
        ).populate('notes.userId', 'name');
        if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
        res.json({ success: true, deal });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.uploadDealDocument = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded' });
        
        const docs = req.files.map(file => ({
            url: file.path,
            name: file.originalname,
            uploadedBy: req.user.id
        }));

        const deal = await Deal.findOneAndUpdate(
            { _id: req.params.id, companyId: req.user.companyId },
            { 
                $push: { documents: { $each: docs }, activityLog: { note: `Uploaded ${docs.length} documents by ${req.user.name}`, userId: req.user.id } }
            },
            { new: true }
        ).populate('documents.uploadedBy', 'name').populate('activityLog.userId', 'name');
        
        if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
        res.json({ success: true, deal });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.setDealFollowUp = async (req, res) => {
    try {
        const { date, note } = req.body;
        const deal = await Deal.findOneAndUpdate(
            { _id: req.params.id, companyId: req.user.companyId },
            { 
                nextFollowUpDate: date,
                followUpNote: note,
                $push: { activityLog: { note: `Follow-up set for ${new Date(date).toLocaleDateString()} by ${req.user.name}`, userId: req.user.id } }
            },
            { new: true }
        ).populate('activityLog.userId', 'name');
        if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
        res.json({ success: true, deal });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// --- CALL CENTER CRM: EXOTEL & QUICK REMARKS ---

exports.initiateExotelCall = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await Lead.findOne({ _id: id, companyId: req.user.companyId });
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        if (!lead.contact) return res.status(400).json({ success: false, message: 'Lead has no contact number' });

        // Get Agent's phone number (Current logged in user)
        const agent = await User.findById(req.user.id).select('phone');
        if (!agent || !agent.phone) {
            return res.status(400).json({ success: false, message: 'Please update your phone number in settings first.' });
        }

        const SID = process.env.ACCOUNT_SID;
        const KEY = process.env.EXOTEL_API_KEY;
        const TOKEN = process.env.EXOTEL_API_TOKEN;
        const CALLER_ID = process.env.EXOTEL_VIRTUAL_NUMBER;



        if (!SID || !KEY || !TOKEN || !CALLER_ID) {
            return res.status(500).json({ 
                success: false, 
                message: `Exotel credentials are not fully configured. Missing: ${[!SID && 'ACCOUNT_SID', !KEY && 'API_KEY', !TOKEN && 'API_TOKEN', !CALLER_ID && 'EXOTEL_VIRTUAL_NUMBER'].filter(Boolean).join(', ')}` 
            });
        }

        // Note: Logic here was manually removed, but function structure must be valid.
        res.status(501).json({ success: false, message: 'Exotel logic needs restoration or removal' });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// --- CALL CENTER CRM: TWILIO ---

/**
 * Generate a Twilio Voice Token for the frontend
 */
exports.getTwilioToken = (req, res) => {
    try {
        const identity = req.user.id.toString();
        const token = twilioService.generateToken(identity);
        res.json({ success: true, token });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Handle Twilio TwiML request when a device initiates a call
 */
exports.handleTwilioTwiML = (req, res) => {
    try {
       
        // Twilio sends parameters in req.body for POST requests
        const To = req.body.To || req.query.To;
        
        if (!To) {
            console.error('ERROR: No "To" parameter found in Twilio request');
            const twiml = new (require('twilio').twiml.VoiceResponse)();
            twiml.say('Sorry, we could not find the destination number.');
            return res.type('text/xml').send(twiml.toString());
        }

        const twiml = twilioService.generateTwiML(To);
            // console.log('DEBUG: Generated TwiML:', twiml);
        
        res.type('text/xml');
        res.send(twiml);
    } catch (error) {
        console.error('ERROR in handleTwilioTwiML:', error);
        const twiml = new (require('twilio').twiml.VoiceResponse)();
        twiml.say('An internal error occurred on the server.');
        res.type('text/xml').send(twiml.toString());
    }
};

/**
 * Prepare a call log entry before the browser starts dialing.
 * This replaces the previous direct API-initiated call.
 */
exports.initiateCall = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await Lead.findById(id);
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        // Log the attempt
        await CallLog.create({
            leadId: id,
            userId: req.user.id,
            companyId: req.user.companyId,
            status: 'initiated',
            callSid: `local_${Date.now()}` // Temporary ID until Twilio callback
        });

        lead.activityLog.push({ 
            note: `Twilio call initiated by ${req.user.name} to ${lead.contact}`, 
            userId: req.user.id 
        });
        await lead.save();
        
        res.json({ success: true, message: 'Ready to initiate call', leadContact: lead.contact });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateQuickRemark = async (req, res) => {
    try {
        const { id } = req.params;
        const { remark } = req.body;
        const userId = req.user.id;

        const lead = await Lead.findOneAndUpdate(
            { _id: id, companyId: req.user.companyId },
            { 
                notes: remark,
                $push: { 
                    remarks: { text: remark, userId, date: new Date() },
                    activityLog: { note: `Interaction note added by ${req.user.name}`, userId }
                }
            },
            { new: true }
        );

        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        res.json({ success: true, message: 'Remark saved', lead });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error saving remark', error: error.message });
    }
};

// Handle Exotel Call Webhook
exports.handleCallWebhook = async (req, res) => {
    try {
        // Twilio sends data in standard POST body
        const { CallSid, CallStatus, RecordingUrl, RecordingDuration, From, To } = req.body;
        //console.log('DEBUG: Twilio Webhook Received:', req.body);

        // Find or Create Call Log
        // Sometimes the recording callback arrives after/separately from the status callback
        let callLog = await CallLog.findOne({ callSid: CallSid });

        if (!callLog) {
            // If it's a new log (e.g., dial started)
            // We might need to find the lead by phone number if it's an inbound or client-initiated call without previous ID
            const lead = await Lead.findOne({ contact: To });
            const user = await User.findOne({ id: From }); // Or some other way to identify caller

            callLog = new CallLog({
                callSid: CallSid,
                leadId: lead?._id,
                userId: user?._id || req.body.identity, // identity might be sent in custom TwiML
                companyId: lead?.companyId || user?.companyId,
            });
        }

        if (CallStatus) callLog.status = CallStatus;
        if (RecordingUrl) callLog.recordingUrl = RecordingUrl;
        if (RecordingDuration) callLog.duration = Number(RecordingDuration);

        await callLog.save();

        if (callLog.leadId && (CallStatus === 'completed' || RecordingUrl)) {
            await Lead.findByIdAndUpdate(callLog.leadId, {
                $push: { 
                    activityLog: { 
                        note: `Twilio Call: ${CallStatus}. Duration: ${RecordingDuration || 0}s. ${RecordingUrl ? `Recording: ${RecordingUrl}` : ''}`,
                        userId: callLog.userId
                    } 
                }
            });
        }

        res.type('text/xml');
        res.send('<Response></Response>'); // Acknowledge Twilio
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).send('Error');
    }
};

// Get Call History (Admin Only)
exports.getCallHistory = async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const callLogs = await CallLog.find({ companyId: req.user.companyId })
            .populate('leadId', 'name contact')
            .populate('userId', 'name')
            .sort({ createdAt: -1 });

        res.json({ success: true, callLogs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Submit Post-Call Feedback
exports.submitPostCallFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remark, nextFollowUpDate } = req.body;
        const userId = req.user.id;

        const lead = await Lead.findOneAndUpdate(
            { _id: id, companyId: req.user.companyId },
            { 
                status: status || 'contacted',
                nextFollowUpDate: nextFollowUpDate || null,
                $push: { 
                    activityLog: { 
                        note: `Post-Call Feedback - [Status: ${status}] - Remark: ${remark}`,
                        userId 
                    } 
                }
            },
            { new: true }
        );

        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        res.json({ success: true, message: 'Feedback saved successfully', lead });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.bulkDeleteLeads = async (req, res) => {
    try {
        const { leadIds } = req.body;
        if (!leadIds || !Array.isArray(leadIds)) return res.status(400).json({ success: false, message: 'No lead IDs provided' });
        await Lead.deleteMany({ _id: { $in: leadIds }, companyId: req.user.companyId });
        res.json({ success: true, message: `${leadIds.length} leads deleted` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting leads', error: error.message });
    }
};
