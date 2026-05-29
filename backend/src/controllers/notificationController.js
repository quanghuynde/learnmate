const Notification = require('../models/Notification');
const { createUserNotification } = require('../services/notificationService');
const { buildSystemNotificationFromEvent } = require('../services/notificationTemplateService');

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(50);
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, isRead: false }, { isRead: true });
    res.json({ message: 'Đã đánh dấu tất cả là đã đọc' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSystemNotification = async (req, res) => {
  try {
    const { title, message, metadata } = req.body || {};
    if (!title || !message) {
      return res.status(400).json({ message: 'Thiếu tiêu đề hoặc nội dung thông báo' });
    }

    const notification = await createUserNotification(req.user.id, {
      title,
      message,
      type: 'system',
      metadata: metadata || {},
      sendMail: false,
    });

    res.status(201).json({ notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSystemEventNotification = async (req, res) => {
  try {
    const { event, data } = req.body || {};
    if (!event) {
      return res.status(400).json({ message: 'Thiếu mã sự kiện thông báo' });
    }

    const eventData = data || {};
    const payload = await buildSystemNotificationFromEvent(event, req.user.id, eventData);
    if (!payload) {
      return res.status(400).json({ message: 'Sự kiện thông báo không được hỗ trợ' });
    }

    // Guard: chỉ gửi khi điều kiện sự kiện thực sự xảy ra
    if (event === 'leaderboard_drop_top3') {
      const previousRank = Number(eventData.previousRank);
      const currentRank = Number(payload.metadata?.currentRank);
      const isDropOut = Number.isFinite(previousRank) && previousRank <= 3 && Number.isFinite(currentRank) && currentRank > 3;
      if (!isDropOut) {
        return res.status(200).json({ notification: null, skipped: true, reason: 'condition_not_met' });
      }

      const duplicate = await Notification.findOne({
        user: req.user.id,
        type: 'system',
        'metadata.event': event,
        'metadata.previousRank': previousRank,
        'metadata.currentRank': currentRank,
      }).lean();

      if (duplicate) {
        return res.status(200).json({ notification: null, skipped: true, reason: 'duplicate_event' });
      }
    }

    const notification = await createUserNotification(req.user.id, {
      title: payload.title,
      message: payload.message,
      type: 'system',
      metadata: payload.metadata || {},
      sendMail: false,
    });

    res.status(201).json({ notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createSystemNotification,
  createSystemEventNotification,
};
