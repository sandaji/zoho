/**
 * Authentication Service
 * Handles login, registration, and user management
 */

import type { LoginRequestDTO, RegisterRequestDTO } from "../dtos";
import { prisma } from "@core/database/db";
import { AppError, ErrorCode } from "@core/errors/errors";
import { hashPassword, verifyPassword } from "@core/utils/password";
import {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "@core/utils/jwt";
import { TokenPayload } from "../../../types";
import { logger } from "@core/utils/logger";
import { PermissionService } from "./permission.service";

// Public self-registration always receives this least-privileged role.
const DEFAULT_REGISTRATION_ROLE = "cashier";

export class AuthService {
  /**
   * Login user with email and password
   */
  async login(request: LoginRequestDTO) {
    const { email, password } = request;

    // Validate input
    if (!email || !password) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "Email and password are required",
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email. Case-insensitive on purpose: emails saved by other
    // code paths (e.g. createEmployee, before it normalised them) may contain
    // uppercase letters, and lowercasing only the input made those accounts
    // impossible to find ("Invalid email or password").
    const user = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      include: {
        branch: true,
      },
    });

    if (!user) {
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        401,
        "Invalid email or password",
      );
    }

    // Check if user has a password hash
    if (!user.passwordHash) {
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        401,
        "Account not properly configured. Please contact administrator.",
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        401,
        "Invalid email or password",
      );
    }

    // Get user permissions and roles
    const permissions = await PermissionService.getUserPermissions(user.id);
    const roles = await PermissionService.getUserRoles(user.id);

    // Add primary role to roles list if not present (legacy support)
    if (user.role && !roles.includes(user.role)) {
      roles.push(user.role);
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as any,
      roles,
      branchId: user.branchId,
    });

    const refreshToken = generateRefreshToken(user.id);

    logger.info({ userId: user.id, email: user.email }, "User logged in");

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as any,
        roles,
        branchId: user.branchId,
        branch: user.branch,
        permissions,
      },
    };
  }

  /**
   * Register new user
   */
  async register(request: RegisterRequestDTO) {
    const { email, password, name, phone, branchId } = request;

    // Validate input
    if (!email || !password || !name) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "Email, password, and name are required",
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError(
        ErrorCode.ALREADY_EXISTS,
        409,
        "User with this email already exists",
      );
    }

    // The role is never taken from the request: public registration always
    // gets the least-privileged role. Elevation needs an admin workflow.
    const roleCode = DEFAULT_REGISTRATION_ROLE;
    const roleToAssign = await prisma.role.findUnique({
      where: { code: roleCode },
    });

    if (!roleToAssign) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        404,
        `Role '${roleCode}' not found`,
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user and assign role in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash: passwordHash,
          name,
          phone,
          role: roleCode,
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

    logger.info({ userId: user.id, email: user.email }, "User registered");

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      roles: [roleCode], // Newly registered user has one role
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    if (!userId) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "User ID is required",
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        404,
        `User with ID ${userId} not found`,
      );
    }

    // Get user permissions and roles
    const permissions = await PermissionService.getUserPermissions(user.id);
    const roles = await PermissionService.getUserRoles(user.id);

    // Add primary role to roles list if not present (legacy support)
    if (user.role && !roles.includes(user.role)) {
      roles.push(user.role);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: (user.role || "user") as any,
      roles,
      branchId: user.branchId,
      permissions,
      createdAt: user.createdAt.toISOString(),
    };
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, data: { name?: string }) {
    if (!userId) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "User ID is required",
      );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
      },
    });

    logger.info({ userId: user.id }, "User updated");

    // Get permissions and roles
    const permissions = await PermissionService.getUserPermissions(user.id);
    const roles = await PermissionService.getUserRoles(user.id);

    // Add primary role to roles list if not present (legacy support)
    if (user.role && !roles.includes(user.role)) {
      roles.push(user.role);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || "user",
      roles,
      branchId: user.branchId,
      permissions,
    };
  }

  /**
   * Verify token payload
   */
  async verifyTokenPayload(payload: TokenPayload) {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "User not found");
    }

    // Get permissions and roles
    const permissions = await PermissionService.getUserPermissions(user.id);
    const roles = await PermissionService.getUserRoles(user.id);

    // Add primary role to roles list if not present (legacy support)
    if (user.role && !roles.includes(user.role)) {
      roles.push(user.role);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || "user",
      roles,
      branchId: user.branchId,
      permissions,
    };
  }

  /**
   * Switch branch context for an admin user
   * Issues a new scoped JWT with the target branchId
   */
  async switchBranch(adminUserId: string, targetBranchId: string) {
    const user = await prisma.user.findUnique({
      where: { id: adminUserId },
      include: { branch: true },
    });

    if (!user) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "User not found");
    }

    const roles = await PermissionService.getUserRoles(user.id);
    if (user.role && !roles.includes(user.role)) roles.push(user.role);
    if (!roles.includes("admin") && !roles.includes("super_admin")) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        403,
        "Only admin users can switch branch context",
      );
    }

    let branch = null;
    let actualTargetBranchId = null;

    if (targetBranchId !== "all") {
      branch = await prisma.branch.findUnique({
        where: { id: targetBranchId },
      });
      if (!branch) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Target branch not found");
      }
      if (!branch.isActive) {
        throw new AppError(
          ErrorCode.OPERATION_NOT_ALLOWED,
          422,
          "Cannot switch to an inactive branch",
        );
      }
      actualTargetBranchId = targetBranchId;
    }

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as any,
      roles,
      branchId: actualTargetBranchId,
    };

    const token = generateToken(tokenPayload);
    const permissions = await PermissionService.getUserPermissions(user.id);
    logger.info(
      { adminUserId, targetBranchId },
      "Admin switched branch context",
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as any,
        roles,
        branchId: actualTargetBranchId,
        branch: branch ? { id: branch.id, name: branch.name } : null,
        permissions,
      },
    };
  }

  /**
   * Refresh user token
   * Exchanges a valid refresh token for a new access token and a new refresh
   * token. This works after the access token has expired. Role, branch and
   * permissions are re-read from the database.
   */
  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        401,
        "Refresh token is required",
      );
    }

    let userId: string;
    try {
      userId = verifyRefreshToken(refreshToken).userId;
    } catch {
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        401,
        "Invalid or expired refresh token",
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { branch: true },
    });

    if (!user) {
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        401,
        "Invalid or expired refresh token",
      );
    }

    // Get permissions for the new token
    const permissions = await PermissionService.getUserPermissions(user.id);
    const roles = await PermissionService.getUserRoles(user.id);

    // Add primary role if not in roles list
    if (user.role && !roles.includes(user.role)) {
      roles.push(user.role);
    }

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: (user.role || "user") as any,
      roles,
      branchId: user.branchId,
    };

    const token = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(user.id);
    logger.info({ userId: user.id }, "Token refreshed for user");

    return {
      token,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: (user.role || "user") as any,
        roles,
        branchId: user.branchId,
        branch: user.branch,
        permissions,
      },
    };
  }
}
