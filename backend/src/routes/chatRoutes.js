const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');
const planGuard = require('../middleware/planGuard');
const { upload } = require('../middleware/upload');

router.use(authMiddleware);
router.use(planGuard);

router.get('/channels', chatController.getChannels);
router.post('/channels', chatController.createChannel);
router.get('/messages/:channelId', chatController.getMessages);
router.post('/messages', chatController.sendMessageRest); // REST fallback for messages
router.post('/direct', chatController.createDirectMessage);
router.put('/mark-read/:channelId', chatController.markAsRead);

// Advanced features
router.post('/upload', upload.single('file'), chatController.uploadFile);
router.post('/broadcast', chatController.broadcastMessage);
router.post('/react/:messageId', chatController.reactToMessage);
router.post('/invite/:channelId', chatController.inviteToChannel);

module.exports = router;
