const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { auth } = require('../middleware/auth');

// Get all notifications
router.get('/', auth, notificationController.getNotifications);

// Get unread count
router.get('/unread-count', auth, notificationController.getUnreadCount);

// Mark all as read
router.put('/read-all', auth, notificationController.markAllAsRead);

// Clear read notifications
router.delete('/clear-read', auth, notificationController.clearReadNotifications);

// Mark single notification as read
router.put('/:id/read', auth, notificationController.markAsRead);

// Delete single notification
router.delete('/:id', auth, notificationController.deleteNotification);

module.exports = router;
