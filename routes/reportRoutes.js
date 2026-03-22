import express from "express";
import {
  submitReport,
  getAllReports,
  updateReportStatus,
  deleteReportedUser,
  checkMyReport,
} from "../controllers/reportController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Inline admin check — roleMiddleware pe depend nahi
const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// Buyer/Seller — report submit karna
router.post("/", protect, submitReport);

// Buyer/Seller — check karo maine pehle report ki hai ya nahi
router.get("/check", protect, checkMyReport);

// Admin only routes
router.get("/", protect, adminOnly, getAllReports);
router.patch("/:id/status", protect, adminOnly, updateReportStatus);
router.delete("/user/:userId", protect, adminOnly, deleteReportedUser);

export default router;