import express from "express";
import {
  createGig,
  getGigs,
  getGigBySlug,
  getMyGigs,
  updateGig,
  deleteGig,
} from "../controllers/gigController.js";
import protect from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Multi-field upload: images (max 3), video (1), documents (max 2)
const gigUpload = upload.fields([
  { name: "gigImages",    maxCount: 3 },
  { name: "gigVideo",     maxCount: 1 },
  { name: "gigDocuments", maxCount: 2 },
]);

router.get("/",          getGigs);
router.get("/my-gigs",   protect, requireRole("seller"), getMyGigs);
router.get("/:slug",     getGigBySlug);

router.post(   "/",    protect, requireRole("seller"), gigUpload, createGig);
router.put(    "/:id", protect, requireRole("seller"), gigUpload, updateGig);
router.delete( "/:id", protect, requireRole("seller"), deleteGig);

export default router;