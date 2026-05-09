const express = require('express');
const router = express.Router();
const crmAuthController = require('../controllers/crmAuthController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/google/url', crmAuthController.getGoogleAuthUrl);
router.post('/google/callback', crmAuthController.googleCallback);
router.get('/google/status', crmAuthController.getConnectionStatus);
router.delete('/google/disconnect', crmAuthController.disconnectGoogle);
router.get('/google/messages', crmAuthController.getMessages);
router.get('/google/messages/:id', crmAuthController.getMessageDetails);

module.exports = router;
