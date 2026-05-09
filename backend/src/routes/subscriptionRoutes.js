const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create-order', protect, subscriptionController.createOrder);
router.post('/verify-payment', protect, subscriptionController.verifyPayment);
router.post('/activate-free', protect, subscriptionController.activateFreePlan);
router.get('/status/:companyId', protect, subscriptionController.getSubscriptionStatus);

module.exports = router;
