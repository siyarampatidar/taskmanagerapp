const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', companyController.getCompanyDetails);
router.patch('/', roleMiddleware(['admin']), companyController.updateCompanyDetails);
router.patch('/location', roleMiddleware(['admin']), companyController.updateOfficeLocation);

module.exports = router;
