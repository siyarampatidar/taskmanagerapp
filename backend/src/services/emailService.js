const nodemailer = require('nodemailer');
const Company = require('../models/Company');

const defaultTransporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: 587,
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

const sendEmail = async (to, subject, html, options = {}) => {
    try {
        const { fromName, replyTo, companyId } = options;
        let transporter = defaultTransporter;
        let fromEmail = process.env.MAIL_USER;

        // Check if company has OAuth2 connected
        if (companyId) {
            const company = await Company.findById(companyId);
            if (company && company.googleEmailSettings && company.googleEmailSettings.connected) {
                const { email, refreshToken } = company.googleEmailSettings;

                transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        type: 'OAuth2',
                        user: email,
                        clientId: process.env.CLIENT_ID,
                        clientSecret: process.env.CLIENT_SECRET,
                        refreshToken: refreshToken
                    }
                });
                fromEmail = email;
            }
        }

        const info = await transporter.sendMail({
            from: fromName
                ? `"${fromName}" <${fromEmail}>`
                : `"TeamFlow SaaS" <${fromEmail}>`,
            to,
            subject,
            replyTo: replyTo || fromEmail,
            html
        });
        return info;
    } catch (error) {
        console.error('Email Error:', error);
        throw error;
    }
};

const sendInviteEmail = async (email, inviteToken, companyName, role) => {
    const inviteLink = `${process.env.FRONTEND_URL}/set-password?token=${inviteToken}`;
    const html = `
        <h1>You're Invited to Join ${companyName}!</h1>
        <p>You have been invited as a <strong>${role}</strong>.</p>
        <p>Click the link below to set your password and join the team:</p>
        <a href="${inviteLink}" style="padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Join TeamFlow</a>
        <p>This link expires in 24 hours.</p>
    `;
    return sendEmail(email, `Invitation to join ${companyName} on TeamFlow`, html);
};

const sendSubscriptionAlert = async (email, companyName, daysLeft) => {
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="background-color: #FEE2E2; width: 64px; height: 64px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                    <span style="font-size: 32px;">⚠️</span>
                </div>
                <h1 style="color: #111827; font-size: 24px; font-weight: 800; margin: 0;">Action Required: Subscription Expiring</h1>
            </div>
            
            <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Hello <strong>${companyName}</strong> Admin,
            </p>
            
            <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 16px; margin-bottom: 24px; border-radius: 4px 8px 8px 4px;">
                <p style="color: #991B1B; font-size: 16px; margin: 0; font-weight: 600;">
                    Your workspace subscription will expire in exactly <span style="font-size: 18px; text-decoration: underline;">${daysLeft} day(s)</span>.
                </p>
            </div>

            <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                To ensure your team doesn't lose access to their projects, tasks, and communications, please renew your subscription before it expires.
            </p>
            
            <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/dashboard/billing" style="display: inline-block; padding: 14px 32px; background-color: #EF4444; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em; transition: background-color 0.2s;">
                    Renew Subscription Now
                </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0;">
            <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin: 0;">
                This is an automated message from your TeamFlow Workspace.<br>If you have already renewed, please ignore this email.
            </p>
        </div>
    `;
    return sendEmail(email, `URGENT: Subscription Expiry Warning for ${companyName}`, html);
};

const sendLeadWelcomeEmail = async (email, leadName, companyName) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #2563eb;">Hello ${leadName},</h2>
            <p>Thank you for reaching out to <strong>${companyName}</strong>.</p>
            <p>We have received your inquiry and our team is already reviewing your requirements. One of our representatives will contact you shortly.</p>
            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;">
            <p style="font-size: 12px; color: #64748b;">This is an automated acknowledgment from our CRM system.</p>
        </div>
    `;
    return sendEmail(email, `Thank you for your inquiry — ${companyName}`, html);
};

const sendReminderEmail = async (email, leadName, companyName) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #2563eb;">Hello ${leadName},</h2>
            <p>Thank you for reaching out to <strong>${companyName}</strong>.</p>
            <p>We have received your inquiry and our team is already reviewing your requirements. One of our representatives will contact you shortly.</p>
            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;">
            <p style="font-size: 12px; color: #64748b;">This is an automated acknowledgment from our CRM system.</p>
        </div>
    `;
    return sendEmail(email, `Thank you for your inquiry — ${companyName}`, html);
};

const sendPasswordResetEmail = async (email, resetToken, userName = 'User') => {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc;">
            <div style="background-color: #ffffff; padding: 40px; border-radius: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #f1f5f9;">
                
                <h2 style="color: #0f172a; font-size: 24px; font-weight: 800; margin-bottom: 8px;">Reset your password</h2>
                <p style="color: #64748b; font-size: 16px; margin-bottom: 32px;">Hello ${userName}, we received a request to reset your password.</p>
                
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${resetLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.39);">Reset Password</a>
                </div>
                
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
                    <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="color: #4f46e5; font-size: 14px; word-break: break-all; margin: 8px 0 0 0;">${resetLink}</p>
                </div>

                <hr style="border: none; border-top: 2px dashed #f1f5f9; margin: 32px 0;">
                
                <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0;">
                    If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.<br>
                    This link will expire in 1 hour.
                </p>
            </div>
        </div>
    `;
    return sendEmail(email, `Password Reset Request - TeamFlow`, html);
};

const sendInvoiceEmail = async (email, invoice, companyName) => {
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 24px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <div style="background-color: #EFF6FF; width: 64px; height: 64px; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                    <span style="font-size: 32px;">📄</span>
                </div>
                <h1 style="color: #111827; font-size: 24px; font-weight: 800; margin: 0;">New Invoice from ${companyName}</h1>
                <p style="color: #6B7280; font-size: 14px; margin-top: 8px;">Invoice Number: <strong>${invoice.invoiceNumber}</strong></p>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Hello, <br><br>
                We have generated a new invoice for your recent services. Please find the details below:
            </p>
            
            <div style="background-color: #F9FAFB; border-radius: 16px; padding: 24px; margin-bottom: 32px; border: 1px solid #F3F4F6;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #E5E7EB; padding-bottom: 12px;">
                    <span style="color: #6B7280; font-size: 14px; font-weight: 600; text-transform: uppercase;">Amount Due:</span>
                    <span style="color: #111827; font-size: 18px; font-weight: 800;">INR ${invoice.grandTotal.toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #6B7280; font-size: 14px; font-weight: 600; text-transform: uppercase;">Due Date:</span>
                    <span style="color: #111827; font-size: 14px; font-weight: 700;">${new Date(invoice.dueDate).toLocaleDateString()}</span>
                </div>
            </div>

            <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-bottom: 32px;">
                You can view and download your full invoice by logging into our portal or via the link provided.
            </p>
            
            <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/dashboard/billing" style="display: inline-block; padding: 14px 32px; background-color: #2563EB; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                    View Invoice Portal
                </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 40px 0;">
            <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin: 0;">
                Sent with ❤️ from <strong>${companyName}</strong> via TeamFlow CRM.
            </p>
        </div>
    `;
    return sendEmail(email, `New Invoice ${invoice.invoiceNumber} from ${companyName}`, html);
};

module.exports = {
    sendEmail,
    sendInviteEmail,
    sendSubscriptionAlert,
    sendLeadWelcomeEmail,
    sendPasswordResetEmail,
    sendInvoiceEmail
};
