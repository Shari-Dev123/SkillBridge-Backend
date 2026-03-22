import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    gigId:{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Gig",  
      required: true
     },
    buyerId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    package:  { type: String, enum: ["basic", "standard", "premium"], default: "basic" },
    amount:   { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending_payment", "pending", "in_progress", "completed", "cancelled"],
      default: "pending_payment",
    },
    requirements: { type: String, default: "" },
    deliveryTime: { type: Number, required: true },

    // Payment
    isPaid:          { type: Boolean, default: false },
    paidAt:          { type: Date },
    paymentMethod:   { type: String, default: "" },  // "card"
    cardLastFour:    { type: String, default: "" },   // fake card last 4 digits

    // Admin
    adminApproved:   { type: Boolean, default: false },
    adminApprovedAt: { type: Date },
    platformFee:     { type: Number, default: 0 },    // 2% cut
    sellerEarning:   { type: Number, default: 0 },    // 98% seller ko

    isReviewed: { type: Boolean, default: false },
    // Admin ke baad yeh bhi add karo:
refundedAt:    { type: Date },
refundAmount:  { type: Number, default: 0 },
sellerPaidAt:  { type: Date },   // jab seller ko payment mili
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;