import express from "express";
import {
  submitReview,
  getGigReviews,
  getSellerReviews,
  deleteReview,
} from "../controllers/reviewController.js";
import protect from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, requireRole("buyer"), submitReview);
router.get("/gig/:gigId", getGigReviews);
router.get("/seller/:sellerId", getSellerReviews);
router.delete("/:id", protect, requireRole("buyer"), deleteReview);

export default router;