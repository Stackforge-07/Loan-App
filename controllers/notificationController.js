const Notification = require('../models/Notification');

// POST /notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.user._id },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to mark notification as read.' });
  }
};

// POST /notifications/mark-all-read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.session.user._id, isRead: false },
      { isRead: true }
    );
    const referer = req.get('referer') || '/';
    res.redirect(referer);
  } catch (error) {
    req.session.error = 'Failed to mark notifications as read.';
    res.redirect('back');
  }
};

// GET /notifications/count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.session.user._id,
      isRead: false
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ count: 0 });
  }
};
