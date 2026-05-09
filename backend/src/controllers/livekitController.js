const { AccessToken } = require('livekit-server-sdk');
const fs = require('fs');
const path = require('path');

const generateToken = async (req, res) => {
  try {
    const { roomName, participantName } = req.body;
    console.log('LiveKit Token Request Body:', req.body);
    
    if (!req.user) {
      console.error('LiveKit Error: req.user is missing');
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const userId = (req.user.id || req.user._id)?.toString();
    
    if (!userId) {
      console.error('LiveKit Error: User ID is missing in req.user', req.user);
      return res.status(400).json({ success: false, message: 'User ID missing' });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('LiveKit Error: API Key or Secret missing in environment variables');
      return res.status(500).json({ success: false, message: 'LiveKit configuration missing on server' });
    }

    const identity = userId.trim();
    const name = (participantName || 'User').trim();

    console.log(`Generating token for Room: ${roomName}, Identity: ${identity}, Name: ${name}`);

    const at = new AccessToken(apiKey, apiSecret, {
      identity: identity,
      name: name,
    });

    at.addGrant({ 
      roomJoin: true, 
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    console.log('Token generated successfully');

    res.json({ 
      success: true, 
      token,
      url: process.env.LIVEKIT_URL
    });
  } catch (error) {
    console.error('LiveKit Token Generation Exception:', error);
    try {
      const logPath = path.join(__dirname, '../../error_livekit.log');
      fs.appendFileSync(logPath, `${new Date().toISOString()} - ${error.name}: ${error.message}\n${error.stack}\n\n`);
    } catch (e) {
      console.error('Failed to write to error log:', e);
    }
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal Server Error during token generation' 
    });
  }
};

module.exports = {
  generateToken
};


