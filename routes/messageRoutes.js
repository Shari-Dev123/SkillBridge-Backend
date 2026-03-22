import express from "express";
import {
  getMessages,
  sendMessage,
  getUnreadCount,
} from "../controllers/messageController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/unread-count", protect, getUnreadCount);
router.get("/:orderId", protect, getMessages);
router.post("/:orderId", protect, sendMessage);

export default router;