const twilio = require('twilio');
const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_VIRTUAL_NUMBER;
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID; // New: User needs to create this in Twilio Console

// Use Account SID and Auth Token as API Key/Secret for simplicity in v1
// Ideally, use a dedicated API Key and Secret from Twilio Console
const apiKey = process.env.TWILIO_API_KEY || accountSid; 
const apiSecret = process.env.TWILIO_API_SECRET || authToken;

/**
 * Generate Access Token for a user to make outbound calls from the browser
 */
exports.generateToken = (identity) => {
    const accessToken = new AccessToken(accountSid, apiKey, apiSecret, { identity: identity });
    accessToken.addGrant(new VoiceGrant({
        outgoingApplicationSid: twimlAppSid,
        incomingAllow: true, // Allow incoming calls if needed
    }));
    return accessToken.toJwt();
};

/**
 * Generate TwiML for an outbound call
 * This is called by Twilio when the device initiates a call.
 */
exports.generateTwiML = (to) => {
    const response = new twilio.twiml.VoiceResponse();
    
    // Start Recording automatically if requested
    const dial = response.dial({
        callerId: twilioNumber,
        record: 'record-from-answer-dual', // Records both sides
        recordingStatusCallback: `${process.env.BACKEND_URL}/api/crm/call-webhook`, // We'll use the same webhook
    });

    // Check if the target is a phone number or a client (for internal calls)
    if (to && (to.startsWith('+') || /^\d+$/.test(to.replace(/[\s-]/g, '')))) {
        dial.number(to);
    } else if (to) {
        dial.client(to);
    } else {
        // Fallback or error handling
        response.say('Invalid destination.');
    }

    return response.toString();
};
