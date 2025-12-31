"use strict";
/**
 * Input Validation Middleware
 * Validates request inputs using express-validator and Zod schemas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFile = exports.validateContentType = exports.sanitizeInputs = exports.validatePassword = exports.validateEnum = exports.validateUUID = exports.validateDate = exports.validateOptionalNumber = exports.validateRequiredNumber = exports.validateRequiredString = exports.validateEmail = exports.validateParams = exports.validateQuery = exports.validateBody = exports.handleValidationErrors = void 0;
const express_validator_1 = require("express-validator");
const zod_1 = require("zod");
const logger_1 = require("../lib/logger");
// ============================================================================
// VALIDATION RESULT HANDLER
// ============================================================================
/**
 * Middleware to handle validation results
 */
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        logger_1.logger.warn({
            path: req.path,
            method: req.method,
            errors: errors.array(),
        }, "Validation failed");
        res.status(400).json({
            success: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "Input validation failed",
                details: errors.array().map((err) => ({
                    field: err.path,
                    message: err.msg,
                })),
            },
        });
        return;
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
// ============================================================================
// ZOD SCHEMA VALIDATION MIDDLEWARE
// ============================================================================
/**
 * Create a middleware to validate request body against Zod schema
 */
const validateBody = (schema) => {
    return async (req, res, next) => {
        try {
            req.body = await schema.parseAsync(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                logger_1.logger.warn({
                    path: req.path,
                    method: req.method,
                    errors: error.issues,
                }, "Zod validation failed");
                res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Input validation failed",
                        details: error.issues.map((err) => ({
                            field: err.path.join("."),
                            message: err.message,
                        })),
                    },
                });
            }
            else {
                next(error);
            }
        }
    };
};
exports.validateBody = validateBody;
/**
 * Create a middleware to validate request query against Zod schema
 */
const validateQuery = (schema) => {
    return async (req, res, next) => {
        try {
            req.query = (await schema.parseAsync(req.query));
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                logger_1.logger.warn({
                    path: req.path,
                    method: req.method,
                    errors: error.issues,
                }, "Query validation failed");
                res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Query validation failed",
                        details: error.issues.map((err) => ({
                            field: err.path.join("."),
                            message: err.message,
                        })),
                    },
                });
            }
            else {
                next(error);
            }
        }
    };
};
exports.validateQuery = validateQuery;
/**
 * Create a middleware to validate request params against Zod schema
 */
const validateParams = (schema) => {
    return async (req, res, next) => {
        try {
            req.params = (await schema.parseAsync(req.params));
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                logger_1.logger.warn({
                    path: req.path,
                    method: req.method,
                    errors: error.issues,
                }, "Params validation failed");
                res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Route parameter validation failed",
                        details: error.issues.map((err) => ({
                            field: err.path.join("."),
                            message: err.message,
                        })),
                    },
                });
            }
            else {
                next(error);
            }
        }
    };
};
exports.validateParams = validateParams;
// ============================================================================
// COMMON VALIDATORS
// ============================================================================
/**
 * Email validation
 */
const validateEmail = () => {
    return (0, express_validator_1.body)("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Invalid email format");
};
exports.validateEmail = validateEmail;
/**
 * Required string validation
 */
const validateRequiredString = (field, minLength = 1) => {
    return (0, express_validator_1.body)(field)
        .trim()
        .notEmpty()
        .withMessage(`${field} is required`)
        .isLength({ min: minLength })
        .withMessage(`${field} must be at least ${minLength} characters`);
};
exports.validateRequiredString = validateRequiredString;
/**
 * Required number validation
 */
const validateRequiredNumber = (field) => {
    return (0, express_validator_1.body)(field)
        .notEmpty()
        .withMessage(`${field} is required`)
        .isNumeric()
        .withMessage(`${field} must be a number`);
};
exports.validateRequiredNumber = validateRequiredNumber;
/**
 * Optional number validation
 */
const validateOptionalNumber = (field) => {
    return (0, express_validator_1.body)(field)
        .optional()
        .isNumeric()
        .withMessage(`${field} must be a number`);
};
exports.validateOptionalNumber = validateOptionalNumber;
/**
 * Date validation
 */
const validateDate = (field) => {
    return (0, express_validator_1.body)(field)
        .isISO8601()
        .withMessage(`${field} must be a valid date in ISO 8601 format`);
};
exports.validateDate = validateDate;
/**
 * UUID validation
 */
const validateUUID = (field) => {
    return (0, express_validator_1.body)(field).isUUID().withMessage(`${field} must be a valid UUID`);
};
exports.validateUUID = validateUUID;
/**
 * Enum validation
 */
const validateEnum = (field, allowedValues) => {
    return (0, express_validator_1.body)(field)
        .isIn(allowedValues)
        .withMessage(`${field} must be one of: ${allowedValues.join(", ")}`);
};
exports.validateEnum = validateEnum;
/**
 * Password validation
 * Requires: minimum 8 characters, at least one uppercase, one lowercase, one number, one special character
 */
const validatePassword = () => {
    return (0, express_validator_1.body)("password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters")
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage("Password must contain uppercase, lowercase, number, and special character");
};
exports.validatePassword = validatePassword;
// ============================================================================
// REQUEST SANITIZATION
// ============================================================================
/**
 * Middleware to sanitize request inputs
 */
const sanitizeInputs = (req, _res, next) => {
    // Sanitize body
    if (req.body && typeof req.body === "object") {
        sanitizeObject(req.body);
    }
    // Sanitize query
    if (req.query && typeof req.query === "object") {
        sanitizeObject(req.query);
    }
    next();
};
exports.sanitizeInputs = sanitizeInputs;
/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj) {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            // Remove null bytes and scripts
            if (typeof value === "string") {
                obj[key] = value
                    .replace(/\0/g, "") // Remove null bytes
                    .replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove script tags
                    .trim();
            }
            else if (typeof value === "object" && value !== null) {
                sanitizeObject(value);
            }
        }
    }
}
// ============================================================================
// CONTENT TYPE VALIDATION
// ============================================================================
/**
 * Validate that request has expected content type
 */
const validateContentType = (expectedType) => (req, res, next) => {
    const contentType = req.get("content-type");
    if (!contentType || !contentType.includes(expectedType)) {
        res.status(415).json({
            success: false,
            error: {
                code: "UNSUPPORTED_MEDIA_TYPE",
                message: `Expected content-type: ${expectedType}`,
            },
        });
        return;
    }
    next();
};
exports.validateContentType = validateContentType;
// ============================================================================
// FILE UPLOAD VALIDATION
// ============================================================================
/**
 * Validate uploaded file
 */
const validateFile = (maxSizeMB = 10, allowedMimes = ["application/pdf", "image/jpeg", "image/png"]) => {
    return (req, res, next) => {
        // This would typically work with multer middleware
        // Example validation logic
        const reqWithFile = req;
        if (!reqWithFile.file) {
            res.status(400).json({
                success: false,
                error: {
                    code: "MISSING_FILE",
                    message: "File is required",
                },
            });
            return;
        }
        const fileSizeMB = reqWithFile.file.size / (1024 * 1024);
        if (fileSizeMB > maxSizeMB) {
            res.status(413).json({
                success: false,
                error: {
                    code: "FILE_TOO_LARGE",
                    message: `File size must not exceed ${maxSizeMB}MB`,
                },
            });
            return;
        }
        if (!allowedMimes.includes(reqWithFile.file.mimetype)) {
            res.status(400).json({
                success: false,
                error: {
                    code: "INVALID_FILE_TYPE",
                    message: `Allowed file types: ${allowedMimes.join(", ")}`,
                },
            });
            return;
        }
        next();
    };
};
exports.validateFile = validateFile;
