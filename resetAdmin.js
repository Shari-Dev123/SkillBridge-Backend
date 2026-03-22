import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";

await mongoose.connect(process.env.MONGO_URI);

const hash = await bcrypt.hash("admin123", 10);
const result = await User.findOneAndUpdate(
  { email: "admin@skillbridge.com" },
  { password: hash },
  { new: true }
);

console.log("✅ Password reset! User:", result?.email, "| Role:", result?.role);
await mongoose.disconnect();
process.exit();