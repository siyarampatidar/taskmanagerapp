const User = require('../models/User');
const crypto = require('crypto');
const Company = require('../models/Company');
const Plan = require('../models/Plan');
const UserSession = require('../models/UserSession');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendPasswordResetEmail } = require('../services/emailService');

// 1. Company Registration (Owner only) -> Auto-creates Admin User
exports.registerCompany = async (req, res) => {
    try {
        let { companyName, ownerName, email, password } = req.body;
        email = email.toLowerCase();

        // Check if email already exists in users (globally, just to be safe for owner)
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'Email already in use' });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create Company
        const newCompany = await Company.create({
            name: companyName,
            isActive: false, // Inactive until plan purchased
            planId: null
        });

        // Create Admin User
        const adminUser = await User.create({
            name: ownerName,
            email,
            password: hashedPassword,
            role: 'admin',
            companyId: newCompany._id
        });

        // Link admin to company
        newCompany.adminId = adminUser._id;
        await newCompany.save();

        // Generate JWT
        const token = jwt.sign(
            { 
                id: adminUser._id, 
                role: adminUser.role, 
                companyId: newCompany._id, 
                departmentId: adminUser.departmentId,
                name: adminUser.name
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Company registered successfully. Please select a plan.',
            token,
            redirect: '/select-plan'
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// 2. Universal Login
exports.login = async (req, res) => {
    try {
        let { email, password } = req.body;
        email = email.toLowerCase();

        // Find user by email
        const user = await User.findOne({ email }).populate('companyId');
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        // SuperAdmin check
        if (user.role === 'superadmin') {
            const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
            return res.json({ 
                success: true, 
                message: 'SuperAdmin login', 
                token, 
                user: { id: user._id, name: user.name, role: user.role },
                redirect: '/dashboard/superadmin' 
            });
        }

        // Company Active check
        const company = user.companyId;
        if (!company) return res.status(400).json({ message: 'User not associated with any company' });

        // If company is inactive and user is admin, force plan selection
        if (!company.isActive && user.role === 'admin') {
            const token = jwt.sign(
                { id: user._id, role: user.role, companyId: company._id, departmentId: user.departmentId, name: user.name },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );
            return res.status(403).json({
                success: false,
                message: 'Company plan expired or not selected.',
                token,
                user: { id: user._id, name: user.name, role: user.role, companyId: company._id, companyActive: false },
                redirect: '/select-plan'
            });
        }

        // If company is inactive and user is normal employee
        if (!company.isActive && user.role !== 'admin') {
            return res.status(403).json({ message: 'Company subscription is inactive. Contact Admin.' });
        }

        // Normal successful login
        const token = jwt.sign(
            { id: user._id, role: user.role, companyId: company._id, departmentId: user.departmentId, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Create User Session
        await UserSession.create({
            userId: user._id,
            companyId: company._id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: { 
                id: user._id, 
                name: user.name, 
                role: user.role, 
                companyId: company._id, 
                companyActive: company.isActive,
                departmentId: user.departmentId 
            },
            redirect: '/dashboard'
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// 3. Purchase / Select Plan
exports.selectPlan = async (req, res) => {
    try {
        const { planId } = req.body;
        const companyId = req.user.companyId;
        
        // Basic check for existence
        const plan = await Plan.findById(planId);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });
        
        const company = await Company.findById(companyId);
        if (!company) return res.status(404).json({ message: 'Company not found' });

        // Rule: Free plan can only be used once
        if (plan.type === 'free' && company.isFreeUsed) {
            return res.status(400).json({ success: false, message: 'Free plan has already been used by your organization. Please choose a paid package to continue.' });
        }

        // Calculate Expiry Date
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

        company.planId = plan._id;
        company.isActive = true;
        company.expiryDate = expiryDate;
        
        if (plan.name.toLowerCase() === 'free') {
            company.isFreeUsed = true;
        }

        await company.save();

        res.json({ success: true, message: 'Plan activated successfully!', expiryDate, redirect: '/dashboard' });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const Invite = require('../models/Invite');
const { sendInviteEmail } = require('../services/emailService');

// 4. Invite/Add Employee (Admin/Manager only)
exports.inviteEmployee = async (req, res) => {
    try {
        let { email, role, departmentId, name, password } = req.body;
        email = email.toLowerCase();
        const { companyId } = req.user;

        // Sanitize departmentId: empty string should be null
        if (departmentId === "" || departmentId === "null") departmentId = null;

        // Check if user already exists
        const existingUser = await User.findOne({ email, companyId });
        if (existingUser) return res.status(400).json({ success: false, message: 'User already exists in this company' });

        if (password && name) {
            // Direct Creation Flow
            const hashedPassword = await bcrypt.hash(password, 10);
            await User.create({
                name,
                email,
                password: hashedPassword,
                role,
                companyId,
                departmentId
            });
            return res.json({ success: true, message: `Member ${name} added successfully` });
        }

        // Token-based Invitation Flow
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        await Invite.create({
            email,
            role,
            companyId,
            departmentId,
            token,
            expiresAt
        });

        const company = await Company.findById(companyId);
        await sendInviteEmail(email, token, company.name, role);

        res.json({ success: true, message: `Invitation sent to ${email}` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error adding/inviting member', error: error.message });
    }
};

// 5. Set Password (Accept Invite)
exports.setPassword = async (req, res) => {
    try {
        const { token, password, name } = req.body;

        const invite = await Invite.findOne({ token, isAccepted: false });
        if (!invite) return res.status(404).json({ success: false, message: 'Invalid or expired invitation token' });

        if (invite.expiresAt < new Date()) {
            return res.status(400).json({ success: false, message: 'Invitation has expired' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create User
        const newUser = await User.create({
            name,
            email: invite.email,
            password: hashedPassword,
            role: invite.role,
            companyId: invite.companyId,
            departmentId: invite.departmentId || null
        });

        // Mark invite as accepted
        invite.isAccepted = true;
        await invite.save();

        res.json({ success: true, message: 'Password set successfully. You can now login.' });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Error setting password', error: error.message });
    }
};

// 6. Get Current User (Self)
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password')
            .populate('companyId')
            .populate('departmentId', 'name')
            .populate('reportingTo', 'name');
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        res.json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// 7. Logout Activity Logging
exports.logout = async (req, res) => {
    try {
        // Find the most recent active session for this user
        const session = await UserSession.findOne({ 
            userId: req.user.id, 
            logoutTime: { $exists: false } 
        }).sort({ createdAt: -1 });

        if (session) {
            session.logoutTime = new Date();
            await session.save();
        }

        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Logout error', error: error.message });
    }
};

// 8. Get User Activity Report (Admin Only)
exports.getUserActivity = async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const sessions = await UserSession.find({ companyId: req.user.companyId })
            .populate('userId', 'name role')
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({ success: true, sessions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 9. Forgot Password
exports.forgotPassword = async (req, res) => {
    try {
        let { email } = req.body;
        email = email.toLowerCase();
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: 'User with this email not found' });

        // Create reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expires = Date.now() + 3600000; // 1 hour
        
        await User.updateOne(
            { _id: user._id },
            { $set: { resetPasswordToken: resetToken, resetPasswordExpires: expires } }
        );

        // Send actual email via emailService
        await sendPasswordResetEmail(user.email, resetToken, user.name);

        res.json({ success: true, message: 'Password reset link sent to your email.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error in forgot password', error: error.message });
    }
};

// 10. Reset Password
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ success: false, message: 'Token is invalid or has expired' });

        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ success: true, message: 'Password has been reset successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error resetting password', error: error.message });
    }
};
