const Razorpay = require('razorpay');
const crypto = require('crypto');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const Company = require('../models/Company');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = async (req, res) => {
    try {
        const { planId } = req.body;
        const plan = await Plan.findById(planId);
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

        if (plan.type === 'free') {
            return res.status(400).json({ success: false, message: 'Use activateFreePlan for free plans' });
        }

        const options = {
            amount: plan.price * 100, // amount in the smallest currency unit (paise)
            currency: "INR",
            receipt: `receipt_plan_${planId}_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);
        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating Razorpay order', error: error.message });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature,
            planId,
            companyId 
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            const plan = await Plan.findById(planId);
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

            // Create Subscription record
            await Subscription.create({
                companyId,
                planId,
                startDate: new Date(),
                expiryDate,
                amountPaid: plan.price,
                paymentId: razorpay_payment_id,
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                status: 'active'
            });

            // Update Company
            await Company.findByIdAndUpdate(companyId, {
                planId,
                isActive: true,
                expiryDate
            });

            res.json({ success: true, message: "Payment verified successfully" });
        } else {
            res.status(400).json({ success: false, message: "Invalid signature" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error verifying payment', error: error.message });
    }
};

exports.activateFreePlan = async (req, res) => {
    try {
        const { planId, companyId } = req.body;
        const company = await Company.findById(companyId);
        if (company.isFreeUsed) {
            return res.status(400).json({ success: false, message: 'Free plan already used' });
        }

        const plan = await Plan.findById(planId);
        if (plan.type !== 'free') {
            return res.status(400).json({ success: false, message: 'Not a free plan' });
        }

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

        await Subscription.create({
            companyId,
            planId,
            startDate: new Date(),
            expiryDate,
            amountPaid: 0,
            status: 'active'
        });

        await Company.findByIdAndUpdate(companyId, {
            planId,
            isActive: true,
            isFreeUsed: true,
            expiryDate
        });

        res.json({ success: true, message: 'Free plan activated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error activating free plan', error: error.message });
    }
};

exports.getSubscriptionStatus = async (req, res) => {
    try {
        const { companyId } = req.params;
        const company = await Company.findById(companyId).populate('planId');
        if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

        const now = new Date();
        const remainingDays = company.expiryDate ? Math.ceil((new Date(company.expiryDate) - now) / (1000 * 60 * 60 * 24)) : 0;

        res.json({ 
            success: true, 
            subscription: {
                plan: company.planId,
                expiryDate: company.expiryDate,
                remainingDays: remainingDays > 0 ? remainingDays : 0,
                isExpired: remainingDays <= 0,
                isFreeUsed: company.isFreeUsed
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching subscription status', error: error.message });
    }
};
