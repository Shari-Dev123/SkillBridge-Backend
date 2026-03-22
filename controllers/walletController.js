import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Seller from "../models/Seller.js";
import { successResponse } from "../utils/helpers.js";

// @desc    Buyer wallet balance get karo
// @route   GET /api/wallet/buyer
// @access  Private (buyer)
const getBuyerWallet = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("walletBalance walletTransactions name");
  if (!user) { res.status(404); throw new Error("User not found"); }

  successResponse(res, 200, "Wallet fetched", {
    balance: user.walletBalance || 0,
    transactions: (user.walletTransactions || []).slice().reverse().slice(0, 20),
  });
});

// @desc    Buyer wallet mein fake paise daalo
// @route   POST /api/wallet/buyer/topup
// @access  Private (buyer)
const buyerTopUp = asyncHandler(async (req, res) => {
  const { amount } = req.body;

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    res.status(400); throw new Error("Invalid amount");
  }
  if (Number(amount) > 10000) {
    res.status(400); throw new Error("Maximum top-up is $10,000");
  }

  const user = await User.findById(req.user._id);
  if (!user) { res.status(404); throw new Error("User not found"); }

  user.walletBalance = (user.walletBalance || 0) + Number(amount);
  user.walletTransactions.push({
    type:        "credit",
    amount:      Number(amount),
    description: `Wallet top-up of $${amount}`,
  });

  await user.save();

  successResponse(res, 200, `$${amount} added to wallet!`, {
    balance: user.walletBalance,
  });
});

// @desc    Seller wallet get karo
// @route   GET /api/wallet/seller
// @access  Private (seller)
const getSellerWallet = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ userId: req.user._id });
  if (!seller) { res.status(404); throw new Error("Seller profile not found"); }

  successResponse(res, 200, "Seller wallet fetched", {
    balance:     seller.walletBalance    || 0,
    totalEarnings: seller.totalEarnings  || 0,
    withdrawn:   seller.withdrawnAmount  || 0,
    transactions: (seller.walletTransactions || []).slice().reverse().slice(0, 20),
  });
});

// @desc    Seller withdraw kare (auto complete)
// @route   POST /api/wallet/seller/withdraw
// @access  Private (seller)
const sellerWithdraw = asyncHandler(async (req, res) => {
  const { amount } = req.body;

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    res.status(400); throw new Error("Invalid amount");
  }

  const seller = await Seller.findOne({ userId: req.user._id });
  if (!seller) { res.status(404); throw new Error("Seller profile not found"); }

  if (Number(amount) > (seller.walletBalance || 0)) {
    res.status(400); throw new Error("Insufficient wallet balance");
  }

  seller.walletBalance   = (seller.walletBalance || 0) - Number(amount);
  seller.withdrawnAmount = (seller.withdrawnAmount || 0) + Number(amount);
  seller.walletTransactions.push({
    type:        "withdrawal",
    amount:      Number(amount),
    description: `Withdrawal of $${amount} — processed automatically`,
  });

  await seller.save();

  successResponse(res, 200, `$${amount} withdrawn successfully!`, {
    balance:   seller.walletBalance,
    withdrawn: seller.withdrawnAmount,
  });
});

export { getBuyerWallet, buyerTopUp, getSellerWallet, sellerWithdraw };