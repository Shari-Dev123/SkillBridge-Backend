import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = "skillbridge";
    let resource_type = "image";
    let allowed_formats = ["jpg", "jpeg", "png", "webp"];

    if (file.fieldname === "avatar") {
      folder = "skillbridge/avatars";
    } else if (file.fieldname === "gigImages") {
      folder = "skillbridge/gigs";
    } else if (file.fieldname === "gigVideo") {
      folder = "skillbridge/gig-videos";
      resource_type = "video";
      allowed_formats = ["mp4", "mov", "avi", "webm"];
    } else if (file.fieldname === "gigDocuments") {
      folder = "skillbridge/gig-docs";
      resource_type = "raw";
      allowed_formats = ["pdf"];
    } else if (file.fieldname === "portfolio") {
      folder = "skillbridge/portfolio";
    }

    return {
      folder,
      resource_type,
      allowed_formats,
      ...(resource_type === "image" && {
        transformation: [{ width: 1200, crop: "limit" }],
      }),
    };
  },
});

const fileFilter = (req, file, cb) => {
  const imageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const videoTypes = ["video/mp4", "video/quicktime", "video/avi", "video/webm"];
  const docTypes = ["application/pdf"];

  if (file.fieldname === "gigVideo" && videoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else if (file.fieldname === "gigDocuments" && docTypes.includes(file.mimetype)) {
    cb(null, true);
  } else if (imageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

export default upload;