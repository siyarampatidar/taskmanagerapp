const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const planGuard = require('../middleware/planGuard');

router.use(authMiddleware);
router.use(planGuard);

// Only Admin/Manager/HR can create/delete/update departments
router.post('/', roleMiddleware(['admin', 'manager', 'hr']), departmentController.createDepartment);
router.put('/:id', roleMiddleware(['admin', 'manager', 'hr']), departmentController.updateDepartment);
router.delete('/:id', roleMiddleware(['admin', 'hr']), departmentController.deleteDepartment);
router.patch('/crm-settings', roleMiddleware(['admin', 'manager', 'hr']), departmentController.updateCrmSettings);

// All company employees can GET departments
router.get('/', departmentController.getDepartments);

module.exports = router;
