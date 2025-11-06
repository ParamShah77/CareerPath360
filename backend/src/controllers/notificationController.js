const Notification = require('../models/Notification');

// @desc    Get all notifications for user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { limit = 20, unreadOnly = false } = req.query;

    const query = { userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
      status: 'success',
      data: {
        notifications,
        unreadCount,
        total: notifications.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get unread count
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const count = await Notification.getUnreadCount(userId);

    res.json({
      status: 'success',
      data: { count }
    });
  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error getting unread count'
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    const notification = await Notification.findOne({ _id: id, userId });

    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    await notification.markAsRead();

    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
      status: 'success',
      message: 'Notification marked as read',
      data: {
        notification,
        unreadCount
      }
    });
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error marking notification as read'
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    await Notification.markAllAsRead(userId);

    res.json({
      status: 'success',
      message: 'All notifications marked as read',
      data: { unreadCount: 0 }
    });
  } catch (error) {
    console.error('❌ Error marking all as read:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error marking all as read'
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({ _id: id, userId });

    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
      status: 'success',
      message: 'Notification deleted',
      data: { unreadCount }
    });
  } catch (error) {
    console.error('❌ Error deleting notification:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting notification'
    });
  }
};

// @desc    Delete all read notifications
// @route   DELETE /api/notifications/clear-read
// @access  Private
exports.clearReadNotifications = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    const result = await Notification.deleteMany({ userId, read: true });

    res.json({
      status: 'success',
      message: `Deleted ${result.deletedCount} read notifications`,
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    console.error('❌ Error clearing read notifications:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error clearing notifications'
    });
  }
};

// Helper function to create notifications (used by other controllers)
exports.createNotification = async (userId, data) => {
  try {
    return await Notification.createNotification({
      userId,
      ...data
    });
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    return null;
  }
};
