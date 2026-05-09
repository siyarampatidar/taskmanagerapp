const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All routes here require SuperAdmin role
router.use(authMiddleware);
// Routes accessible by both Admin and SuperAdmin
router.get('/plans', roleMiddleware(['admin', 'superadmin']), superAdminController.getPlans);

// Restricted SuperAdmin management routes
router.use(roleMiddleware(['superadmin']));

router.post('/plans', superAdminController.createPlan);
router.patch('/plans/:id', superAdminController.updatePlan);
router.delete('/plans/:id', superAdminController.deletePlan);

router.get('/companies', superAdminController.getAllCompanies);
router.patch('/companies/:id/toggle-status', superAdminController.toggleCompanyStatus);
router.get('/stats', superAdminController.getStats);

module.exports = router;
