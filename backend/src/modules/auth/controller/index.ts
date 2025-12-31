/**
 * Authentication Controller
 * Handles HTTP requests for auth endpoints
 */

import { Request, Response, NextFunction } from "express";
import { AuthService } from "../service";
import type {
  LoginRequestDTO,
  LoginResponseDTO,
  RegisterRequestDTO,
  RegisterResponseDTO,
  MeResponseDTO,
} from "../dto";

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
    next: NextFunction
  ): Promise<void> {
    try {
      const data = await this.authService.login(req.body);

      res.json({
        success: true,
        data: {
          token: data.token,
          user: data.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/register
   * Register new user
   */
  async register(
    req: Request<{}, {}, RegisterRequestDTO>,
    res: Response<RegisterResponseDTO>,
    next: NextFunction
  ): Promise<void> {
    try {
      const data = await this.authService.register(req.body);

      res.status(201).json({
        success: true,
        data,
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
    next: NextFunction
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
    req: Request<{}, {}, { name?: string; role?: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new Error("User not authenticated");
      }

      const user = await this.authService.updateUser(req.user.userId, req.body);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}
