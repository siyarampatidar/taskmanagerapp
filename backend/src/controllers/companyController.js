const Company = require('../models/Company');

exports.updateOfficeLocation = async (req, res) => {
    try {
        const { lat, lng, allowedRadius } = req.body;
        const { companyId, role } = req.user;

        if (role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only admin can set office location' });
        }

        const company = await Company.findByIdAndUpdate(
            companyId,
            { 
                officeLocation: { lat, lng },
                allowedRadius: allowedRadius || 200
            },
            { new: true }
        );

        res.json({ success: true, message: 'Office location updated', company });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating location', error: error.message });
    }
};

exports.getCompanyDetails = async (req, res) => {
    try {
        const { companyId } = req.user;
        const company = await Company.findById(companyId).populate('planId');
        res.json({ success: true, company });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching company', error: error.message });
    }
};

exports.updateCompanyDetails = async (req, res) => {
    try {
        const { name, companyEmail, gstNumber, website, address } = req.body;
        const { companyId, role } = req.user;

        if (role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only admin can update company details' });
        }

        const company = await Company.findByIdAndUpdate(
            companyId,
            { name, companyEmail, gstNumber, website, address },
            { new: true }
        );

        res.json({ success: true, message: 'Company details updated', company });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating company details', error: error.message });
    }
};
