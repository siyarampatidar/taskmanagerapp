const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/apply', leaveController.applyLeave);
router.get('/', leaveController.getLeaves);
router.get('/pending', leaveController.getPendingLeaves);
router.patch('/:id/process', authorize('admin', 'hr', 'manager', 'teamhead'), leaveController.processLeave);

module.exports = router;
