import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Seller from "../models/Seller.js";
import generateToken from "../utils/generateToken.js";
import { successResponse } from "../utils/helpers.js";

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  // Check user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("Email already registered");
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: role || "buyer",
  });

  // Agar seller hai toh seller profile bhi banao
  if (user.role === "seller") {
    await Seller.create({ userId: user._id });
  }

  const token = generateToken(user._id);

  successResponse(res, 201, "Registration successful", {
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error("Account is deactivated");
  }

  const token = generateToken(user._id);

  successResponse(res, 200, "Login successful", {
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
  });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  successResponse(res, 200, "User fetched", { user });
});

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);

  if (!(await user.matchPassword(currentPassword))) {
    res.status(401);
    throw new Error("Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  successResponse(res, 200, "Password updated successfully");
});

export { register, login, getMe, updatePassword };