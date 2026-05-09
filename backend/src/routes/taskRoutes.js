const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');
const planGuard = require('../middleware/planGuard');
const { upload } = require('../middleware/upload');

router.use(authMiddleware);
router.use(planGuard);

router.post('/', upload.array('attachments', 5), taskController.createTask);
router.get('/', taskController.getTasks);
router.get('/archived', taskController.getArchivedTasks);
router.patch('/:id/restore', taskController.restoreTask);
router.delete('/:id', taskController.deleteTask);
router.patch('/:id/status', taskController.updateTaskStatus);
router.patch('/:id/accept', taskController.acceptTask);
router.patch('/:id/reject', taskController.rejectTask);
router.post('/:id/comments', taskController.addComment);
router.patch('/:id/subtasks/:subTaskId', taskController.updateSubTask);
router.post('/:id/transfer-dept', taskController.transferTaskToDepartment);
router.post('/:id/approve-state', taskController.approveTaskState);
router.post('/:id/attachments', upload.array('attachments', 5), taskController.addTaskAttachment);
router.put('/reassign/:id', taskController.updateTaskAssignee);

module.exports = router;
