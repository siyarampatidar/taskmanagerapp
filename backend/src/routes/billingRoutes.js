const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const protect = require('../middleware/authMiddleware');

router.use(protect);

router.get('/invoices', billingController.getInvoices);
router.post('/invoices', billingController.createInvoice);
router.get('/invoices/:id', billingController.getInvoiceById);
router.post('/payments', billingController.addPayment);
router.get('/stats', billingController.getBillingStats);

module.exports = router;
