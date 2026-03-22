import express from "express";
import {
  getBuyerWallet, buyerTopUp,
  getSellerWallet, sellerWithdraw,
} from "../controllers/walletController.js";
import protect from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/buyer",           protect, requireRole("buyer"),  getBuyerWallet);
router.post("/buyer/topup",    protect, requireRole("buyer"),  buyerTopUp);
router.get("/seller",          protect, requireRole("seller"), getSellerWallet);
router.post("/seller/withdraw",protect, requireRole("seller"), sellerWithdraw);

export default router;