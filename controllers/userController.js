import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Seller from "../models/Seller.js";
import Gig from "../models/Gig.js";
import Order from "../models/Order.js";
import { successResponse } from "../utils/helpers.js";

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  const sellerProfile = user.role === "seller"
    ? await Seller.findOne({ userId: user._id })
    : null;

  successResponse(res, 200, "Profile fetched", { user, sellerProfile });
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Update current user profile
// @route   PUT /api/users/profile
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
  const { name, country, phone, bio } = req.body;
  const user = await User.findById(req.user._id);

  if (name    !== undefined) user.name    = name;
  if (country !== undefined) user.country = country;
  if (phone   !== undefined) user.phone   = phone;
  if (bio     !== undefined) user.bio     = bio;

  const updatedUser = await user.save();

  successResponse(res, 200, "Profile updated", {
    user: {
      _id:     updatedUser._id,
      name:    updatedUser.name,
      email:   updatedUser.email,
      role:    updatedUser.role,
      avatar:  updatedUser.avatar,
      country: updatedUser.country,
      phone:   updatedUser.phone,
      bio:     updatedUser.bio,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Upload / update avatar
// @route   PUT /api/users/avatar
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("Please upload an image");
  }

  const user = await User.findById(req.user._id);
  user.avatar = req.file.path;
  await user.save();

  successResponse(res, 200, "Avatar updated", { avatar: user.avatar });
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get seller public profile
// @route   GET /api/users/seller/:id
// @access  Public
// ─────────────────────────────────────────────────────────────────────────
const getSellerProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user || user.role !== "seller") {
    res.status(404);
    throw new Error("Seller not found");
  }

  const sellerProfile = await Seller.findOne({ userId: req.params.id });

  successResponse(res, 200, "Seller profile fetched", { user, sellerProfile });
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Update seller profile (all sections)
// @route   PUT /api/users/seller-profile
// @access  Private (seller only)
// ─────────────────────────────────────────────────────────────────────────
const updateSellerProfile = asyncHandler(async (req, res) => {
  const {
    bio, tagline, username, introVideo,
    skills, languages, hourlyRate,
    workExperience, education, certifications, portfolio,
  } = req.body;

  const sellerProfile = await Seller.findOne({ userId: req.user._id });
  if (!sellerProfile) {
    res.status(404);
    throw new Error("Seller profile not found");
  }

  const fields = {
    bio, tagline, username, introVideo,
    skills, languages, hourlyRate,
    workExperience, education, certifications, portfolio,
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) sellerProfile[key] = value;
  }

  await sellerProfile.save();
  successResponse(res, 200, "Seller profile updated", { sellerProfile });
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Update seller availability
// @route   PUT /api/users/availability
// @access  Private (seller only)
// ─────────────────────────────────────────────────────────────────────────
export const updateAvailability = async (req, res) => {
  try {
    const { isAvailable, unavailableFrom, unavailableTo, allowMessages, awayMessage } = req.body;

    const sellerProfile = await Seller.findOne({ userId: req.user._id });
    if (!sellerProfile) {
      return res.status(404).json({ message: "Seller profile not found" });
    }

    if (isAvailable     !== undefined) sellerProfile.availability.isAvailable     = isAvailable;
    if (unavailableFrom !== undefined) sellerProfile.availability.unavailableFrom  = unavailableFrom || null;
    if (unavailableTo   !== undefined) sellerProfile.availability.unavailableTo    = unavailableTo   || null;
    if (allowMessages   !== undefined) sellerProfile.availability.allowMessages    = allowMessages;
    if (awayMessage     !== undefined) sellerProfile.availability.awayMessage      = awayMessage;

    if (isAvailable === true) {
      sellerProfile.availability.unavailableFrom = null;
      sellerProfile.availability.unavailableTo   = null;
      sellerProfile.availability.awayMessage     = "";
    }

    await sellerProfile.save();

    await Gig.updateMany(
      { sellerId: req.user._id },
      { isActive: isAvailable !== false }
    );

    const message = isAvailable === false
      ? "You are now marked as unavailable. Your gigs have been hidden."
      : "You are now marked as available.";

    res.json({ message, availability: sellerProfile.availability });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get seller availability (public)
// @route   GET /api/users/seller/:id/availability
// @access  Public
// ─────────────────────────────────────────────────────────────────────────
export const getSellerAvailability = async (req, res) => {
  try {
    const seller = await Seller.findOne({ userId: req.params.id }).select("availability");
    if (!seller) return res.status(404).json({ message: "Seller not found" });

    res.json({ availability: seller.availability });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// @desc    Admin — Get all users with stats
// @route   GET /api/users/admin/users
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────
export const adminGetUsers = asyncHandler(async (req, res) => {
  const { search = "", role = "", page = 1, limit = 12 } = req.query;

  const filter = { role: { $ne: "admin" } };
  if (role)   filter.role = role;
  if (search) {
    filter.$or = [
      { name:  { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select("-password")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  // Enrich with seller stats + order counts
  const enriched = await Promise.all(
    users.map(async (u) => {
      const base = u.toObject();

      if (u.role === "seller") {
        const seller = await Seller.findOne({ userId: u._id }).select(
          "rating totalReviews completedOrders totalEarnings walletBalance level"
        );
        const totalGigs = await Gig.countDocuments({ sellerId: u._id });
        base.rating        = seller?.rating        || 0;
        base.totalReviews  = seller?.totalReviews  || 0;
        base.totalOrders   = seller?.completedOrders || 0;
        base.totalEarnings = seller?.totalEarnings || 0;
        base.walletBalance = seller?.walletBalance || 0;
        base.sellerLevel   = seller?.level         || "new_seller";
        base.totalGigs     = totalGigs;
      } else {
        // buyer
        const orderCount = await Order.countDocuments({ buyerId: u._id });
        const spentData  = await Order.aggregate([
          { $match: { buyerId: u._id, status: "completed" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        base.totalOrders = orderCount;
        base.totalSpent  = spentData[0]?.total || 0;
      }

      return base;
    })
  );

  // Counts for header stats
  const sellerCount = await User.countDocuments({ role: "seller" });
  const buyerCount  = await User.countDocuments({ role: "buyer"  });

  successResponse(res, 200, "Users fetched", {
    users: enriched,
    sellerCount,
    buyerCount,
    pagination: {
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Admin — Delete a user
// @route   DELETE /api/users/admin/users/:id
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────
export const adminDeleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error("User not found"); }
  if (user.role === "admin") { res.status(403); throw new Error("Cannot delete admin"); }

  await User.findByIdAndDelete(req.params.id);
  // Also remove seller profile if exists
  await Seller.findOneAndDelete({ userId: req.params.id });

  successResponse(res, 200, "User deleted successfully");
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Admin — Send warning to a user
// @route   PUT /api/users/admin/users/:id/warn
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────
export const adminWarnUser = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message) { res.status(400); throw new Error("Warning message is required"); }

  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error("User not found"); }

  user.warning = message;
  await user.save();

  successResponse(res, 200, "Warning sent successfully", { warning: user.warning });
});

export {
  getProfile,
  updateProfile,
  uploadAvatar,
  getSellerProfile,
  updateSellerProfile,
};