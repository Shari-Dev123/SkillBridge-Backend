import asyncHandler from "express-async-handler";
import Order from "../models/Order.js";
import Gig from "../models/Gig.js";
import Seller from "../models/Seller.js";
import Review from "../models/Review.js";
import { successResponse } from "../utils/helpers.js";
import { ORDER_STATUS } from "../utils/constants.js";
import { getLevelProgress } from "../utils/levelHelper.js";

// @desc    Get seller dashboard stats
// @route   GET /api/dashboard/seller
// @access  Private (seller only)
const getSellerDashboard = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;

  const sellerProfile = await Seller.findOne({ userId: sellerId });

  const totalOrders      = await Order.countDocuments({ sellerId });
  const pendingOrders    = await Order.countDocuments({ sellerId, status: ORDER_STATUS.PENDING });
  const inProgressOrders = await Order.countDocuments({ sellerId, status: ORDER_STATUS.IN_PROGRESS });
  const completedOrders  = await Order.countDocuments({ sellerId, status: ORDER_STATUS.COMPLETED });
  const cancelledOrders  = await Order.countDocuments({ sellerId, status: ORDER_STATUS.CANCELLED });

  const levelProgress = getLevelProgress(sellerProfile);

  const earningsData = await Order.aggregate([
    { $match: { sellerId, status: ORDER_STATUS.COMPLETED } },
    { $group: { _id: null, totalEarnings: { $sum: "$amount" } } },
  ]);
  const totalEarnings = earningsData.length > 0 ? earningsData[0].totalEarnings : 0;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyEarnings = await Order.aggregate([
    { $match: { sellerId, status: ORDER_STATUS.COMPLETED, createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        earnings: { $sum: "$amount" },
        orders:   { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const recentOrders = await Order.find({ sellerId })
    .populate("gigId",   "title images")
    .populate("buyerId", "name avatar")
    .sort({ createdAt: -1 })
    .limit(5);

  const myGigs = await Gig.find({ sellerId }).sort({ totalOrders: -1 });

  const recentReviews = await Review.find({ sellerId })
    .populate("buyerId", "name avatar")
    .populate("gigId",   "title")
    .sort({ createdAt: -1 })
    .limit(5);

  successResponse(res, 200, "Seller dashboard fetched", {
    stats: {
      totalOrders,
      pendingOrders,
      inProgressOrders,
      completedOrders,
      cancelledOrders,
      totalEarnings,
      averageRating: sellerProfile?.rating       || 0,
      totalReviews:  sellerProfile?.totalReviews || 0,
    },
    monthlyEarnings,
    recentOrders,
    myGigs,
    recentReviews,
    levelProgress,                               // ← Level progress
    availability: sellerProfile?.availability || null, // ← Availability
  });
});

// @desc    Get buyer dashboard stats
// @route   GET /api/dashboard/buyer
// @access  Private (buyer only)
const getBuyerDashboard = asyncHandler(async (req, res) => {
  const buyerId = req.user._id;

  const totalOrders      = await Order.countDocuments({ buyerId });
  const pendingOrders    = await Order.countDocuments({ buyerId, status: ORDER_STATUS.PENDING });
  const inProgressOrders = await Order.countDocuments({ buyerId, status: ORDER_STATUS.IN_PROGRESS });
  const completedOrders  = await Order.countDocuments({ buyerId, status: ORDER_STATUS.COMPLETED });
  const cancelledOrders  = await Order.countDocuments({ buyerId, status: ORDER_STATUS.CANCELLED });

  const spentData = await Order.aggregate([
    { $match: { buyerId, status: ORDER_STATUS.COMPLETED } },
    { $group: { _id: null, totalSpent: { $sum: "$amount" } } },
  ]);
  const totalSpent = spentData.length > 0 ? spentData[0].totalSpent : 0;

  const pendingReviews = await Order.find({
    buyerId,
    status:     ORDER_STATUS.COMPLETED,
    isReviewed: false,
  })
    .populate("gigId",    "title images slug")
    .populate("sellerId", "name avatar")
    .sort({ createdAt: -1 });

  const recentOrders = await Order.find({ buyerId })
    .populate("gigId",    "title images slug")
    .populate("sellerId", "name avatar")
    .sort({ createdAt: -1 })
    .limit(5);

  successResponse(res, 200, "Buyer dashboard fetched", {
    stats: {
      totalOrders,
      pendingOrders,
      inProgressOrders,
      completedOrders,
      cancelledOrders,
      totalSpent,
    },
    pendingReviews,
    recentOrders,
  });
});

export { getSellerDashboard, getBuyerDashboard };