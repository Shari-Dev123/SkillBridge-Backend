import mongoose from "mongoose";

const sellerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // ── Basic Profile ──────────────────────────────────────────
    bio:        { type: String, default: "", maxlength: 1000 },
    tagline:    { type: String, default: "", maxlength: 150 },
    username:   { type: String, default: "", trim: true },
    introVideo: { type: String, default: "" },

    // ── Skills & Languages ─────────────────────────────────────
    skills: [{ type: String, trim: true }],
    languages: [
      {
        name:  { type: String },
        level: { type: String, default: "Fluent" },
      },
    ],

    // ── Work Experience ────────────────────────────────────────
    workExperience: [
      {
        company:     { type: String },
        title:       { type: String },
        from:        { type: String },
        to:          { type: String },
        description: { type: String, default: "" },
      },
    ],

    // ── Education ─────────────────────────────────────────────
    education: [
      {
        institution: { type: String },
        degree:      { type: String },
        major:       { type: String, default: "" },
        from:        { type: String },
        to:          { type: String },
      },
    ],

    // ── Certifications ────────────────────────────────────────
    certifications: [
      {
        name:     { type: String },
        issuedBy: { type: String },
        year:     { type: String },
      },
    ],

    // ── Portfolio ─────────────────────────────────────────────
    portfolio: [
      {
        title:       { type: String },
        image:       { type: String },
        link:        { type: String, default: "" },
        description: { type: String, default: "" },
      },
    ],

    // ── Pricing ───────────────────────────────────────────────
    hourlyRate: { type: Number, default: 0 },

    // ── Wallet ────────────────────────────────────────────────
    totalEarnings:   { type: Number, default: 0 },
    walletBalance:   { type: Number, default: 0 },
    withdrawnAmount: { type: Number, default: 0 },
    walletTransactions: [
      {
        type:        { type: String, enum: ["credit", "debit", "withdrawal"] },
        amount:      { type: Number },
        description: { type: String },
        createdAt:   { type: Date, default: Date.now },
      },
    ],

    // ── Stats ─────────────────────────────────────────────────
    rating:          { type: Number, default: 0 },
    totalReviews:    { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    uniqueClients:   { type: Number, default: 0 },
    activeDays:      { type: Number, default: 0 },
    isVerified:      { type: Boolean, default: false },

    // ── Level System ──────────────────────────────────────────
    level: {
      type:    String,
      enum:    ["new_seller", "level_1", "level_2"],
      default: "new_seller",
    },
    levelUpdatedAt: { type: Date },

    // ── Availability ──────────────────────────────────────────
    availability: {
      isAvailable:      { type: Boolean, default: true },   // false = gigs hidden
      unavailableFrom:  { type: Date,    default: null },   // first day
      unavailableTo:    { type: Date,    default: null },   // last day
      allowMessages:    { type: Boolean, default: true },   // buyers contact kar sakein
      awayMessage:      { type: String,  default: "", maxlength: 300 }, // buyers ko dikhega
    },
  },
  { timestamps: true }
);

const Seller = mongoose.model("Seller", sellerSchema);
export default Seller;