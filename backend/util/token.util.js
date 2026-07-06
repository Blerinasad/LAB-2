import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

export const generateAccessToken = (payload) =>
  jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "15m",
  });

export const generateRefreshToken = (payload) =>
  // jti (JWT ID) i rastësishëm — pa këtë, dy refresh tokens të nxjerrë brenda
  // së njëjtës sekondë (i njëjti `iat`) do të dilnin byte-për-byte identikë,
  // gjë që shkaktonte "Duplicate entry" te RefreshTokens.uq_token kur
  // /api/auth/refresh-token thirrej menjëherë pas login-it.
  jwt.sign({ ...payload, jti: crypto.randomUUID() }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES || "7d",
  });

export const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

export const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
