import Report from "../models/Report.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import { createNotification } from "../utils/notificationHelper.js";

// ─────────────────────────────────────────────────────────────────────────
// @desc    Submit a report (buyer → seller or seller → buyer)
// @route   POST /api/reports
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
export const submitReport = async (req, res) => {
  try {
    const { reportedUserId, reason, description, orderId } = req.body;
    const reportedBy   = req.user._id;
    const reporterRole = req.user.role;

    if (reportedBy.toString() === reportedUserId) {
      return res.status(400).json({ message: "You cannot report yourself" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const isBuyerOfOrder  = order.buyerId.toString()  === reportedBy.toString();
    const isSellerOfOrder = order.sellerId.toString() === reportedBy.toString();

    if (!isBuyerOfOrder && !isSellerOfOrder) {
      return res.status(403).json({ message: "You are not a participant in this order" });
    }

    const isReportedUserInOrder =
      order.buyerId.toString()  === reportedUserId ||
      order.sellerId.toString() === reportedUserId;

    if (!isReportedUserInOrder) {
      return res.status(403).json({ message: "The reported user is not part of this order" });
    }

    const existing = await Report.findOne({
      reportedBy,
      reportedUser: reportedUserId,
      orderId,
    });
    if (existing) {
      return res.status(400).json({ message: "You have already submitted a report for this order" });
    }

    const report = await Report.create({
      reportedBy,
      reportedUser: reportedUserId,
      reporterRole,
      reason,
      description: description || "",
      orderId,
    });

    await createNotification({
      userId:  reportedUserId,
      title:   "A Report Has Been Filed Against You",
      message: "Someone has reported you. An admin will review the case.",
      type:    "report_submitted",
      link:    `/orders/${orderId}`,
    });

    res.status(201).json({
      message: "Report submitted successfully. An admin will review it.",
      report,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "You have already submitted a report for this order" });
    }
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get all reports
// @route   GET /api/reports
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────
export const getAllReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = status ? { status } : {};

    const total = await Report.countDocuments(filter);
    const reports = await Report.find(filter)
      .populate("reportedBy",   "name email role avatar")
      .populate("reportedUser", "name email role avatar")
      .populate("orderId",      "_id amount status")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      reports,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// @desc    Update report status (resolve or dismiss)
// @route   PATCH /api/reports/:id
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────
export const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    const report = await Report.findByIdAndUpdate(
      id,
      { status, adminNote: adminNote || "" },
      { new: true }
    )
      .populate("reportedBy",   "name email")
      .populate("reportedUser", "name email");

    if (!report) return res.status(404).json({ message: "Report not found" });

    if (status === "resolved" || status === "dismissed") {
      const title   = status === "resolved" ? "Your Report Has Been Resolved" : "Your Report Was Dismissed";
      const message = `Your report status has been updated to "${status}". Admin note: ${adminNote || "N/A"}`;

      await createNotification({
        userId:  report.reportedBy._id,
        title,
        message,
        type:    "report_resolved",
        link:    `/orders/${report.orderId}`,
      });
    }

    res.json({ message: "Report status updated successfully", report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// @desc    Delete a reported user and resolve all related reports
// @route   DELETE /api/reports/user/:userId
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────
export const deleteReportedUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") {
      return res.status(403).json({ message: "Admin accounts cannot be deleted" });
    }

    await User.findByIdAndDelete(userId);
    await Report.updateMany(
      { reportedUser: userId },
      { status: "resolved", adminNote: "User deleted by admin" }
    );

    res.json({
      message: `User "${user.name}" has been deleted and all related reports have been resolved.`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// @desc    Check if the current user has already reported someone for an order
// @route   GET /api/reports/check
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
export const checkMyReport = async (req, res) => {
  try {
    const { orderId, reportedUserId } = req.query;

    const existing = await Report.findOne({
      reportedBy:   req.user._id,
      reportedUser: reportedUserId,
      orderId,
    });

    res.json({ hasReported: !!existing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};