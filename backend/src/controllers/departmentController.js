const Company = require('../models/Company');
const Department = require('../models/Department');

// Get all departments for the logged-in user's company
exports.getDepartments = async (req, res) => {
    try {
        const departments = await Department.find({ companyId: req.user.companyId }).populate('managerId', 'name email');
        res.json({ success: true, departments });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching departments', error: error.message });
    }
};

// Create a new department (Admin only)
exports.createDepartment = async (req, res) => {
    try {
        const { name, crmAccessLevel } = req.body;
        
        const existingDept = await Department.findOne({ name, companyId: req.user.companyId });
        if (existingDept) return res.status(400).json({ success: false, message: 'Department already exists' });

        const dept = await Department.create({
            name,
            companyId: req.user.companyId,
            crmAccessLevel: crmAccessLevel || 'none'
        });

        res.status(201).json({ success: true, message: 'Department created successfully', department: dept });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating department', error: error.message });
    }
};

// Update department (e.g., assign manager, change CRM access)
exports.updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, managerId, crmAccessLevel } = req.body;

        const dept = await Department.findOneAndUpdate(
            { _id: id, companyId: req.user.companyId },
            { name, managerId, crmAccessLevel },
            { new: true }
        );

        if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
        
        res.json({ success: true, message: 'Department updated', department: dept });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating department', error: error.message });
    }
};

// Delete department
exports.deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const dept = await Department.findOneAndDelete({ _id: id, companyId: req.user.companyId });
        
        if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
        
        res.json({ success: true, message: 'Department deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting department', error: error.message });
    }
};

// Update CRM Settings for Company (Admin)
exports.updateCrmSettings = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { crmDeptSettings } = req.body;
        
        const company = await Company.findByIdAndUpdate(companyId, { crmDeptSettings }, { new: true });
        res.json({ success: true, message: 'CRM settings updated', crmDeptSettings: company.crmDeptSettings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating CRM settings', error: error.message });
    }
};
