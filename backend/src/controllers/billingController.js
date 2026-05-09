const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Account = require('../models/Account');
const Deal = require('../models/Deal');
const Project = require('../models/Project');
const Company = require('../models/Company');
const { emitToCompany } = require('../services/socketService');
const { sendInvoiceEmail } = require('../services/emailService');

// Get all invoices for a company
exports.getInvoices = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { status, clientId } = req.query;

        let query = { companyId };
        if (status) query.status = status;
        if (clientId) query.clientId = clientId;

        const invoices = await Invoice.find(query)
            .populate('clientId', 'name email')
            .populate('dealId', 'name amount')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        res.json({ success: true, invoices });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching invoices', error: error.message });
    }
};

// Create a new invoice
exports.createInvoice = async (req, res) => {
    try {
        const { 
            clientId, dealId, projectId, dueDate, items, 
            subTotal, taxTotal, discount, grandTotal, notes, terms, currency 
        } = req.body;
        const { companyId, id: userId } = req.user;

        // Auto-generate Invoice Number: INV-YYYY-XXXX
        const year = new Date().getFullYear();
        const count = await Invoice.countDocuments({ companyId, createdAt: { $gte: new Date(year, 0, 1) } });
        const invoiceNumber = `INV-${year}-${(count + 1).toString().padStart(4, '0')}`;

        const invoice = await Invoice.create({
            companyId,
            clientId,
            dealId,
            projectId,
            invoiceNumber,
            dueDate,
            items,
            subTotal,
            taxTotal,
            discount,
            grandTotal,
            notes,
            terms,
            currency: currency || 'INR',
            createdBy: userId,
            activityLog: [{ action: 'Invoice Created', userId }]
        });

        const populatedInvoice = await Invoice.findById(invoice._id)
            .populate('clientId', 'name email')
            .populate('dealId', 'name');

        emitToCompany(companyId, 'invoiceCreated', populatedInvoice);

        // --- Trigger Auto-Email to Client ---
        try {
            if (populatedInvoice.clientId?.email) {
                const company = await Company.findById(companyId);
                await sendInvoiceEmail(populatedInvoice.clientId.email, populatedInvoice, company?.name || 'Our Company');
            }
        } catch (mailError) {
            console.error('Failed to send invoice email:', mailError);
            // We don't block the response even if email fails
        }

        res.status(201).json({ success: true, message: 'Invoice created successfully', invoice: populatedInvoice });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating invoice', error: error.message });
    }
};

// Get single invoice
exports.getInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId } = req.user;

        const invoice = await Invoice.findOne({ _id: id, companyId })
            .populate('clientId')
            .populate('dealId')
            .populate('projectId')
            .populate('createdBy', 'name')
            .populate('activityLog.userId', 'name');

        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

        const payments = await Payment.find({ invoiceId: id }).populate('receivedBy', 'name');

        res.json({ success: true, invoice, payments });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching invoice details', error: error.message });
    }
};

// Add payment to invoice
exports.addPayment = async (req, res) => {
    try {
        const { invoiceId, amount, method, transactionId, notes, date } = req.body;
        const { companyId, id: userId } = req.user;

        const invoice = await Invoice.findOne({ _id: invoiceId, companyId });
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

        const payment = await Payment.create({
            companyId,
            invoiceId,
            amount,
            method,
            transactionId,
            notes,
            date: date || Date.now(),
            receivedBy: userId
        });

        // Update Invoice Status
        const allPayments = await Payment.find({ invoiceId });
        const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

        if (totalPaid >= invoice.grandTotal) {
            invoice.status = 'paid';
        } else if (totalPaid > 0) {
            invoice.status = 'partially-paid';
        }

        invoice.activityLog.push({ action: `Payment of ${amount} received via ${method}`, userId });
        await invoice.save();

        emitToCompany(companyId, 'paymentReceived', { invoiceId, payment, status: invoice.status });

        res.status(201).json({ success: true, message: 'Payment recorded successfully', payment, status: invoice.status });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error recording payment', error: error.message });
    }
};

// Get Billing Stats
exports.getBillingStats = async (req, res) => {
    try {
        const { companyId } = req.user;

        const invoices = await Invoice.find({ companyId });
        
        const stats = {
            totalRevenue: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.grandTotal, 0),
            outstanding: invoices.filter(i => ['sent', 'partially-paid', 'overdue'].includes(i.status)).reduce((sum, i) => sum + i.grandTotal, 0),
            pendingCount: invoices.filter(i => i.status === 'sent').length,
            paidCount: invoices.filter(i => i.status === 'paid').length
        };

        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching stats', error: error.message });
    }
};
