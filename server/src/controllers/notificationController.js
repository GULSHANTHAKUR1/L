import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * @desc    Get authenticated user's notifications (supports unreadOnly & pagination)
 * @route   GET /api/notifications
 * @access  Protected (Authenticated user receives own notifications only)
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const { unreadOnly, page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  // Strict ownership: Filter exclusively by the authenticated user's ID
  const filter = { recipientId: req.user._id };

  if (unreadOnly === 'true' || unreadOnly === true) {
    filter.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 }),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipientId: req.user._id, isRead: false }),
  ]);

  res.status(200).json({
    success: true,
    count: notifications.length,
    total,
    unreadCount,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    data: notifications,
  });
});

/**
 * @desc    Mark a single notification as read
 * @route   PATCH /api/notifications/:notificationId/read
 * @access  Protected (Recipient only)
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    return res.status(400).json({ success: false, message: 'Invalid notification ID format.' });
  }

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found.' });
  }

  // Ownership verification: Only the recipient can mark their notification as read
  if (notification.recipientId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You cannot modify notifications belonging to another user.',
    });
  }

  notification.isRead = true;
  await notification.save();

  const unreadCount = await Notification.countDocuments({
    recipientId: req.user._id,
    isRead: false,
  });

  res.status(200).json({
    success: true,
    message: 'Notification marked as read.',
    unreadCount,
    data: notification,
  });
});

/**
 * @desc    Mark all unread notifications as read for current user
 * @route   PATCH /api/notifications/read-all
 * @access  Protected
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipientId: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read.',
    updatedCount: result.modifiedCount,
    unreadCount: 0,
  });
});

/**
 * @desc    Delete a notification (Recipient only)
 * @route   DELETE /api/notifications/:notificationId
 * @access  Protected (Recipient only)
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    return res.status(400).json({ success: false, message: 'Invalid notification ID format.' });
  }

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found.' });
  }

  // Ownership verification
  if (notification.recipientId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You cannot delete notifications belonging to another user.',
    });
  }

  await notification.deleteOne();

  const unreadCount = await Notification.countDocuments({
    recipientId: req.user._id,
    isRead: false,
  });

  res.status(200).json({
    success: true,
    message: 'Notification deleted successfully.',
    unreadCount,
  });
});

export default {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
