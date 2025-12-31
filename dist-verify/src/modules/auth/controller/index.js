"use strict";
/**
 * Authentication Controller
 * Handles HTTP requests for auth endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const service_1 = require("../service");
class AuthController {
    constructor() {
        this.authService = new service_1.AuthService();
    }
    /**
     * POST /auth/login
     * Login user with email and password
     */
    async login(req, res, next) {
        try {
            const data = await this.authService.login(req.body);
            res.json({
                success: true,
                data: {
                    token: data.token,
                    user: data.user,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /auth/register
     * Register new user
     */
    async register(req, res, next) {
        try {
            const data = await this.authService.register(req.body);
            res.status(201).json({
                success: true,
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /auth/me
     * Get current authenticated user
     */
    async me(req, res, next) {
        try {
            if (!req.user) {
                throw new Error("User not authenticated");
            }
            const user = await this.authService.getUserById(req.user.userId);
            res.json({
                success: true,
                data: user,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PATCH /auth/profile
     * Update user profile
     */
    async updateProfile(req, res, next) {
        try {
            if (!req.user) {
                throw new Error("User not authenticated");
            }
            const user = await this.authService.updateUser(req.user.userId, req.body);
            res.json({
                success: true,
                data: user,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
