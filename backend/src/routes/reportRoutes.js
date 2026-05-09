const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
console.log('Report Controller Exports:', Object.keys(reportController));
const authMiddleware = require('../middleware/authMiddleware');
const planGuard = require('../middleware/planGuard');
const { upload } = require('../middleware/upload');

router.use(authMiddleware);
router.use(planGuard);

router.get('/dashboard', reportController.getDashboardStats);

// Daily Reports
router.get('/ping', (req, res) => res.json({ message: 'Report route is alive' }));
router.post('/react/:id', reportController.addReaction);
router.get('/daily/export', reportController.exportDailyReports);
router.post('/daily', upload.array('attachments', 3), reportController.submitDailyReport);
router.get('/daily', reportController.getDailyReports);
router.put('/daily/:id', upload.array('attachments', 3), reportController.updateDailyReport);
router.delete('/daily/:id', reportController.deleteDailyReport);

module.exports = router;
