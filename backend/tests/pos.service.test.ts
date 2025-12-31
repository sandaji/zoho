import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { PosService } from "../src/modules/pos/service";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();
const posService = new PosService();

describe("POS Service Tests", () => {
  let testBranch: any;
  let testWarehouse: any;
  let testProduct: any;
  let testUser: any;
  let testManager: any;

  beforeAll(async () => {
    // Create test data
    testBranch = await prisma.branch.create({
      data: {
        code: "TEST-001",
        name: "Test Branch",
        city: "Nairobi",
      },
    });

    testWarehouse = await prisma.warehouse.create({
      data: {
        code: "TEST-WH-001",
        name: "Test Warehouse",
        location: "Test Location",
        capacity: 1000,
        branchId: testBranch.id,
      },
    });

    testProduct = await prisma.product.create({
      data: {
        sku: "TEST-SKU-001",
        barcode: "TEST-BARCODE-001",
        name: "Test Product",
        unit_price: 1000,
        cost_price: 800,
        tax_rate: 0.16,
        quantity: 100,
        reorder_level: 10,
      },
    });

    await prisma.inventory.create({
      data: {
        productId: testProduct.id,
        warehouseId: testWarehouse.id,
        quantity: 50,
        available: 50,
        status: "in_stock",
      },
    });

    const hashedPassword = await hashPassword("password123");

    testUser = await prisma.user.create({
      data: {
        email: "test-cashier@test.com",
        name: "Test Cashier",
        passwordHash: hashedPassword,
        role: "cashier",
        branchId: testBranch.id,
      },
    });

    testManager = await prisma.user.create({
      data: {
        email: "test-manager@test.com",
        name: "Test Manager",
        passwordHash: hashedPassword,
        role: "manager",
        branchId: testBranch.id,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.salesItem.deleteMany({
      where: {
        sales: {
          branchId: testBranch.id,
        },
      },
    });

    await prisma.financeTransaction.deleteMany({
      where: {
        sales: {
          branchId: testBranch.id,
        },
      },
    });

    await prisma.sales.deleteMany({
      where: { branchId: testBranch.id },
    });

    await prisma.inventory.deleteMany({
      where: { warehouseId: testWarehouse.id },
    });

    await prisma.product.deleteMany({
      where: { id: testProduct.id },
    });

    await prisma.user.deleteMany({
      where: {
        OR: [{ id: testUser.id }, { id: testManager.id }],
      },
    });

    await prisma.warehouse.deleteMany({
      where: { id: testWarehouse.id },
    });

    await prisma.branch.deleteMany({
      where: { id: testBranch.id },
    });

    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Reset inventory before each test
    await prisma.inventory.update({
      where: {
        productId_warehouseId: {
          productId: testProduct.id,
          warehouseId: testWarehouse.id,
        },
      },
      data: {
        quantity: 50,
        available: 50,
        status: "in_stock",
      },
    });

    await prisma.product.update({
      where: { id: testProduct.id },
      data: {
        quantity: 100,
      },
    });
  });

  describe("Sale Creation", () => {
    it("should create a sale with correct totals", async () => {
      const saleData = {
        branchId: testBranch.id,
        userId: testUser.id,
        payment_method: "cash" as const,
        amount_paid: 1200,
        items: [
          {
            productId: testProduct.id,
            quantity: 1,
            unit_price: 1000,
            tax_rate: 0.16,
          },
        ],
      };

      const sale = await posService.createSales(saleData);

      expect(sale).toBeDefined();
      expect(sale.subtotal).toBe(1000);
      expect(sale.tax).toBe(160); // 16% of 1000
      expect(sale.grand_total).toBe(1160);
      expect(sale.amount_paid).toBe(1200);
      expect(sale.change).toBe(40);
      expect(sale.items).toHaveLength(1);
      expect(sale.items[0].quantity).toBe(1);
    });

    it("should create a sale with multiple items", async () => {
      const saleData = {
        branchId: testBranch.id,
        userId: testUser.id,
        payment_method: "card" as const,
        amount_paid: 2500,
        items: [
          {
            productId: testProduct.id,
            quantity: 2,
            unit_price: 1000,
            tax_rate: 0.16,
          },
        ],
      };

      const sale = await posService.createSales(saleData);

      expect(sale.subtotal).toBe(2000);
      expect(sale.tax).toBe(320); // 16% of 2000
      expect(sale.grand_total).toBe(2320);
      expect(sale.items[0].quantity).toBe(2);
    });

    it("should create a sale with discount", async () => {
      const saleData = {
        branchId: testBranch.id,
        userId: testUser.id,
        payment_method: "cash" as const,
        amount_paid: 1100,
        discount: 50, // 5% discount (within 10% limit)
        items: [
          {
            productId: testProduct.id,
            quantity: 1,
            unit_price: 1000,
            tax_rate: 0.16,
            discount: 50,
          },
        ],
      };

      const sale = await posService.createSales(saleData);

      expect(sale.subtotal).toBe(1000);
      expect(sale.discount).toBe(50);
      // Tax on (1000 - 50) = 950 * 0.16 = 152
      expect(sale.tax).toBe(152);
      expect(sale.grand_total).toBe(1102); // 1000 - 50 + 152
    });

    it("should generate unique invoice numbers", async () => {
      const saleData = {
        branchId: testBranch.id,
        userId: testUser.id,
        payment_method: "cash" as const,
        amount_paid: 1200,
        items: [
          {
            productId: testProduct.id,
            quantity: 1,
            unit_price: 1000,
            tax_rate: 0.16,
          },
        ],
      };

      const sale1 = await posService.createSales(saleData);
      const sale2 = await posService.createSales(saleData);

      expect(sale1.invoice_no).not.toBe(sale2.invoice_no);
      expect(sale1.invoice_no).toContain(testBranch.code);
      expect(sale2.invoice_no).toContain(testBranch.code);
    });
  });

  describe("Inventory Decrement", () => {
    it("should decrement inventory on sale creation", async () => {
      const initialInventory = await prisma.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId: testProduct.id,
            warehouseId: testWarehouse.id,
          },
        },
      });

      const saleData = {
        branchId: testBranch.id,
        userId: testUser.id,
        payment_method: "cash" as const,
        amount_paid: 2500,
        items: [
          {
            productId: testProduct.id,
            quantity: 5,
            unit_price: 1000,
            tax_rate: 0.16,
          },
        ],
      };

      await posService.createSales(saleData);

      const updatedInventory = await prisma.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId: testProduct.id,
            warehouseId: testWarehouse.id,
          },
        },
      });

      expect(updatedInventory?.quantity).toBe(initialInventory!.quantity - 5);
      expect(updatedInventory?.available).toBe(initialInventory!.available - 5);
    });

    it("should update product total quantity", async () => {
      const initialProduct = await prisma.product.findUnique({
        where: { id: testProduct.id },
      });

      const saleData = {
        branchId: testBranch.id,
        userId: testUser.id,
        payment_method: "cash" as const,
        amount_paid: 3500,
        items: [
          {
            productId: testProduct.id,
            quantity: 3,
            unit_price: 1000,
            tax_rate: 0.16,
          },
        ],
      };

      await posService.createSales(saleData);

      const updatedProduct = await prisma.product.findUnique({
        where: { id: testProduct.id },
      });

      expect(updatedProduct?.quantity).toBe(initialProduct!.quantity - 3);
    });

    it("should reject sale if insufficient inventory", async () => {
      const saleData = {
        branchId: testBranch.id,
        userId: testUser.id,
        payment_method: "cash" as const,
        amount_paid: 60000,
        items: [
          {
            productId: testProduct.id,
            quantity: 100, // More than available in warehouse
            unit_price: 1000,
            tax_rate: 0.16,
          },
        ],
      };

      await expect(posService.createSales(saleData)).rejects.toThrow(
        /Insufficient inventory/
      );
    });

    it("should update inventory status to low_stock", async () => {
      // Set product reorder level
      await prisma.product.update({
        where: { id: testProduct.id },
        data: { reorder_level: 48 },
      });

      const saleData = {
        branchId: testBranch.id,
        userId: testUser.id,
        payment_method: "cash" as const,
        amount_paid: 3500,
        items: [
          {
            productId: testProduct.id,
            quantity: 5, // Leaves 45 in inventory, below reorder level of 48
            unit_price: 1000,
            tax_rate: 0.16,
          },
        ],
      };

      await posService.createSales(saleData);

      const updatedInventory = await prisma.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId: testProduct.id,
            warehouseId: testWarehouse.id,
          },
        },
      });

      expect(updatedInventory?.status).toBe("low_stock");
    });

    it("should update inventory status to out_of_stock", async () => {
      // Update inventory to have exactly 1 item
      await prisma.inventory.update({
        where: {
          productId_warehouseId: {
            productId: testProduct.id,
            warehouseId: testWarehouse.id,
          },
        },
        data: {
          quantity: 1,
          available: 1,
        },
      });

      const saleData = {
        branchId: testBranch.id,
        userId: testUser.id,
        payment_method: "cash" as const,
        amount_paid: 1200,
        items: [
          {
            productId: testProduct.id,
            quantity: 1,
            unit_price: 1000,
            tax_rate: 0.16,
          },
        ],
      };

      await posService.createSales(saleData);

      const updatedInventory = await prisma.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId: testProduct.id,
            warehouseId: testWarehouse.id,
          },
        },
      });

      expect(updatedInventory?.status).toBe("out_of_stock");
      expect(updatedInventory?.available).toBe(0);
    });
  });

  describe("Discount Rules", () => {
    it("should allow discount under 10% without approval", async () => {
      const saleData = {
        branchId: testBranch.id,
        userId: testUser.id,
        payment_method: "cash" as const,
        amount_paid: 1100,
        discount: 90, // 9% discount
        items: [
          {
            productId: testProduct.id,
            quantity: 1,
            unit_price: 1000,
            tax_rate: 0.16,
            discount: 90,
          },
        ],
      };

      const sale = await posService.createSales(saleData);
      expect(sale).toBeDefined();
      expect(sale.discount).toBe(90);
    });

    it("should require approval for discount over 10%", async () => {
      const saleData = {
        branchId: testBranch.id,
        userId: testUser.id,
        payment_method: "cash" as const,
        amount_paid: 1000,
        discount: 150, // 15% discount - requires approval
        items: [
          {
            productId: testProduct.id,
            quantity: 1,
            unit_price: 1000,
            tax_rate: 0.16,
            discount: 150,
          },
        ],
      };

      await expect(posService.createSales(saleData)).rejects.toThrow(
        /require manager approval/
      );
    });

    it("should allow discount over 10% with manager approval", async () => {
      const saleData = {
        branchId: testBranch.id,
        userId: testUser.id,
        payment_method: "cash" as const,
        amount_paid: 1000,
        discount: 150, // 15% discount
        discount_approved_by: testManager.id,
        items: [
          {
            productId: testProduct.id,
            quantity: 1,
            unit_price: 1000,
            tax_rate: 0.16,
            discount: 150,
          },
        ],
      };

      const sale = await posService.createSales(saleData);
      expect(sale).toBeDefined();
      expect(sale.discount).toBe(150);
      expect(sale.discount_approved_by).toBe(testManager.id);
    });

    it("should validate manager credentials for discount approval", async () => {
      const approvalData = {
        salesId: "test-sale-id", // Would be real sale ID
        managerId: testManager.id,
        managerPassword: "wrong-password",
      };

      await expect(posService.approveDiscount(approvalData)).rejects.toThrow(
        /Invalid manager password/
      );
    });

    it("should reject discount approval from non-manager", async () => {
      const approvalData = {
        salesId: "test-sale-id",
        managerId: testUser.id, // Cashier, not manager
        managerPassword: "password123",
      };

      await expect(posService.approveDiscount(approvalData)).rejects.toThrow(
        /Only managers or admins can approve/
      );
    });
  });

  describe("Finance Transaction", () => {
    it("should create finance transaction on sale", async () => {
      const saleData = {
        branchId: testBranch.id,
        userId: testUser.id,
        payment_method: "mpesa" as const,
        amount_paid: 1200,
        items: [
          {
            productId: testProduct.id,
            quantity: 1,
            unit_price: 1000,
            tax_rate: 0.16,
          },
        ],
      };

      const sale = await posService.createSales(saleData);

      const transaction = await prisma.financeTransaction.findFirst({
        where: { salesId: sale.id },
      });

      expect(transaction).toBeDefined();
      expect(transaction?.type).toBe("income");
      expect(transaction?.amount).toBe(sale.grand_total);
      expect(transaction?.payment_method).toBe("mpesa");
    });
  });

  describe("Receipt Generation", () => {
    it("should generate receipt with all required information", async () => {
      const saleData = {
        branchId: testBranch.id,
        userId: testUser.id,
        payment_method: "cash" as const,
        amount_paid: 1200,
        items: [
          {
            productId: testProduct.id,
            quantity: 1,
            unit_price: 1000,
            tax_rate: 0.16,
          },
        ],
      };

      const sale = await posService.createSales(saleData);
      const receipt = await posService.generateReceipt(sale.id);

      expect(receipt).toBeDefined();
      expect(receipt.sale).toBeDefined();
      expect(receipt.branch).toBeDefined();
      expect(receipt.cashier).toBeDefined();
      expect(receipt.company).toBeDefined();

      expect(receipt.sale.invoice_no).toBe(sale.invoice_no);
      expect(receipt.branch.name).toBe(testBranch.name);
      expect(receipt.cashier.name).toBe(testUser.name);
    });
  });

  describe("Daily Summary", () => {
    it("should calculate daily summary correctly", async () => {
      // Create two sales
      const saleData1 = {
        branchId: testBranch.id,
        userId: testUser.id,
        payment_method: "cash" as const,
        amount_paid: 1200,
        items: [
          {
            productId: testProduct.id,
            quantity: 1,
            unit_price: 1000,
            tax_rate: 0.16,
          },
        ],
      };

      const saleData2 = {
        branchId: testBranch.id,
        userId: testUser.id,
        payment_method: "mpesa" as const,
        amount_paid: 2500,
        items: [
          {
            productId: testProduct.id,
            quantity: 2,
            unit_price: 1000,
            tax_rate: 0.16,
          },
        ],
      };

      await posService.createSales(saleData1);
      await posService.createSales(saleData2);

      const summary = await posService.getDailySummary({
        branchId: testBranch.id,
        date: new Date().toISOString(),
      });

      expect(summary.total_sales).toBeGreaterThanOrEqual(2);
      expect(summary.total_revenue).toBeGreaterThan(0);
      expect(summary.payment_methods.cash).toBeGreaterThan(0);
      expect(summary.payment_methods.mpesa).toBeGreaterThan(0);
      expect(summary.top_products).toHaveLength(1);
      expect(summary.top_products[0].productId).toBe(testProduct.id);
    });
  });
});
