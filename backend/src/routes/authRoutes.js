const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.post('/register', authController.registerCompany);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getMe);

// 3. Plan & Invitations
router.post('/select-plan', authMiddleware, roleMiddleware(['admin']), authController.selectPlan);
router.post("/invite-employee", authMiddleware, roleMiddleware(["admin"]), authController.inviteEmployee);

// 4. Auth & Session Management
router.post('/logout', authMiddleware, authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
router.get('/user-activity', authMiddleware, roleMiddleware(['admin']), authController.getUserActivity);

module.exports = router;
