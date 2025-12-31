"use strict";
/**
 * JWT Token Management
 * Handles token generation, verification, and decoding
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.decodeToken = decodeToken;
exports.isTokenExpired = isTokenExpired;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("./logger");
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-change-in-production";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "24h";
/**
 * Generate JWT token
 */
function generateToken(payload) {
    try {
        const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRY,
        });
        logger_1.logger.debug({ userId: payload.userId }, "Token generated");
        return token;
    }
    catch (error) {
        logger_1.logger.error({ error: error }, "Failed to generate token");
        throw error;
    }
}
/**
 * Verify JWT token
 */
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET, {
            algorithms: ["HS256"],
        });
        return decoded;
    }
    catch (error) {
        logger_1.logger.warn({ token: token.substring(0, 20) }, "Token verification failed");
        throw error;
    }
}
/**
 * Decode token without verification
 */
function decodeToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.decode(token);
        return decoded;
    }
    catch (error) {
        logger_1.logger.warn({ error: error }, "Failed to decode token");
        return null;
    }
}
/**
 * Check if token is expired
 */
function isTokenExpired(token) {
    try {
        const decoded = decodeToken(token);
        if (!decoded || !decoded.exp)
            return true;
        return decoded.exp < Date.now() / 1000;
    }
    catch {
        return true;
    }
}
