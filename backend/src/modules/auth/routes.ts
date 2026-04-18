/**
 * Authentication Routes
 * Handles all auth-related endpoints
 */

import { Router, Request, Response, NextFunction } from "express";
import { AuthController } from "./controller/auth.controller";
import { authMiddleware } from "../../lib/auth";

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
router.post("/login", (req: Request, res: Response, next: NextFunction) =>
  authController.login(req, res, next),
);

/**
 * POST /auth/register
 * Register new user
 */
router.post("/register", (req: Request, res: Response, next: NextFunction) =>
  authController.register(req, res, next),
);

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
  (req: Request, res: Response, next: NextFunction) =>
    authController.updateProfile(req, res, next),
);

export default router;
