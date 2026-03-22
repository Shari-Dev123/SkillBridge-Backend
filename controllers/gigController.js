import asyncHandler from "express-async-handler";
import Gig from "../models/Gig.js";
import slugify from "slugify";
import { successResponse, getPagination } from "../utils/helpers.js";

const parseJSON = (val) => {
  if (!val) return undefined;
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return undefined; }
  }
  return val;
};

// @desc    Create gig
// @route   POST /api/gigs
// @access  Private (seller only)
const createGig = asyncHandler(async (req, res) => {
      console.log("REQ BODY:", req.body);
  console.log("REQ FILES:", req.files);
  const {
    title, description, category,
    pricing, tags, positiveKeywords,
    extras, faqs, requirements,
  } = req.body;

  const slug = slugify(title, { lower: true, strict: true });

  const slugExists = await Gig.findOne({ slug });
  if (slugExists) {
    res.status(400);
    throw new Error("Gig with this title already exists");
  }

  const images    = req.files?.gigImages    ? req.files.gigImages.map(f => f.path)    : [];
const video     = req.files?.gigVideo?.[0]?.path || "";
const documents = req.files?.gigDocuments ? req.files.gigDocuments.map(f => f.path) : [];

  const gig = await Gig.create({
    sellerId:         req.user._id,
    title,
    slug,
    description,
    category,
    pricing:          parseJSON(pricing),
    tags:             parseJSON(tags)             || [],
    positiveKeywords: parseJSON(positiveKeywords) || [],
    extras:           parseJSON(extras)           || {},
    faqs:             parseJSON(faqs)             || [],
    requirements:     parseJSON(requirements)     || [],
    images,
    video,
    documents,
  });

  successResponse(res, 201, "Gig created successfully", { gig });
});

// @desc    Get all gigs
// @route   GET /api/gigs
// @access  Public
const getGigs = asyncHandler(async (req, res) => {
  const { search, category, minPrice, maxPrice, sort, page, limit } = req.query;
  const { pageNum, limitNum, skip } = getPagination(page, limit);

  let query = { isActive: true };

  if (search) query.$text = { $search: search };
  if (category) query.category = category;

  if (minPrice && !isNaN(minPrice) && Number(minPrice) > 0)
    query["pricing.basic.price"] = { ...query["pricing.basic.price"], $gte: Number(minPrice) };

  if (maxPrice && !isNaN(maxPrice) && Number(maxPrice) > 0)
    query["pricing.basic.price"] = { ...query["pricing.basic.price"], $lte: Number(maxPrice) };

  let sortOption = { createdAt: -1 };
  if (sort === "rating")     sortOption = { rating: -1 };
  if (sort === "price_low")  sortOption = { "pricing.basic.price": 1 };
  if (sort === "price_high") sortOption = { "pricing.basic.price": -1 };
  if (sort === "orders")     sortOption = { totalOrders: -1 };

  const total = await Gig.countDocuments(query);
  const gigs  = await Gig.find(query)
    .populate("sellerId", "name avatar country")
    .sort(sortOption)
    .skip(skip)
    .limit(limitNum);

  successResponse(res, 200, "Gigs fetched", {
    gigs,
    pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum), limit: limitNum },
  });
});

// @desc    Get single gig by slug
// @route   GET /api/gigs/:slug
// @access  Public
const getGigBySlug = asyncHandler(async (req, res) => {
  const gig = await Gig.findOne({ slug: req.params.slug, isActive: true })
    .populate("sellerId", "name avatar country createdAt");

  if (!gig) { res.status(404); throw new Error("Gig not found"); }

  successResponse(res, 200, "Gig fetched", { gig });
});

// @desc    Get seller's own gigs
// @route   GET /api/gigs/my-gigs
// @access  Private (seller only)
const getMyGigs = asyncHandler(async (req, res) => {
  const gigs = await Gig.find({ sellerId: req.user._id }).sort({ createdAt: -1 });
  successResponse(res, 200, "My gigs fetched", { gigs });
});

// @desc    Update gig
// @route   PUT /api/gigs/:id
// @access  Private (seller only)
const updateGig = asyncHandler(async (req, res) => {
  const gig = await Gig.findById(req.params.id);
  if (!gig) { res.status(404); throw new Error("Gig not found"); }
  if (gig.sellerId.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error("Not authorized");
  }

  const {
    title, description, category, pricing, tags,
    positiveKeywords, extras, faqs, requirements, isActive,
  } = req.body;

  gig.title             = title             || gig.title;
  gig.description       = description       || gig.description;
  gig.category          = category          || gig.category;
  gig.pricing           = parseJSON(pricing)           || gig.pricing;
  gig.tags              = parseJSON(tags)              || gig.tags;
  gig.positiveKeywords  = parseJSON(positiveKeywords)  || gig.positiveKeywords;
  gig.extras            = parseJSON(extras)            || gig.extras;
  gig.faqs              = parseJSON(faqs)              || gig.faqs;
  gig.requirements      = parseJSON(requirements)      || gig.requirements;
  gig.isActive          = isActive !== undefined ? isActive : gig.isActive;

  if (req.files?.gigImages?.length)
    gig.images = [...gig.images, ...req.files.gigImages.map(f => f.path)];

  if (req.files?.gigVideo?.[0])
    gig.video = req.files.gigVideo[0].path;

  if (req.files?.gigDocuments?.length)
    gig.documents = [...gig.documents, ...req.files.gigDocuments.map(f => f.path)];

  const updatedGig = await gig.save();
  successResponse(res, 200, "Gig updated", { gig: updatedGig });
});

// @desc    Delete gig
// @route   DELETE /api/gigs/:id
// @access  Private (seller only)
const deleteGig = asyncHandler(async (req, res) => {
  const gig = await Gig.findById(req.params.id);
  if (!gig) { res.status(404); throw new Error("Gig not found"); }
  if (gig.sellerId.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error("Not authorized");
  }
  await gig.deleteOne();
  successResponse(res, 200, "Gig deleted successfully");
});

export { createGig, getGigs, getGigBySlug, getMyGigs, updateGig, deleteGig };