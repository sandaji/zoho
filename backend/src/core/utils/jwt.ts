/**
 * JWT Token Management
 * Handles token generation, verification, and decoding
 */

import jwt from "jsonwebtoken";
import { createHmac } from "crypto";
import { logger } from "./logger";
import { TokenPayload } from "../../types";

if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable is not set. Refusing to start with an insecure default.",
  );
}

const JWT_SECRET = process.env.JWT_SECRET;
// JWT_EXPIRES_IN is the canonical name (it matches config/env.ts). JWT_EXPIRY
// is still honoured as a legacy fallback so existing .env files keep working.
const JWT_EXPIRY =
  process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRY || "24h";
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || "30d";
// Refresh tokens are signed with their own key so an access token can never be
// used as a refresh token (or the reverse). If JWT_REFRESH_SECRET is not set,
// a distinct key is derived from JWT_SECRET.
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  createHmac("sha256", JWT_SECRET).update("refresh-token-v1").digest("hex");

/**
 * Generate JWT token
 */
export function generateToken(
  payload: Omit<TokenPayload, "iat" | "exp">,
): string {
  try {
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRY as string | number,
    } as jwt.SignOptions);
    logger.debug({ userId: payload.userId }, "Token generated");
    return token;
  } catch (error) {
    logger.error({ error: error as Error }, "Failed to generate token");
    throw error;
  }
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    }) as TokenPayload;
    return decoded;
  } catch (error) {
    logger.warn("Token verification failed");
    throw error;
  }
}

/**
 * Generate a long-lived refresh token.
 * It carries only the user id; role, branch and permissions are re-read from
 * the database when it is exchanged, so privilege changes take effect.
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: "refresh" }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY as string | number,
  } as jwt.SignOptions);
}

/**
 * Verify a refresh token and return the user id it was issued for.
 * Throws if the token is invalid, expired or not a refresh token.
 */
export function verifyRefreshToken(token: string): { userId: string } {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
    algorithms: ["HS256"],
  }) as { userId?: string; type?: string };
  if (decoded.type !== "refresh" || !decoded.userId) {
    throw new Error("Not a refresh token");
  }
  return { userId: decoded.userId };
}

/**
 * Decode token without verification
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.decode(token) as TokenPayload | null;
    return decoded;
  } catch (error) {
    logger.warn({ error: error as Error }, "Failed to decode token");
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    return decoded.exp < Date.now() / 1000;
  } catch {
    return true;
  }
}
