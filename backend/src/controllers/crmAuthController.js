const { OAuth2Client } = require('google-auth-library');
const Company = require('../models/Company');

const oauth2Client = new OAuth2Client(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
);

// Scopes required for sending emails and viewing profile
const SCOPES = [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.email'
];

exports.getGoogleAuthUrl = (req, res) => {
    try {
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline', // Critical for refresh token
            scope: SCOPES,
            prompt: 'consent' // Force consent to ensure refresh token is always returned
        });
        res.status(200).json({ url });
    } catch (error) {
        console.error('Auth URL Error:', error);
        res.status(500).json({ message: 'Failed to generate auth URL' });
    }
};

exports.googleCallback = async (req, res) => {
    const { code } = req.body;
    const companyId = req.user.companyId; 

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Get user info to store the email
        const ticket = await oauth2Client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.CLIENT_ID
        });
        const payload = ticket.getPayload();
        const email = payload.email;

        // Save to Company model
        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        company.googleEmailSettings = {
            connected: true,
            email: email,
            refreshToken: tokens.refresh_token || company.googleEmailSettings.refreshToken,
            accessToken: tokens.access_token,
            expiryDate: tokens.expiry_date
        };

        await company.save();

        res.status(200).json({ 
            message: 'Gmail connected successfully',
            email: email
        });
    } catch (error) {
        console.error('Google Callback Error:', error);
        res.status(500).json({ message: 'Authentication failed' });
    }
};

exports.getConnectionStatus = async (req, res) => {
    try {
        const company = await Company.findById(req.user.companyId);
        if (!company) return res.status(404).json({ message: 'Company not found' });

        res.json({
            connected: company.googleEmailSettings.connected,
            email: company.googleEmailSettings.email
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.disconnectGoogle = async (req, res) => {
    try {
        const company = await Company.findById(req.user.companyId);
        if (!company) return res.status(404).json({ message: 'Company not found' });

        company.googleEmailSettings = {
            connected: false,
            email: null,
            refreshToken: null,
            accessToken: null,
            expiryDate: null
        };

        await company.save();
        res.json({ message: 'Gmail disconnected successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const company = await Company.findById(req.user.companyId);
        if (!company || !company.googleEmailSettings.connected) {
            return res.status(400).json({ message: 'Gmail not connected' });
        }

        oauth2Client.setCredentials({
            refresh_token: company.googleEmailSettings.refreshToken
        });

        const { google } = require('googleapis');
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        const response = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 20
        });

        const messages = response.data.messages || [];
        const detailedMessages = await Promise.all(messages.map(async (msg) => {
            const detail = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
                format: 'metadata',
                metadataHeaders: ['Subject', 'From', 'Date']
            });
            return {
                id: msg.id,
                threadId: msg.threadId,
                subject: detail.data.payload.headers.find(h => h.name === 'Subject')?.value || 'No Subject',
                from: detail.data.payload.headers.find(h => h.name === 'From')?.value || 'Unknown',
                date: detail.data.payload.headers.find(h => h.name === 'Date')?.value || '',
                snippet: detail.data.snippet
            };
        }));

        res.json(detailedMessages);
    } catch (error) {
        console.error('Fetch Messages Error:', error);
        res.status(500).json({ message: 'Failed to fetch messages' });
    }
};

exports.getMessageDetails = async (req, res) => {
    try {
        const company = await Company.findById(req.user.companyId);
        if (!company || !company.googleEmailSettings.connected) {
            return res.status(400).json({ message: 'Gmail not connected' });
        }

        oauth2Client.setCredentials({
            refresh_token: company.googleEmailSettings.refreshToken
        });

        const { google } = require('googleapis');
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        const message = await gmail.users.messages.get({
            userId: 'me',
            id: req.params.id
        });

        res.json(message.data);
    } catch (error) {
        console.error('Fetch Message Detail Error:', error);
        res.status(500).json({ message: 'Failed to fetch message details' });
    }
};
