const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { isAuthenticated } = require('../middleware/auth');

router.use(isAuthenticated);

router.post('/:id/read', notificationController.markAsRead);
router.post('/mark-all-read', notificationController.markAllAsRead);
router.get('/count', notificationController.getUnreadCount);

module.exports = router;
