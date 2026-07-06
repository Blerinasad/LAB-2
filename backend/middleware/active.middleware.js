export const ActiveMiddleware = (req, res, next) => {
  if (req.user?.is_active === false) {
    return res
      .status(403)
      .json({ success: false, message: "Account is inactive" });
  }
  next();
};
