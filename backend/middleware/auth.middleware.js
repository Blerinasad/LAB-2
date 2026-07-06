import { verifyAccessToken } from "../util/token.util.js";

export const AuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access token missing",
    });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    req.user = {
      id: decoded.id || decoded.user_id,
      email: decoded.email,
      roles: decoded.roles || [],
      is_active: decoded.is_active === undefined ? true : decoded.is_active,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
};
