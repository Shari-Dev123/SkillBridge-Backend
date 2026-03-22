import mongoose from "mongoose";

const packageFeatureSchema = new mongoose.Schema({
  revisions: { type: Number, default: 0 },           // 0 = unlimited
  logoTransparency: { type: Boolean, default: false },
  vectorFile: { type: Boolean, default: false },
  printableFile: { type: Boolean, default: false },
  mockup3D: { type: Boolean, default: false },
  sourceFile: { type: Boolean, default: false },
  stationeryDesigns: { type: Boolean, default: false },
  socialMediaKit: { type: Boolean, default: false },
}, { _id: false });

const packageSchema = new mongoose.Schema({
  label: { type: String, default: "" },
  price: { type: Number },
  deliveryTime: { type: Number },
  description: { type: String },
  features: { type: packageFeatureSchema, default: () => ({}) },
}, { _id: false });

const extraServiceSchema = new mongoose.Schema({
  fastDelivery: {
    basic:    { enabled: Boolean, days: Number, price: Number },
    standard: { enabled: Boolean, days: Number, price: Number },
    premium:  { enabled: Boolean, days: Number, price: Number },
  },
  additionalRevision: { enabled: Boolean, price: Number },
  additionalLogo:     { enabled: Boolean, price: Number },
  logoTransparency:   { enabled: Boolean },
  vectorFile:         { enabled: Boolean, price: Number },
  printableFile:      { enabled: Boolean },
  mockup3D:           { enabled: Boolean, price: Number },
  sourceFile:         { enabled: Boolean },
  stationeryDesigns:  { enabled: Boolean },
  socialMediaKit:     { enabled: Boolean },
}, { _id: false });

const faqSchema = new mongoose.Schema({
  question: { type: String },
  answer:   { type: String },
}, { _id: false });

const requirementSchema = new mongoose.Schema({
  question:     { type: String },
  type:         { type: String, enum: ["text", "multiple_choice", "file"], default: "text" },
  options:      [{ type: String }],
  isRequired:   { type: Boolean, default: false },
}, { _id: false });

const gigSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 100,
    },
    slug: { type: String, unique: true },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: 2000,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "web-development", "mobile-development", "graphic-design",
        "digital-marketing", "writing", "video-editing", "seo", "other",
      ],
    },

    // Tags (search tags)
    tags: [{ type: String, trim: true }],

    // Positive keywords (SEO keywords)
    positiveKeywords: [{ type: String, trim: true }],

    // Packages
    pricing: {
      basic:    { type: packageSchema, required: true },
      standard: { type: packageSchema },
      premium:  { type: packageSchema },
    },

    // Extra services
    extras: { type: extraServiceSchema, default: () => ({}) },

    // Media
    images:    [{ type: String }],
    video:     { type: String, default: "" },
    documents: [{ type: String }],

    // FAQ
    faqs: [faqSchema],

    // Requirements from buyer
    requirements: [requirementSchema],

    // Stats
    rating:       { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    totalOrders:  { type: Number, default: 0 },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

gigSchema.index({ title: "text", description: "text", tags: "text", positiveKeywords: "text" });

const Gig = mongoose.model("Gig", gigSchema);
export default Gig;