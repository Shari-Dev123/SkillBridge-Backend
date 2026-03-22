import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";

await mongoose.connect(process.env.MONGO_URI);

const existing = await User.findOne({ email: "admin@skillbridge.com" });
if (existing) {
  console.log("Admin already exists!");
} else {
  const hash = await bcrypt.hash("admin123", 10);
  await User.create({ name: "Admin", email: "admin@skillbridge.com", password: hash, role: "admin" });
  console.log("✅ Admin created! Email: admin@skillbridge.com | Password: admin123");
}

await mongoose.disconnect();
process.exit();