export const RoleMiddleware = (...allowedRoles) => (req, res, next) => {
  const userRoles = req.user?.roles || [];
  if (!userRoles.some((r) => allowedRoles.includes(r))) {
    return res.status(403).json({ success: false, message: "Forbidden: insufficient role" });
  }
  next();
};

export const ActiveMiddleware = (req, res, next) => {
  // Blloko VETËM kur is_active === false. Nëse mungon (token i vjetër), lejo.
  if (req.user?.is_active === false) {
    return res.status(403).json({ success: false, message: "Account is inactive" });
  }
  next();
};
