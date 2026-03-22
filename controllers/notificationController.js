import asyncHandler from "express-async-handler";
import Notification from "../models/Notification.js";

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get current user's notifications
// @route   GET /api/notifications
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
export const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const unreadCount = await Notification.countDocuments({
    userId: req.user._id,
    isRead: false,
  });

  res.json({ notifications, unreadCount });
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Mark a single notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }

  res.json({ notification });
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true }
  );

  res.json({ message: "All notifications marked as read" });
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
export const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  res.json({ message: "Notification deleted successfully" });
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get unread notification count (for polling)
// @route   GET /api/notifications/unread-count
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
export const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    userId: req.user._id,
    isRead: false,
  });
  res.json({ unreadCount });
});