import asyncHandler from "express-async-handler";
import Message from "../models/Message.js";
import Order from "../models/Order.js";
import { successResponse } from "../utils/helpers.js";

// @desc    Get all messages of an order
// @route   GET /api/messages/:orderId
// @access  Private (buyer or seller of that order)
const getMessages = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Sirf buyer ya seller hi messages dekh sakta hai
  const isBuyer = order.buyerId.toString() === req.user._id.toString();
  const isSeller = order.sellerId.toString() === req.user._id.toString();

  if (!isBuyer && !isSeller) {
    res.status(403);
    throw new Error("Not authorized to view these messages");
  }

  const messages = await Message.find({ orderId: req.params.orderId })
    .populate("senderId", "name avatar role")
    .sort({ createdAt: 1 });

  // Unread messages ko read mark karo
  await Message.updateMany(
    {
      orderId: req.params.orderId,
      senderId: { $ne: req.user._id },
      isRead: false,
    },
    { isRead: true }
  );

  successResponse(res, 200, "Messages fetched", { messages });
});

// @desc    Send message
// @route   POST /api/messages/:orderId
// @access  Private (buyer or seller of that order)
const sendMessage = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim() === "") {
    res.status(400);
    throw new Error("Message cannot be empty");
  }

  const order = await Order.findById(req.params.orderId);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Sirf buyer ya seller hi message bhej sakta hai
  const isBuyer = order.buyerId.toString() === req.user._id.toString();
  const isSeller = order.sellerId.toString() === req.user._id.toString();

  if (!isBuyer && !isSeller) {
    res.status(403);
    throw new Error("Not authorized to send message in this order");
  }

  // Cancelled order mein message nahi bhej sakte
  if (order.status === "cancelled") {
    res.status(400);
    throw new Error("Cannot send message in a cancelled order");
  }

  const message = await Message.create({
    orderId: req.params.orderId,
    senderId: req.user._id,
    text: text.trim(),
  });

  const populatedMessage = await Message.findById(message._id).populate(
    "senderId",
    "name avatar role"
  );

  successResponse(res, 201, "Message sent", { message: populatedMessage });
});

// @desc    Get unread message count
// @route   GET /api/messages/unread-count
// @access  Private
const getUnreadCount = asyncHandler(async (req, res) => {
  // User ke saare orders find karo
  const orders = await Order.find({
    $or: [{ buyerId: req.user._id }, { sellerId: req.user._id }],
  }).select("_id");

  const orderIds = orders.map((o) => o._id);

  const unreadCount = await Message.countDocuments({
    orderId: { $in: orderIds },
    senderId: { $ne: req.user._id },
    isRead: false,
  });

  successResponse(res, 200, "Unread count fetched", { unreadCount });
});

export { getMessages, sendMessage, getUnreadCount };