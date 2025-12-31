/**
 * Password Hashing & Verification
 * Handles secure password operations
 */

import bcrypt from "bcrypt";
import { logger } from "./logger";

const SALT_ROUNDS = 10;

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    logger.debug("Password hashed");
    return hash;
  } catch (error) {
    logger.error({ error: error as Error }, "Failed to hash password");
    throw error;
  }
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    const isValid = await bcrypt.compare(password, hash);
    return isValid;
  } catch (error) {
    logger.error({ error: error as Error }, "Failed to verify password");
    throw error;
  }
}
