"use strict";
/**
 * Password Hashing & Verification
 * Handles secure password operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const bcrypt_1 = __importDefault(require("bcrypt"));
const logger_1 = require("./logger");
const SALT_ROUNDS = 10;
/**
 * Hash password
 */
async function hashPassword(password) {
    try {
        const hash = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        logger_1.logger.debug("Password hashed");
        return hash;
    }
    catch (error) {
        logger_1.logger.error({ error: error }, "Failed to hash password");
        throw error;
    }
}
/**
 * Verify password against hash
 */
async function verifyPassword(password, hash) {
    try {
        const isValid = await bcrypt_1.default.compare(password, hash);
        return isValid;
    }
    catch (error) {
        logger_1.logger.error({ error: error }, "Failed to verify password");
        throw error;
    }
}
