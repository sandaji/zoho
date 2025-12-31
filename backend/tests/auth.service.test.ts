import { AuthService } from '../src/modules/auth/service';
import { prisma } from '../src/lib/db';
import { verifyPassword } from '../src/lib/password';
import { generateToken } from '../src/lib/jwt';
import { AppError, ErrorCode } from '../src/lib/errors';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

// Mock the dependencies
jest.mock('../src/lib/db', () => ({
  prisma: mockDeep<PrismaClient>(),
}));

jest.mock('../src/lib/password', () => ({
  ...jest.requireActual('../src/lib/password'),
  verifyPassword: jest.fn(),
}));

jest.mock('../src/lib/jwt', () => ({
  generateToken: jest.fn(),
}));

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;
const verifyPasswordMock = verifyPassword as jest.Mock;
const generateTokenMock = generateToken as jest.Mock;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    mockReset(prismaMock);
    verifyPasswordMock.mockReset();
    generateTokenMock.mockReset();
    authService = new AuthService();
  });

  describe('login', () => {
    const loginRequest = {
      email: 'test@example.com',
      password: 'password123',
    };

    const userInDb = {
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      name: 'Test User',
      role: 'admin',
      branchId: 'branch-1',
      branch: {
        id: 'branch-1',
        name: 'Main Branch'
      }
    };

    it('should login a user with correct credentials and return a token and user data', async () => {
      // Arrange
      prismaMock.user.findUnique.mockResolvedValue(userInDb as any);
      verifyPasswordMock.mockResolvedValue(true);
      generateTokenMock.mockReturnValue('test-token');

      // Act
      const result = await authService.login(loginRequest);

      // Assert
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginRequest.email },
        include: { branch: true },
      });
      expect(verifyPasswordMock).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(generateTokenMock).toHaveBeenCalledWith({
        userId: 'user-1',
        email: 'test@example.com',
        role: 'admin',
        branchId: 'branch-1',
      });
      expect(result).toEqual({
        token: 'test-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
          branchId: 'branch-1',
          branch: userInDb.branch,
        },
      });
    });

    it('should throw an Unauthorized error for an incorrect password', async () => {
      // Arrange
      prismaMock.user.findUnique.mockResolvedValue(userInDb as any);
      verifyPasswordMock.mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(loginRequest)).rejects.toThrow(
        new AppError(ErrorCode.UNAUTHORIZED, 401, 'Invalid email or password')
      );
      expect(generateTokenMock).not.toHaveBeenCalled();
    });

    it('should throw an Unauthorized error for a non-existent user', async () => {
      // Arrange
      prismaMock.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(loginRequest)).rejects.toThrow(
        new AppError(ErrorCode.UNAUTHORIZED, 401, 'Invalid email or password')
      );
      expect(verifyPasswordMock).not.toHaveBeenCalled();
      expect(generateTokenMock).not.toHaveBeenCalled();
    });

    it('should throw a Validation error if email is not provided', async () => {
        // Arrange
        const badRequest = { email: '', password: 'password123' };
  
        // Act & Assert
        await expect(authService.login(badRequest)).rejects.toThrow(
          new AppError(ErrorCode.VALIDATION_ERROR, 400, 'Email and password are required')
        );
      });
  });
});
