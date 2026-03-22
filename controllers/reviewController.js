import asyncHandler from "express-async-handler";
import Review from "../models/Review.js";
import Order from "../models/Order.js";
import Gig from "../models/Gig.js";
import Seller from "../models/Seller.js";
import { successResponse } from "../utils/helpers.js";
import { calcAverageRating } from "../utils/helpers.js";

// @desc    Submit review
// @route   POST /api/reviews
// @access  Private (buyer only)
const submitReview = asyncHandler(async (req, res) => {
  const { orderId, rating, comment } = req.body;

  const order = await Order.findById(orderId);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Sirf buyer hi review de sakta hai
  if (order.buyerId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only buyer can submit a review");
  }

  // Sirf completed order ka review ho sakta hai
  if (order.status !== "completed") {
    res.status(400);
    throw new Error("You can only review a completed order");
  }

  // Ek order ka sirf ek review
  if (order.isReviewed) {
    res.status(400);
    throw new Error("You have already reviewed this order");
  }

  // Rating 1-5 ke beech honi chahiye
  if (rating < 1 || rating > 5) {
    res.status(400);
    throw new Error("Rating must be between 1 and 5");
  }

  const review = await Review.create({
    gigId: order.gigId,
    orderId,
    buyerId: req.user._id,
    sellerId: order.sellerId,
    rating,
    comment,
  });

  // Order ko reviewed mark karo
  await Order.findByIdAndUpdate(orderId, { isReviewed: true });

  // Gig ki average rating update karo
  const gig = await Gig.findById(order.gigId);
  const newTotalReviews = gig.totalReviews + 1;
  const newRating = calcAverageRating(
    gig.rating * gig.totalReviews + rating,
    newTotalReviews
  );

  await Gig.findByIdAndUpdate(order.gigId, {
    rating: newRating,
    totalReviews: newTotalReviews,
  });

  // Seller ki average rating bhi update karo
  const seller = await Seller.findOne({ userId: order.sellerId });
  const newSellerTotalReviews = seller.totalReviews + 1;
  const newSellerRating = calcAverageRating(
    seller.rating * seller.totalReviews + rating,
    newSellerTotalReviews
  );

  await Seller.findOneAndUpdate(
    { userId: order.sellerId },
    {
      rating: newSellerRating,
      totalReviews: newSellerTotalReviews,
    }
  );

  const populatedReview = await Review.findById(review._id).populate(
    "buyerId",
    "name avatar"
  );

  successResponse(res, 201, "Review submitted successfully", {
    review: populatedReview,
  });
});

// @desc    Get reviews of a gig
// @route   GET /api/reviews/gig/:gigId
// @access  Public
const getGigReviews = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const gig = await Gig.findById(req.params.gigId);

  if (!gig) {
    res.status(404);
    throw new Error("Gig not found");
  }

  const total = await Review.countDocuments({ gigId: req.params.gigId });

  const reviews = await Review.find({ gigId: req.params.gigId })
    .populate("buyerId", "name avatar country")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // Rating breakdown — 1 star se 5 star tak kitne hain
  const breakdown = await Review.aggregate([
    {
      $match: {
        gigId: gig._id,
      },
    },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
  ]);

  const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  breakdown.forEach((item) => {
    ratingBreakdown[item._id] = item.count;
  });

  successResponse(res, 200, "Reviews fetched", {
    reviews,
    ratingBreakdown,
    averageRating: gig.rating,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Get seller reviews
// @route   GET /api/reviews/seller/:sellerId
// @access  Public
const getSellerReviews = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const total = await Review.countDocuments({
    sellerId: req.params.sellerId,
  });

  const reviews = await Review.find({ sellerId: req.params.sellerId })
    .populate("buyerId", "name avatar country")
    .populate("gigId", "title slug")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  successResponse(res, 200, "Seller reviews fetched", {
    reviews,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private (buyer only — own review)
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }

  if (review.buyerId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to delete this review");
  }

  // Gig rating wapas update karo
  const gig = await Gig.findById(review.gigId);

  if (gig && gig.totalReviews > 1) {
    const newTotalReviews = gig.totalReviews - 1;
    const newRating = calcAverageRating(
      gig.rating * gig.totalReviews - review.rating,
      newTotalReviews
    );
    await Gig.findByIdAndUpdate(review.gigId, {
      rating: newRating,
      totalReviews: newTotalReviews,
    });
  } else if (gig) {
    await Gig.findByIdAndUpdate(review.gigId, {
      rating: 0,
      totalReviews: 0,
    });
  }

  // Order ko unreviewed mark karo
  await Order.findByIdAndUpdate(review.orderId, { isReviewed: false });

  await review.deleteOne();

  successResponse(res, 200, "Review deleted successfully");
});

export { submitReview, getGigReviews, getSellerReviews, deleteReview };