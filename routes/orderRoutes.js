import express from "express";
import {
  placeOrder, payOrder,
  getAdminPendingOrders, getAdminAllOrders, approveOrder, rejectOrder,
  getBuyerOrders, getSellerOrders, getOrderById, updateOrderStatus,
} from "../controllers/orderController.js";
import protect from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

// Buyer
router.post("/",               protect, requireRole("buyer"), placeOrder);
router.post("/:id/pay",        protect, requireRole("buyer"), payOrder);
router.get("/buyer",           protect, requireRole("buyer"), getBuyerOrders);

// Seller
router.get("/seller",          protect, requireRole("seller"), getSellerOrders);

// Admin
router.get("/admin/pending",   protect, requireRole("admin"), getAdminPendingOrders);
router.get("/admin/all",       protect, requireRole("admin"), getAdminAllOrders);
router.patch("/:id/approve",   protect, requireRole("admin"), approveOrder);
router.patch("/:id/reject",    protect, requireRole("admin"), rejectOrder);

// Shared
router.get("/:id",             protect, getOrderById);
router.patch("/:id/status",    protect, updateOrderStatus);

export default router;