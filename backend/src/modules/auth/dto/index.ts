/**
 * Authentication DTOs
 * Request/Response contracts for auth endpoints
 */

import { UserRole } from '../../../generated/enums';

export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface LoginResponseDTO {
  success: true;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      branchId?: string | null;
      branch?: {
        id: string;
        name: string;
        code: string;
        city: string;
        address: string | null;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
      } | null;
      permissions: string[];
    };
  };
}

export interface MeResponseDTO {
  success: true;
  data: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    branchId?: string | null;
    permissions: string[];
    createdAt: string;
  };
}

export interface RegisterRequestDTO {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: UserRole;
  branchId?: string | null;
}

export interface RegisterResponseDTO {
  success: true;
  data: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

export interface RefreshTokenRequestDTO {
  token: string;
}

export interface RefreshTokenResponseDTO {
  success: true;
  data: {
    token: string;
  };
}
