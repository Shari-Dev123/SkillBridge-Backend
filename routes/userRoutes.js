import express from "express";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  getSellerProfile,
  updateSellerProfile,
  updateAvailability,
  getSellerAvailability,
  adminGetUsers,
  adminDeleteUser,
  adminWarnUser,
} from "../controllers/userController.js";
import protect from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// ── User / Seller routes ──────────────────────────────────────────────────────
router.get("/profile",         protect, getProfile);
router.put("/profile",         protect, updateProfile);
router.put("/avatar",          protect, upload.single("avatar"), uploadAvatar);
router.get("/seller/:id",      getSellerProfile);
router.put("/seller-profile",  protect, requireRole("seller"), updateSellerProfile);

// Availability
router.put("/availability",            protect, requireRole("seller"), updateAvailability);
router.get("/seller/:id/availability", getSellerAvailability);

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get("/admin/users",          protect, requireRole("admin"), adminGetUsers);
router.delete("/admin/users/:id",   protect, requireRole("admin"), adminDeleteUser);
router.put("/admin/users/:id/warn", protect, requireRole("admin"), adminWarnUser);

export default router;