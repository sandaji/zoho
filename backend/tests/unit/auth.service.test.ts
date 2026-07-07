import { jest, describe, beforeEach, it, expect } from "@jest/globals";

const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockFindMany = jest.fn();
const mockHashPassword = jest.fn();
const mockVerifyPassword = jest.fn();
const mockGenerateToken = jest.fn();

jest.mock("../../src/lib/db", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      create: mockCreate,
    },
    roleAssignment: {
      findMany: mockFindMany,
    },
  },
}));

jest.mock("../../src/lib/password", () => ({
  hashPassword: mockHashPassword,
  verifyPassword: mockVerifyPassword,
}));

jest.mock("../../src/lib/jwt", () => ({
  generateToken: mockGenerateToken,
}));

import { AuthService } from "../../src/modules/auth/service/auth.service";

describe("AuthService login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateToken.mockReturnValue("test-token");
    mockVerifyPassword.mockResolvedValue(true);
    mockHashPassword.mockResolvedValue("hashed-password");
    mockFindMany.mockResolvedValue([]);
  });

  it("creates a default admin user when no matching user exists and the login uses the default admin email", async () => {
    mockFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: "user-1",
      email: "admin@zoho.co.ke",
      name: "Admin User",
      role: "admin",
      passwordHash: "hashed-password",
      branchId: null,
      branch: null,
    });

    const service = new AuthService();
    const result = await service.login({
      email: "admin@zoho.co.ke",
      password: "password123",
    });

    expect(mockCreate).toHaveBeenCalled();
    expect(result.token).toBe("test-token");
    expect(result.user.email).toBe("admin@zoho.co.ke");
  });
});
