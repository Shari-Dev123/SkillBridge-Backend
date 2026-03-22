// Success response helper
export const successResponse = (res, statusCode, message, data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data,
  });
};

// Pagination helper
export const getPagination = (page, limit) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  return { pageNum, limitNum, skip };
};

// Calculate average rating
export const calcAverageRating = (totalRating, totalReviews) => {
  if (totalReviews === 0) return 0;
  return Math.round((totalRating / totalReviews) * 10) / 10;
};