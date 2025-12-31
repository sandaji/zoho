// backend/tests/admin.e2e.test.ts
import { prisma } from '../src/lib/db';
import { hashPassword } from '../src/lib/password';
import { AuthService } from '../src/modules/auth/service';
import { UserRole } from '../src/generated/client';

describe('Admin E2E Tests', () => {
  let testUser: any;
  let authToken: string;
  const testUserEmail = 'admin-e2e-test@example.com';
  const testUserPassword = 'password123';

  beforeAll(async () => {
    // 1. Create a test user with super_admin role
    const hashedPassword = await hashPassword(testUserPassword);
    const superAdminRole = await prisma.role.findUnique({
      where: { code: 'super_admin' },
    });

    if (!superAdminRole) {
      throw new Error('super_admin role not found. Make sure to seed the database.');
    }

    testUser = await prisma.user.create({
      data: {
        email: testUserEmail,
        name: 'Admin E2E Test User',
        passwordHash: hashedPassword,
        role: UserRole.admin,
        roles: {
          create: {
            roleId: superAdminRole.id,
          },
        },
      },
    });

    // 2. Log in as the test user to get a token
    const authService = new AuthService();
    const loginResult = await authService.login({
      email: testUserEmail,
      password: testUserPassword,
    });
    authToken = loginResult.token;
  });

  afterAll(async () => {
    // Clean up the test user
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }
  });

  it('should allow a super_admin to access GET /v1/admin/stats', async () => {
    // 3. Make a request to the protected endpoint
    const response = await fetch('http://localhost:5000/v1/admin/stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });

    // 4. Assert the response is successful
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('total_branches');
    expect(data).toHaveProperty('total_warehouses');
    expect(data).toHaveProperty('total_users');
    expect(data).toHaveProperty('total_products');
    expect(data).toHaveProperty('pending_deliveries');
    expect(data).toHaveProperty('low_stock_items');
  });

  it('should return 403 for a user without permission', async () => {
    // Create a user with no roles
    const noRoleUserEmail = 'no-role-user@example.com';
    const noRoleUserPassword = 'password123';
    const hashedPassword = await hashPassword(noRoleUserPassword);

    const noRoleUser = await prisma.user.create({
        data: {
            email: noRoleUserEmail,
            name: 'No Role User',
            passwordHash: hashedPassword,
            role: UserRole.cashier
        }
    });
    
    const authService = new AuthService();
    const loginResult = await authService.login({ email: noRoleUserEmail, password: noRoleUserPassword});

    const response = await fetch('http://localhost:5000/v1/admin/stats', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${loginResult.token}`
        }
    });

    expect(response.status).toBe(403);

    await prisma.user.delete({ where: { id: noRoleUser.id }});
  });
});
