const express = require('express');
const router = express.Router();
const { generateToken } = require('../controllers/livekitController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/token', authMiddleware, generateToken);
router.get('/test', (req, res) => res.json({ message: 'LiveKit routes working' }));

module.exports = router;

