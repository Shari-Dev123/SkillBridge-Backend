import asyncHandler from "express-async-handler";
import Order from "../models/Order.js";
import Gig from "../models/Gig.js";
import Seller from "../models/Seller.js";
import User from "../models/User.js";
import { successResponse, getPagination } from "../utils/helpers.js";
import { createNotification } from "../utils/notificationHelper.js";
import { checkAndUpdateLevel } from "../utils/levelHelper.js";

// ─── Helpers ──────────────────────────────────────────────────────────────

const formatOrderId = (id) => id.toString().slice(-6).toUpperCase();

// ─────────────────────────────────────────────────────────────────────────
// @desc    Place an order (after payment)
// @route   POST /api/orders
// @access  Private (buyer only)
// ─────────────────────────────────────────────────────────────────────────
const placeOrder = asyncHandler(async (req, res) => {
  const { gigId, package: pkg, requirements } = req.body;

  const gig = await Gig.findById(gigId);
  if (!gig || !gig.isActive) {
    res.status(404);
    throw new Error("Gig not found");
  }
  if (gig.sellerId.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error("You cannot order your own gig");
  }

  const selectedPackage = gig.pricing[pkg || "basic"];
  if (!selectedPackage?.price) {
    res.status(400);
    throw new Error("Invalid package selected");
  }

  const order = await Order.create({
    gigId,
    buyerId:      req.user._id,
    sellerId:     gig.sellerId,
    package:      pkg || "basic",
    amount:       selectedPackage.price,
    deliveryTime: selectedPackage.deliveryTime,
    requirements: requirements || "",
    status:       "pending_payment",
  });

  const populatedOrder = await Order.findById(order._id)
    .populate("gigId",    "title images slug")
    .populate("buyerId",  "name avatar")
    .populate("sellerId", "name avatar");

  await createNotification({
    userId:  gig.sellerId,
    title:   "New Order Received",
    message: `${populatedOrder.buyerId.name} placed an order for "${gig.title}".`,
    type:    "order_placed",
    link:    `/orders/${order._id}`,
  });

  successResponse(res, 201, "Order created. Please complete payment.", { order: populatedOrder });
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Pay for an order via wallet
// @route   POST /api/orders/:id/pay
// @access  Private (buyer only)
// ─────────────────────────────────────────────────────────────────────────
const payOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) { res.status(404); throw new Error("Order not found"); }

  if (order.buyerId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }
  if (order.isPaid) { res.status(400); throw new Error("Order is already paid"); }

  const buyer = await User.findById(req.user._id);
  if (!buyer) { res.status(404); throw new Error("Buyer not found"); }

  if ((buyer.walletBalance || 0) < order.amount) {
    res.status(400);
    throw new Error(
      `Insufficient wallet balance. Your balance: $${buyer.walletBalance || 0}, Required: $${order.amount}`
    );
  }

  const platformFee   = parseFloat((order.amount * 0.02).toFixed(2));
  const sellerEarning = parseFloat((order.amount - platformFee).toFixed(2));

  // Deduct from buyer wallet
  buyer.walletBalance = (buyer.walletBalance || 0) - order.amount;
  buyer.walletTransactions.push({
    type:        "debit",
    amount:      order.amount,
    description: `Payment for order #${formatOrderId(order._id)}`,
  });
  await buyer.save();

  // Update order
  order.isPaid        = true;
  order.paidAt        = new Date();
  order.paymentMethod = "wallet";
  order.status        = "pending";
  order.platformFee   = platformFee;
  order.sellerEarning = sellerEarning;
  await order.save();

  await Gig.findByIdAndUpdate(order.gigId, { $inc: { totalOrders: 1 } });

  const populatedOrder = await Order.findById(order._id)
    .populate("gigId",    "title images slug")
    .populate("buyerId",  "name avatar")
    .populate("sellerId", "name avatar");

  await createNotification({
    userId:  order.sellerId,
    title:   "Payment Received",
    message: `Payment for order #${formatOrderId(order._id)} has been received. Awaiting admin approval.`,
    type:    "payment_received",
    link:    `/orders/${order._id}`,
  });

  successResponse(res, 200, "Payment successful. Waiting for admin approval.", { order: populatedOrder });
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Admin — Get all pending approval orders
// @route   GET /api/orders/admin/pending
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────
const getAdminPendingOrders = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const { pageNum, limitNum, skip } = getPagination(page, limit);

  const query = { isPaid: true, adminApproved: false, status: "pending" };
  const total = await Order.countDocuments(query);

  const orders = await Order.find(query)
    .populate("gigId",    "title images slug")
    .populate("buyerId",  "name avatar email")
    .populate("sellerId", "name avatar email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  successResponse(res, 200, "Pending orders fetched", {
    orders,
    pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) },
  });
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Admin — Get all orders
// @route   GET /api/orders/admin/all
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────
const getAdminAllOrders = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const { pageNum, limitNum, skip } = getPagination(page, limit);

  const query = status ? { status } : {};
  const total = await Order.countDocuments(query);

  const orders = await Order.find(query)
    .populate("gigId",    "title images")
    .populate("buyerId",  "name avatar email")
    .populate("sellerId", "name avatar email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  successResponse(res, 200, "All orders fetched", {
    orders,
    pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) },
  });
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Admin — Approve order and release payment to seller
// @route   PATCH /api/orders/:id/approve
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────
const approveOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order)              { res.status(404); throw new Error("Order not found"); }
  if (!order.isPaid)       { res.status(400); throw new Error("Order has not been paid yet"); }
  if (order.adminApproved) { res.status(400); throw new Error("Order is already approved"); }

  order.adminApproved   = true;
  order.adminApprovedAt = new Date();
  order.status          = "in_progress";
  await order.save();

  await createNotification({
    userId:  order.sellerId,
    title:   "Order Approved",
    message: `Order #${formatOrderId(order._id)} has been approved by admin. You may begin working.`,
    type:    "order_approved",
    link:    `/orders/${order._id}`,
  });

  await createNotification({
    userId:  order.buyerId,
    title:   "Order Started",
    message: `Your order #${formatOrderId(order._id)} has been approved. The seller will begin shortly.`,
    type:    "order_accepted",
    link:    `/orders/${order._id}`,
  });

  const updatedOrder = await Order.findById(order._id)
    .populate("gigId",    "title images slug")
    .populate("buyerId",  "name avatar")
    .populate("sellerId", "name avatar");

  successResponse(res, 200, "Order approved. Work can begin.", { order: updatedOrder });
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Admin — Reject order and refund buyer
// @route   PATCH /api/orders/:id/reject
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────
const rejectOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order)              { res.status(404); throw new Error("Order not found"); }
  if (order.adminApproved) { res.status(400); throw new Error("Order is already approved"); }

  order.status = "cancelled";
  await order.save();

  await createNotification({
    userId:  order.buyerId,
    title:   "Order Rejected",
    message: `Order #${formatOrderId(order._id)} was rejected by admin. A refund will be processed.`,
    type:    "order_rejected",
    link:    `/orders/${order._id}`,
  });

  successResponse(res, 200, "Order rejected. Buyer will be refunded.", { order });
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get buyer's orders
// @route   GET /api/orders/buyer
// @access  Private (buyer only)
// ─────────────────────────────────────────────────────────────────────────
const getBuyerOrders = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;
  const { pageNum, limitNum, skip } = getPagination(page, limit);

  const query = { buyerId: req.user._id, ...(status && { status }) };
  const total = await Order.countDocuments(query);

  const orders = await Order.find(query)
    .populate("gigId",    "title images slug")
    .populate("sellerId", "name avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  successResponse(res, 200, "Buyer orders fetched", {
    orders,
    pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) },
  });
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get seller's orders
// @route   GET /api/orders/seller
// @access  Private (seller only)
// ─────────────────────────────────────────────────────────────────────────
const getSellerOrders = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;
  const { pageNum, limitNum, skip } = getPagination(page, limit);

  const query = { sellerId: req.user._id, ...(status && { status }) };
  const total = await Order.countDocuments(query);

  const orders = await Order.find(query)
    .populate("gigId",   "title images slug")
    .populate("buyerId", "name avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  successResponse(res, 200, "Seller orders fetched", {
    orders,
    pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) },
  });
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get a single order by ID
// @route   GET /api/orders/:id
// @access  Private (buyer / seller / admin)
// ─────────────────────────────────────────────────────────────────────────
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("gigId",    "title images slug description")
    .populate("buyerId",  "name avatar email")
    .populate("sellerId", "name avatar email");

  if (!order) { res.status(404); throw new Error("Order not found"); }

  const isBuyer  = order.buyerId._id.toString()  === req.user._id.toString();
  const isSeller = order.sellerId._id.toString() === req.user._id.toString();
  const isAdmin  = req.user.role === "admin";

  if (!isBuyer && !isSeller && !isAdmin) {
    res.status(403);
    throw new Error("Not authorized to view this order");
  }

  successResponse(res, 200, "Order fetched", { order });
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Update order status
//          Seller: in_progress → completed
//          Buyer:  → cancelled
// @route   PATCH /api/orders/:id/status
// @access  Private (buyer / seller)
// ─────────────────────────────────────────────────────────────────────────
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) { res.status(404); throw new Error("Order not found"); }

  const isBuyer  = order.buyerId.toString()  === req.user._id.toString();
  const isSeller = order.sellerId.toString() === req.user._id.toString();

  if (!isBuyer && !isSeller) { res.status(403); throw new Error("Not authorized"); }

  if (isSeller && !["in_progress", "completed"].includes(status)) {
    res.status(400);
    throw new Error("Seller can only set status to in_progress or completed");
  }
  if (isBuyer && status !== "cancelled") {
    res.status(400);
    throw new Error("Buyer can only cancel an order");
  }
  if (order.status === "completed") {
    res.status(400);
    throw new Error("A completed order cannot be changed");
  }
  if (order.status === "pending_payment") {
    res.status(400);
    throw new Error("Please complete payment before updating order status");
  }

  order.status = status;
  await order.save();

  // ── Notifications ─────────────────────────────────────────────────

  if (status === "in_progress") {
    await createNotification({
      userId:  order.buyerId,
      title:   "Seller Accepted Your Order",
      message: `Work has started on order #${formatOrderId(order._id)}.`,
      type:    "order_accepted",
      link:    `/orders/${order._id}`,
    });
  }

  if (status === "completed") {
    await createNotification({
      userId:  order.buyerId,
      title:   "Order Delivered",
      message: `Order #${formatOrderId(order._id)} has been marked complete. Please leave a review.`,
      type:    "order_completed",
      link:    `/orders/${order._id}`,
    });

    // Credit seller wallet on completion
    if (order.isPaid) {
      await Seller.findOneAndUpdate(
        { userId: order.sellerId },
        {
          $inc: {
            completedOrders: 1,
            totalEarnings:   order.sellerEarning,
            walletBalance:   order.sellerEarning,
          },
          $push: {
            walletTransactions: {
              type:        "credit",
              amount:      order.sellerEarning,
              description: `Earnings for order #${formatOrderId(order._id)} (after 2% platform fee)`,
              createdAt:   new Date(),
            },
          },
        }
      );

      await checkAndUpdateLevel(order.sellerId, order.sellerId);

      await createNotification({
        userId:  order.sellerId,
        title:   "Payment Released",
        message: `$${order.sellerEarning} has been credited to your wallet for order #${formatOrderId(order._id)}.`,
        type:    "payment_received",
        link:    `/orders/${order._id}`,
      });
    }
  }

  if (status === "cancelled") {
    await createNotification({
      userId:  order.sellerId,
      title:   "Order Cancelled",
      message: `Order #${formatOrderId(order._id)} has been cancelled by the buyer.`,
      type:    "order_cancelled",
      link:    `/orders/${order._id}`,
    });

    // Refund buyer if order was paid
    if (order.isPaid) {
      await User.findByIdAndUpdate(order.buyerId, {
        $inc: { walletBalance: order.amount },
        $push: {
          walletTransactions: {
            type:        "refund",
            amount:      order.amount,
            description: `Refund for cancelled order #${formatOrderId(order._id)}`,
            createdAt:   new Date(),
          },
        },
      });

      await createNotification({
        userId:  order.buyerId,
        title:   "Refund Processed",
        message: `$${order.amount} has been refunded to your wallet for order #${formatOrderId(order._id)}.`,
        type:    "payment_received",
        link:    `/orders/${order._id}`,
      });
    }
  }

  const updatedOrder = await Order.findById(order._id)
    .populate("gigId",    "title images slug")
    .populate("buyerId",  "name avatar")
    .populate("sellerId", "name avatar");

  successResponse(res, 200, "Order status updated", { order: updatedOrder });
});

// ─────────────────────────────────────────────────────────────────────────

export {
  placeOrder,
  payOrder,
  getAdminPendingOrders,
  getAdminAllOrders,
  approveOrder,
  rejectOrder,
  getBuyerOrders,
  getSellerOrders,
  getOrderById,
  updateOrderStatus,
};