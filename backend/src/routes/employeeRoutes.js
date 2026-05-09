const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const planGuard = require('../middleware/planGuard');

router.use(authMiddleware);
router.use(planGuard);

// Get employees - scoped by role in controller
router.get('/', userController.getAllEmployees);

// Role management & status
router.patch('/:id/role', roleMiddleware(['admin', 'manager']), userController.changeUserRole);
router.patch('/:id/toggle-status', roleMiddleware(['admin']), userController.toggleUserStatus);
router.delete('/:id', roleMiddleware(['admin']), userController.deleteUser);

// Profile & Management
router.put('/profile', userController.updateProfile);
router.put('/change-password', userController.changePassword);
router.put('/:id', roleMiddleware(['admin', 'manager', 'hr']), userController.updateUser);

module.exports = router;
