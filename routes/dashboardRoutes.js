import express from "express";
import {
  getSellerDashboard,
  getBuyerDashboard,
} from "../controllers/dashboardController.js";
import protect from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/seller", protect, requireRole("seller"), getSellerDashboard);
router.get("/buyer", protect, requireRole("buyer"), getBuyerDashboard);

export default router;