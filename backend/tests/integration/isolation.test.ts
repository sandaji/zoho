import { prisma } from "../../src/lib/db";
import { asyncContext } from "../../src/lib/async-context";
import { jest } from "@jest/globals";

describe("Branch Isolation Integration Tests", () => {
  let branchAId: string;
  let branchBId: string;
  let warehouseAId: string;
  let warehouseBId: string;
  let userBId: string;

  beforeAll(async () => {
    // 1. Create two branches
    const branchA = await prisma.branch.create({
      data: { name: "Branch A", code: "BA", city: "City A" },
    });
    branchAId = branchA.id;

    const branchB = await prisma.branch.create({
      data: { name: "Branch B", code: "BB", city: "City B" },
    });
    branchBId = branchB.id;

    // 2. Create warehouses for each branch
    const warehouseA = await prisma.warehouse.create({
      data: { name: "WH A", code: "WHA", location: "Loc A", capacity: 1000, branchId: branchAId },
    });
    warehouseAId = warehouseA.id;

    const warehouseB = await prisma.warehouse.create({
      data: { name: "WH B", code: "WHB", location: "Loc B", capacity: 1000, branchId: branchBId },
    });
    warehouseBId = warehouseB.id;

    // 3. Create a user in Branch B
    const userB = await prisma.user.create({
      data: { 
        email: `userB-${Date.now()}@test.com`, 
        name: "User B", 
        passwordHash: "hash", 
        branchId: branchBId,
        role: "warehouse_staff"
      },
    });
    userBId = userB.id;

    // 4. Create payroll for user B
    await prisma.payroll.create({
      data: {
        payroll_no: `PAY-${Date.now()}`,
        userId: userBId,
        base_salary: 5000,
        net_salary: 5000,
        period_start: new Date(),
        period_end: new Date(),
      }
    });
  });

  afterAll(async () => {
    // Cleanup - deletion order matters due to relations
    await prisma.payroll.deleteMany({ where: { userId: userBId } });
    await prisma.user.deleteMany({ where: { id: userBId } });
    await prisma.warehouse.deleteMany({ where: { id: { in: [warehouseAId, warehouseBId] } } });
    await prisma.branch.deleteMany({ where: { id: { in: [branchAId, branchBId] } } });
  });

  test("Direct Isolation: Branch A user cannot see Branch B warehouse", async () => {
    await asyncContext.run({ branchId: branchAId, role: "manager" }, async () => {
      // Try to find Branch B warehouse
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: warehouseBId },
      });
      expect(warehouse).toBeNull();

      const allWarehouses = await prisma.warehouse.findMany();
      expect(allWarehouses.find(w => w.id === warehouseBId)).toBeUndefined();
      expect(allWarehouses.find(w => w.id === warehouseAId)).toBeDefined();
    });
  });

  test("Indirect Isolation: Branch A user cannot see Branch B payroll", async () => {
    await asyncContext.run({ branchId: branchAId, role: "manager" }, async () => {
      // Payroll is isolated via user.branchId
      const payrolls = await prisma.payroll.findMany();
      
      // Should only see payrolls for users in Branch A (which is currently none)
      expect(payrolls.length).toBe(0);
    });
  });

  test("Super Admin Bypass: Admin can see everything", async () => {
    await asyncContext.run({ branchId: branchAId, role: "super_admin" }, async () => {
      const allWarehouses = await prisma.warehouse.findMany();
      expect(allWarehouses.length).toBeGreaterThanOrEqual(2);
      
      const payrolls = await prisma.payroll.findMany();
      expect(payrolls.length).toBeGreaterThanOrEqual(1);
    });
  });

  test("Aggregation Isolation: Branch A user sees 0 revenue if Branch B has all sales", async () => {
    // Create a sale in Branch B
    await prisma.salesDocument.create({
      data: {
        document_no: `SD-${Date.now()}`,
        branchId: branchBId,
        total: 1000,
        subtotal: 1000,
        status: "PAID",
        createdById: userBId
      }
    });

    await asyncContext.run({ branchId: branchAId, role: "manager" }, async () => {
      const summary = await prisma.salesDocument.aggregate({
        _sum: { total: true }
      });
      expect(summary._sum.total).toBeNull(); // Should be null or 0 because no sales in Branch A
    });

    await asyncContext.run({ branchId: branchBId, role: "manager" }, async () => {
      const summary = await prisma.salesDocument.aggregate({
        _sum: { total: true }
      });
      expect(Number(summary._sum.total)).toBeGreaterThanOrEqual(1000);
    });
  });
});
