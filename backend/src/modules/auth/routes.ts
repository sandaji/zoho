/**
 * Authentication Routes
 * Handles all auth-related endpoints
 */

import { Router, Request, Response, NextFunction } from "express";
import { AuthController } from "./controllers/auth.controller";
import { authMiddleware } from "@core/middleware/auth";
import { validateBody } from "../../middleware/validation.middleware";
import {
  loginSchema,
  updateProfileSchema,
  refreshSchema,
} from "./auth.validation";

const router = Router();

// Initialize controller
const authController = new AuthController();

// ============================================================================
// PUBLIC ROUTES (No Auth Required)
// ============================================================================

/**
 * POST /auth/login
 * Login user with email and password
 */
router.post(
  "/login",
  validateBody(loginSchema),
  (req: Request, res: Response, next: NextFunction) =>
    authController.login(req, res, next),
);

// NOTE: Public self-registration is intentionally disabled. Accounts are
// created by administrators (e.g. through employee/user management).

// ============================================================================
// PROTECTED ROUTES (Auth Required)
// ============================================================================

/**
 * GET /auth/me
 * Get current authenticated user
 */
router.get(
  "/me",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    authController.me(req, res, next),
);

/**
 * PATCH /auth/profile
 * Update user profile
 */
router.patch(
  "/profile",
  authMiddleware,
  validateBody(updateProfileSchema),
  (req: Request, res: Response, next: NextFunction) =>
    authController.updateProfile(req, res, next),
);

/**
 * POST /auth/refresh
 * Exchange a refresh token (request body) for a new access token.
 * Deliberately NOT behind authMiddleware: the access token may have expired.
 */
router.post(
  "/refresh",
  validateBody(refreshSchema),
  (req: Request, res: Response, next: NextFunction) =>
    authController.refresh(req, res, next),
);

export default router;
