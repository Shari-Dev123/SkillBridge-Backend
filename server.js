import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import gigRoutes from "./routes/gigRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

// Error handlers
import { notFound, errorHandler } from "./middleware/errorHandler.js";

dotenv.config();
connectDB();

const app = express();

// Allowed origins list
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL, // Vercel frontend URL
].filter(Boolean);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Postman / server-to-server requests (no origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/gigs", gigRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "SkillBridge API is running..." });
});

// Error Handlers — hamesha last mein
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
export default app;