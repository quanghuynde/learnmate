const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createSystemNotification,
  createSystemEventNotification,
} = require('../controllers/notificationController');

router.use(protect);
router.get('/', getNotifications);
router.post('/system', createSystemNotification);
router.post('/system-event', createSystemEventNotification);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

module.exports = router;
