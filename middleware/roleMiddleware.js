const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Not authorized");
    }

    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(
        `Access denied. Only ${roles.join(" or ")} can do this.`
      );
    }

    next();
  };
};

export default requireRole;