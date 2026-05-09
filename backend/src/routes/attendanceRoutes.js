const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/check-in', attendanceController.checkIn);
router.post('/check-out', attendanceController.checkOut);
router.get('/', attendanceController.getAttendance);
router.patch('/:id/status', attendanceController.updateStatus);
router.post('/manual', attendanceController.manualUpdate);
router.get('/salary-report', attendanceController.getSalaryReport);

module.exports = router;
