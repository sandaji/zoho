// backend/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';
import { TokenPayload } from '../types';
import { AppError, ErrorCode } from '../lib/errors';

/**
 * Middleware to authenticate JWT token from Authorization header
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        401,
        'Authorization header is required'
      );
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'bearer') {
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        401,
        'Invalid authorization format. Use: Bearer <token>'
      );
    }

    const token = parts[1];
    if (!token) {
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        401,
        'Token is required'
      );
    }

    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(
        ErrorCode.UNAUTHORIZED,
        401,
        'Invalid or expired token',
        { originalError: (error as Error).message }
      ));
    }
  }
};

/**
 * Middleware to check if user has required roles
 * @param requiredRoles - Array of roles that are allowed
 */
export const authorize = (requiredRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(
        ErrorCode.UNAUTHORIZED,
        401,
        'User not authenticated'
      ));
      return;
    }

    // Super admin bypass
    if (req.user.role === 'admin') {
      next();
      return;
    }

    const userRole = req.user.role;
    
    if (!requiredRoles.includes(userRole)) {
      next(new AppError(
        ErrorCode.FORBIDDEN,
        403,
        'Insufficient permissions',
        { requiredRoles, userRole }
      ));
      return;
    }

    next();
  };
};

/**
 * Placeholder middleware for legacy code
 * This would normally decode JWT and attach user to req
 */
export const checkJwt = (req: Request, _res: Response, next: NextFunction): void => {
  // This is replaced by authenticate middleware above
  // Keeping for backward compatibility
  if (!req.user) {
    // Mock user for demonstration purposes only
    req.user = {
      userId: 'user_123',
      email: 'demo@example.com',
      role: 'manager' as any,
      branchId: 'branch_abc',
    } as TokenPayload;
  }
  next();
};

/**
 * Middleware to check if user has one of the required roles
 * @param requiredRoles - Array of roles that are allowed
 */
export const hasRole = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Super admin bypass
    if (req.user?.role === 'admin') {
      next();
      return;
    }

    const userRole = req.user?.role;

    if (!userRole || !requiredRoles.includes(userRole)) {
      res.status(403).json({
        error: 'Forbidden: You do not have permission to perform this action.',
      });
      return;
    }

    next();
  };
};
