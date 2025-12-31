/**
 * Input Validation Middleware
 * Validates request inputs using express-validator and Zod schemas
 */

import { Request, Response, NextFunction } from "express";
import { validationResult, body, ValidationChain } from "express-validator";
import { ZodSchema, ZodError } from "zod";
import { logger } from "../lib/logger";

// ============================================================================
// VALIDATION RESULT HANDLER
// ============================================================================

/**
 * Middleware to handle validation results
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.warn(
      {
        path: req.path,
        method: req.method,
        errors: errors.array(),
      },
      "Validation failed"
    );

    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Input validation failed",
        details: errors.array().map((err) => ({
          field: (err as any).path,
          message: err.msg,
        })),
      },
    });
    return;
  }

  next();
};

// ============================================================================
// ZOD SCHEMA VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Create a middleware to validate request body against Zod schema
 */
export const validateBody = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn(
          {
            path: req.path,
            method: req.method,
            errors: error.issues,
          },
          "Zod validation failed"
        );

        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Input validation failed",
            details: error.issues.map((err: any) => ({
              field: err.path.join("."),
              message: err.message,
            })),
          },
        });
      } else {
        next(error);
      }
    }
  };
};

/**
 * Create a middleware to validate request query against Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = (await schema.parseAsync(req.query)) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn(
          {
            path: req.path,
            method: req.method,
            errors: error.issues,
          },
          "Query validation failed"
        );

        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Query validation failed",
            details: error.issues.map((err: any) => ({
              field: err.path.join("."),
              message: err.message,
            })),
          },
        });
      } else {
        next(error);
      }
    }
  };
};

/**
 * Create a middleware to validate request params against Zod schema
 */
export const validateParams = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = (await schema.parseAsync(req.params)) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn(
          {
            path: req.path,
            method: req.method,
            errors: error.issues,
          },
          "Params validation failed"
        );

        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Route parameter validation failed",
            details: error.issues.map((err: any) => ({
              field: err.path.join("."),
              message: err.message,
            })),
          },
        });
      } else {
        next(error);
      }
    }
  };
};

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

/**
 * Email validation
 */
export const validateEmail = (): ValidationChain => {
  return body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Invalid email format");
};

/**
 * Required string validation
 */
export const validateRequiredString = (
  field: string,
  minLength: number = 1
): ValidationChain => {
  return body(field)
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .isLength({ min: minLength })
    .withMessage(`${field} must be at least ${minLength} characters`);
};

/**
 * Required number validation
 */
export const validateRequiredNumber = (field: string): ValidationChain => {
  return body(field)
    .notEmpty()
    .withMessage(`${field} is required`)
    .isNumeric()
    .withMessage(`${field} must be a number`);
};

/**
 * Optional number validation
 */
export const validateOptionalNumber = (field: string): ValidationChain => {
  return body(field)
    .optional()
    .isNumeric()
    .withMessage(`${field} must be a number`);
};

/**
 * Date validation
 */
export const validateDate = (field: string): ValidationChain => {
  return body(field)
    .isISO8601()
    .withMessage(`${field} must be a valid date in ISO 8601 format`);
};

/**
 * UUID validation
 */
export const validateUUID = (field: string): ValidationChain => {
  return body(field).isUUID().withMessage(`${field} must be a valid UUID`);
};

/**
 * Enum validation
 */
export const validateEnum = (
  field: string,
  allowedValues: string[]
): ValidationChain => {
  return body(field)
    .isIn(allowedValues)
    .withMessage(`${field} must be one of: ${allowedValues.join(", ")}`);
};

/**
 * Password validation
 * Requires: minimum 8 characters, at least one uppercase, one lowercase, one number, one special character
 */
export const validatePassword = (): ValidationChain => {
  return body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain uppercase, lowercase, number, and special character"
    );
};

// ============================================================================
// REQUEST SANITIZATION
// ============================================================================

/**
 * Middleware to sanitize request inputs
 */
export const sanitizeInputs = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
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

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      // Remove null bytes and scripts
      if (typeof value === "string") {
        obj[key] = value
          .replace(/\0/g, "") // Remove null bytes
          .replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove script tags
          .trim();
      } else if (typeof value === "object" && value !== null) {
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
export const validateContentType =
  (expectedType: string) =>
  (req: Request, res: Response, next: NextFunction): void => {
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

// ============================================================================
// FILE UPLOAD VALIDATION
// ============================================================================

/**
 * Validate uploaded file
 */
export const validateFile = (
  maxSizeMB: number = 10,
  allowedMimes: string[] = ["application/pdf", "image/jpeg", "image/png"]
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // This would typically work with multer middleware
    // Example validation logic
    const reqWithFile = req as any;
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
