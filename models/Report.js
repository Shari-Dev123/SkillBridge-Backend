import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reporterRole: {
      type: String,
      enum: ["buyer", "seller"],
      required: true,
    },
    reason: {
      type: String,
      enum: [
        "fraud",
        "spam",
        "inappropriate_behavior",
        "fake_reviews",
        "payment_issue",
        "other",
      ],
      required: true,
    },
    description: {
      type: String,
      maxlength: 500,
      default: "",
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved", "dismissed"],
      default: "pending",
    },
    adminNote: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Ek user ek order ke liye sirf ek baar report kar sakta hai
reportSchema.index(
  { reportedBy: 1, reportedUser: 1, orderId: 1 },
  { unique: true }
);

const Report = mongoose.model("Report", reportSchema);
export default Report;