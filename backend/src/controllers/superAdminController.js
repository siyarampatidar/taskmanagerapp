const Plan = require('../models/Plan');
const Company = require('../models/Company');

// Plan Management
exports.createPlan = async (req, res) => {
    try {
        const { name, price, durationDays, maxUsers, features, type, billingCycle } = req.body;
        const plan = await Plan.create({ 
            name, 
            price, 
            durationDays, 
            maxUsers, 
            features, 
            type: type || 'paid', 
            billingCycle: billingCycle || 'none' 
        });
        res.status(201).json({ success: true, message: 'Plan created', plan });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating plan', error: error.message });
    }
};

exports.getPlans = async (req, res) => {
    try {
        const plans = await Plan.find();
        res.json({ success: true, plans });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching plans', error: error.message });
    }
};

exports.updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await Plan.findByIdAndUpdate(id, req.body, { new: true });
        res.json({ success: true, message: 'Plan updated', plan });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating plan', error: error.message });
    }
};

exports.deletePlan = async (req, res) => {
    try {
        const { id } = req.params;
        await Plan.findByIdAndDelete(id);
        res.json({ success: true, message: 'Plan deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting plan', error: error.message });
    }
};

// Company Monitoring
exports.getAllCompanies = async (req, res) => {
    try {
        const companies = await Company.find().populate('planId', 'name price');
        res.json({ success: true, companies });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching companies', error: error.message });
    }
};

exports.toggleCompanyStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const company = await Company.findById(id);
        if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
        
        company.isActive = !company.isActive;
        await company.save();
        
        res.json({ success: true, message: `Company status changed to ${company.isActive ? 'Active' : 'Suspended'}`, isActive: company.isActive });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error toggling company status', error: error.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        const companies = await Company.find().populate('planId');
        const plans = await Plan.find();
        
        const totalRevenue = companies.reduce((acc, c) => {
            if (c.isActive && c.planId) {
                return acc + (c.planId.price || 0);
            }
            return acc;
        }, 0);

        res.json({ 
            success: true, 
            stats: {
                totalRevenue,
                totalCompanies: companies.length,
                activeCompanies: companies.filter(c => c.isActive).length,
                totalPlans: plans.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching stats', error: error.message });
    }
};
