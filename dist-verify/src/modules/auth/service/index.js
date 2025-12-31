"use strict";
/**
 * Authentication Service
 * Handles login, registration, and user management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const db_1 = require("../../../lib/db");
const errors_1 = require("../../../lib/errors");
const password_1 = require("../../../lib/password");
const jwt_1 = require("../../../lib/jwt");
const logger_1 = require("../../../lib/logger");
const permission_service_1 = require("./permission.service");
class AuthService {
    /**
     * Login user with email and password
     */
    async login(request) {
        const { email, password } = request;
        // Validate input
        if (!email || !password) {
            throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, "Email and password are required");
        }
        // Find user by email
        const user = await db_1.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: {
                branch: true,
            },
        });
        if (!user) {
            throw new errors_1.AppError(errors_1.ErrorCode.UNAUTHORIZED, 401, "Invalid email or password");
        }
        // Check if user has a password hash
        if (!user.passwordHash) {
            throw new errors_1.AppError(errors_1.ErrorCode.UNAUTHORIZED, 401, "Account not properly configured. Please contact administrator.");
        }
        // Verify password
        const isPasswordValid = await (0, password_1.verifyPassword)(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new errors_1.AppError(errors_1.ErrorCode.UNAUTHORIZED, 401, "Invalid email or password");
        }
        // Generate token
        const token = (0, jwt_1.generateToken)({
            userId: user.id,
            email: user.email,
            role: user.role,
            branchId: user.branchId,
        });
        logger_1.logger.info({ userId: user.id, email: user.email }, "User logged in");
        // Get user permissions
        const permissions = await permission_service_1.PermissionService.getUserPermissions(user.id);
        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                branchId: user.branchId,
                branch: user.branch,
                permissions,
            },
        };
    }
    /**
     * Register new user
     */
    async register(request) {
        const { email, password, name, role, phone, branchId } = request;
        // Validate input
        if (!email || !password || !name) {
            throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, "Email, password, and name are required");
        }
        // Check if user already exists
        const existingUser = await db_1.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (existingUser) {
            throw new errors_1.AppError(errors_1.ErrorCode.ALREADY_EXISTS, 409, "User with this email already exists");
        }
        // Determine role
        const roleCode = role || 'cashier';
        const roleToAssign = await db_1.prisma.role.findUnique({
            where: { code: roleCode },
        });
        if (!roleToAssign) {
            throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, `Role '${roleCode}' not found`);
        }
        // Hash password
        const passwordHash = await (0, password_1.hashPassword)(password);
        // Create user and assign role in a transaction
        const user = await db_1.prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email: email.toLowerCase(),
                    passwordHash,
                    name,
                    phone,
                    role: role || 'cashier',
                    branchId,
                },
            });
            await tx.roleAssignment.create({
                data: {
                    userId: newUser.id,
                    roleId: roleToAssign.id,
                },
            });
            return newUser;
        });
        logger_1.logger.info({ userId: user.id, email: user.email }, "User registered");
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        };
    }
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        if (!userId) {
            throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, "User ID is required");
        }
        const user = await db_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, `User with ID ${userId} not found`);
        }
        // Get user permissions
        const permissions = await permission_service_1.PermissionService.getUserPermissions(user.id);
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || "user",
            branchId: user.branchId,
            permissions,
            createdAt: user.createdAt.toISOString(),
        };
    }
    /**
     * Update user profile
     */
    async updateUser(userId, data) {
        if (!userId) {
            throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, "User ID is required");
        }
        const user = await db_1.prisma.user.update({
            where: { id: userId },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.role && { role: data.role }),
            },
        });
        logger_1.logger.info({ userId: user.id }, "User updated");
        // Get permissions
        const permissions = await permission_service_1.PermissionService.getUserPermissions(user.id);
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || "user",
            branchId: user.branchId,
            permissions,
        };
    }
    /**
     * Verify token payload
     */
    async verifyTokenPayload(payload) {
        const user = await db_1.prisma.user.findUnique({
            where: { id: payload.userId },
        });
        if (!user) {
            throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "User not found");
        }
        // Get permissions
        const permissions = await permission_service_1.PermissionService.getUserPermissions(user.id);
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || "user",
            branchId: user.branchId,
            permissions,
        };
    }
}
exports.AuthService = AuthService;
