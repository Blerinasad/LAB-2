export const RoleMiddleware =
  (...allowedRoles) =>
  (req, res, next) => {
    const userRoles = req.user?.roles || [];
    if (!userRoles.some((r) => allowedRoles.includes(r))) {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden: insufficient role" });
    }
    next();
  };
