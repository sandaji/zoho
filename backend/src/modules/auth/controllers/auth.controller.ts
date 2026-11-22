/**
 * Authentication Controller
 * Handles HTTP requests for auth endpoints
 */

import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import type {
  LoginRequestDTO,
  LoginResponseDTO,
  MeResponseDTO,
} from "../dtos";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * POST /auth/login
   * Login user with email and password
   */
  async login(
    req: Request<{}, {}, LoginRequestDTO>,
    res: Response<LoginResponseDTO>,
    next: NextFunction,
  ): Promise<void> {
    try {
      const data = await this.authService.login(req.body);

      res.json({
        success: true,
        data: {
          token: data.token,
          refreshToken: data.refreshToken,
          user: data.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /auth/me
   * Get current authenticated user
   */
  async me(
    req: Request,
    res: Response<MeResponseDTO>,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new Error("User not authenticated");
      }

      const user = await this.authService.getUserById(req.user.userId);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /auth/profile
   * Update user profile
   */
  async updateProfile(
    req: Request<{}, {}, { name?: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new Error("User not authenticated");
      }

      // Only the name is self-editable. Role changes must go through an
      // admin-only flow, never the self-service profile endpoint.
      const user = await this.authService.updateUser(req.user.userId, {
        name: req.body?.name,
      });

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/refresh
   * Refresh authentication token
   */
  async refresh(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Authenticated by the refresh token in the body (not the access
      // token, which may already have expired).
      const { refreshToken } = (req.body ?? {}) as { refreshToken?: string };
      const data = await this.authService.refresh(refreshToken ?? "");

      res.json({
        success: true,
        data: {
          token: data.token,
          refreshToken: data.refreshToken,
          user: data.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
