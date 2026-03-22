import Notification from "../models/Notification.js";

/**
 * Notification create karo
 * @param {Object} params
 * @param {string} params.userId      - Jis user ko notification jaegi
 * @param {string} params.title       - Short title
 * @param {string} params.message     - Detail message
 * @param {string} params.type        - Notification type (enum)
 * @param {string} params.link        - Click karne pe kahan jaega
 */
export const createNotification = async ({ userId, title, message, type = "general", link = "" }) => {
  try {
    await Notification.create({ userId, title, message, type, link });
  } catch (err) {
    console.error("Notification create error:", err.message);
  }
};