/**
 * JWT Token Management
 * Handles token generation, verification, and decoding
 */

import jwt from "jsonwebtoken";
import { logger } from "./logger";
import { TokenPayload } from "../types";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-key-change-in-production";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "24h";

/**
 * Generate JWT token
 */
export function generateToken(
  payload: Omit<TokenPayload, "iat" | "exp">
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
    logger.warn({ token: token.substring(0, 20) }, "Token verification failed");
    throw error;
  }
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
