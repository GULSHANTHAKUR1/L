import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// List current user's notifications (supports unreadOnly & pagination)
router.get('/', protect, getNotifications);

// Mark all unread notifications as read
router.patch('/read-all', protect, markAllAsRead);

// Mark single notification as read
router.patch('/:notificationId/read', protect, markAsRead);

// Delete single notification (Recipient only)
router.delete('/:notificationId', protect, deleteNotification);

export default router;
