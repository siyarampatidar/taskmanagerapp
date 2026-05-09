const express = require('express');
const router = express.Router();
const crmController = require('../controllers/crmController');
const authMiddleware = require('../middleware/authMiddleware');
const planGuard = require('../middleware/planGuard');
const { upload, memoryUpload } = require('../middleware/upload');
const crmAuthRoutes = require('./crmAuthRoutes');

router.use('/auth', crmAuthRoutes);

// Public Webhook Route for External Integrations
router.post('/webhook/lead-capture', crmController.captureExternalLead);
router.post('/call-webhook', crmController.handleCallWebhook);
router.post('/voice/twiml', crmController.handleTwilioTwiML);
router.get('/voice/token', authMiddleware, crmController.getTwilioToken);

router.use(authMiddleware);
router.use(planGuard);

router.get('/config', crmController.getCRMConfig);
router.post('/leads', crmController.createLead);
router.get('/leads', crmController.getLeads);
router.get('/leads/archived', crmController.getArchivedLeads);
router.post('/leads/import', crmController.importLeads);
router.post('/leads/bulk-delete', crmController.bulkDeleteLeads);
router.put('/leads/move-to-pipeline', crmController.moveToPipeline);
router.post('/leads/:id/convert', crmController.convertLead);
router.put('/leads/:id/checklist', crmController.updateLeadChecklist);
router.patch('/leads/:id/archive', crmController.archiveLead);
router.patch('/leads/:id/restore', crmController.restoreLead);
router.put('/leads/:id', crmController.updateLead);

// General CRM Utils
router.post('/send-email', crmController.sendBulkCrmEmail);

// Modular Modules - Accounts
router.get('/accounts', crmController.getAccounts);
router.post('/accounts', crmController.createAccount);
router.put('/accounts/:id', crmController.updateAccount);
router.delete('/accounts/:id', crmController.deleteAccount);

// Modular Modules - Contacts
router.get('/contacts', crmController.getContacts);
router.post('/contacts', crmController.createContact);
router.put('/contacts/:id', crmController.updateContact);
router.delete('/contacts/:id', crmController.deleteContact);

// CRM Dashboard Analytics
router.get('/analytics', crmController.getAnalytics);

// Modular Modules - Deals
router.get('/deals', crmController.getDeals);
router.get('/deals/archived', crmController.getArchivedDeals);
router.patch('/deals/:id/restore', crmController.restoreDeal);
router.post('/deals', crmController.createDeal);
router.put('/deals/:id', crmController.updateDeal);
router.delete('/deals/:id', crmController.deleteDeal);
router.put('/deals/:id/stage', crmController.updateDealStage);
router.put('/deals/:id/assign', crmController.assignDeal);
router.post('/deals/:id/notes', crmController.addDealNote);
router.post('/deals/:id/documents', upload.array('files'), crmController.uploadDealDocument);
router.put('/deals/:id/followup', crmController.setDealFollowUp);

router.delete('/leads/:id', crmController.deleteLead);
router.put('/:id/status', authMiddleware, crmController.updateLeadStatus);
router.put('/:id/followup', authMiddleware, crmController.scheduleFollowUp);
router.post('/:id/transfer', authMiddleware, crmController.transferLead);
router.post('/leads/:id/request-approval', crmController.requestLeadApproval);
router.post('/leads/:id/approve', crmController.approveLead);

// Modular Modules - Documents
router.get('/documents', crmController.getDocuments);
router.post('/documents', upload.single('file'), crmController.createDocument);
router.post('/leads/:id/call', crmController.initiateCall);
router.patch('/leads/:id/remark', crmController.updateQuickRemark);
router.delete('/documents/:id', crmController.deleteDocument);

router.get('/call-history', crmController.getCallHistory);
router.post('/leads/:id/post-call', authMiddleware, crmController.submitPostCallFeedback);

module.exports = router;
