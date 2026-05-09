const User = require('../models/User');
const Department = require('../models/Department');

// 1. Get All Employees for a Company (Role-scoped)
exports.getAllEmployees = async (req, res) => {
    try {
        const { companyId, role, id } = req.user;
        let query = { companyId, role: { $ne: 'superadmin' } };

        // Hierarchy Scoping - Allow all management/specialized roles to see everyone for collaboration
        if (['admin', 'manager', 'hr', 'sales', 'marketing', 'teamhead'].includes(role)) {
            // These roles see all employees in the company
            // No strict filtering by department or reporting here to avoid 'hidden' data
        } else if (role === 'teamhead') {
            // Team Head sees employees who report to them OR themselves
            query.$or = [{ reportingTo: id }, { _id: id }];
        } else {
            // Standard employees only see themselves in the list (if we want to restrict)
            // But usually in HRM, everyone see everyone's basic info. 
            // For now, let's keep it open for company members unless it's a privacy concern.
        }

        const employees = await User.find(query)
            .select('-password')
            .populate('departmentId', 'name')
            .populate('reportingTo', 'name');
            
        res.json({ success: true, employees });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching employees', error: error.message });
    }
};

// 2. Promote/Demote Role (Admin/Manager)
exports.changeUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const { companyId } = req.user;

        if (!['employee', 'teamhead', 'manager', 'hr', 'sales', 'marketing'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        const user = await User.findOneAndUpdate(
            { _id: id, companyId },
            { role },
            { new: true }
        );

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        res.json({ success: true, message: `User role updated to ${role}`, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating role', error: error.message });
    }
};

// 3. Terminate Employee (Admin only)
exports.toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId } = req.user;

        const user = await User.findOne({ _id: id, companyId });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        user.isActive = !user.isActive;
        await user.save();

        res.json({ success: true, message: `User status changed to ${user.isActive ? 'Active' : 'Terminated'}`, isActive: user.isActive });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error toggling user status', error: error.message });
    }
};

// 4. Update Profile (Self)
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, designation, phone, gender, image } = req.body;

        const user = await User.findByIdAndUpdate(userId, 
            { name, designation, phone, gender, image }, 
            { new: true }
        ).select('-password');
        
        res.json({ success: true, message: 'Profile updated', user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating profile', error: error.message });
    }
};

// 4b. Change Password (Self)
const bcrypt = require('bcryptjs');
exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Old password does not match' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error changing password', error: error.message });
    }
};

// 5. Update Employee (Admin only)
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        let { name, email, role, designation, departmentId, reportingTo, salary, phone, gender } = req.body;
        const { companyId } = req.user;

        // Sanitize departmentId
        if (departmentId === "" || departmentId === "null") departmentId = null;
        if (reportingTo === "" || reportingTo === "null") reportingTo = null;

        const user = await User.findOneAndUpdate(
            { _id: id, companyId },
            { name, email, role, designation, departmentId, reportingTo, salary, phone, gender },
            { new: true }
        ).populate('departmentId', 'name').populate('reportingTo', 'name').select('-password');

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        res.json({ success: true, message: 'User updated successfully', user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating user', error: error.message });
    }
};
// 5. Delete Employee (Admin only)
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId } = req.user;

        const user = await User.findOneAndDelete({ _id: id, companyId });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting user', error: error.message });
    }
};
