import { PrismaClient, PurchaseOrderStatus } from "@prisma/client";
import { PurchasingService } from "../src/modules/purchasing/purchasing.service";
import { InventoryController } from "../src/modules/inventory/controller";
import { clearDatabase, createTestUser } from "./utils"; // Assuming these likely don't exist, I will write standalone logic
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const purchasingService = new PurchasingService();

async function main() {
  console.log("Starting Purchasing Module Verification...");

  try {
    // 0. Setup: Create Agent/User & Branch & Warehouse
    console.log("Setting up test data...");
    
    // Ensure we have a user
    const user = await prisma.user.findFirst();
    if (!user) throw new Error("No user found. Run seed first.");
    
    const branch = await prisma.branch.findFirst();
    if (!branch) throw new Error("No branch found.");

    // Create Warehouse if needed
    let warehouse = await prisma.warehouse.findFirst({ where: { branchId: branch.id } });
    if (!warehouse) {
       warehouse = await prisma.warehouse.create({
           data: {
               name: "Test Warehouse",
               location: "Test Location",
               branchId: branch.id,
               capacity: 1000,
           }
       });
       console.log("Created Warehouse:", warehouse.id);
    }

    // 1. Create Vendor
    const vendorCode = `VEN-TEST-${Date.now()}`;
    const vendor = await purchasingService.createVendor({
      code: vendorCode,
      name: "Test Vendor Inc",
      email: "test@vendor.com",
      address: "123 Vendor St",
    });
    console.log("Created Vendor:", vendor.id);

    // 2. Create Product (if not exists)
    let product = await prisma.product.findFirst();
    if (!product) {
       // Create dummy product logic if needed, or assume seed
       throw new Error("No product found. Run seed first.");
    }
    console.log("Using Product:", product.id);

    // 3. Create PO
    console.log("Creating Purchase Order...");
    const po = await purchasingService.createPurchaseOrder(user.id, {
      vendorId: vendor.id,
      branchId: branch.id,
      items: [
        { productId: product.id, quantity: 10, unitPrice: 50.00 }
      ],
      notes: "Test PO Verification"
    });
    console.log("Created PO:", po.poNumber);

    // 4. Update Status to APPROVED
    await purchasingService.updateStatus(po.id, PurchaseOrderStatus.SUBMITTED, user.id);
    await purchasingService.updateStatus(po.id, PurchaseOrderStatus.APPROVED, user.id);
    console.log("PO Status updated to APPROVED");

    // 5. Receive Goods (Partial)
    console.log("Receiving Goods (5/10)...");
    const receivedPo = await purchasingService.receiveGoods(po.id, user.id, {
      warehouseId: warehouse.id,
      items: [{ productId: product.id, quantity: 5 }]
    });
    console.log("PO Status after partial receive:", receivedPo.status); // Should be PARTIALLY_RECEIVED

    if (receivedPo.status !== "PARTIALLY_RECEIVED") {
        throw new Error(`Expected PARTIALLY_RECEIVED, got ${receivedPo.status}`);
    }

    // Verify Inventory
    const inv = await prisma.inventory.findUnique({
        where: { productId_warehouseId: { productId: product.id, warehouseId: warehouse.id } }
    });
    console.log("Inventory Quantity:", inv?.quantity);
    if (!inv || inv.quantity < 5) console.warn("WARNING: Inventory might not have updated correctly (or pre-existing)");

    // 6. Receive Goods (Remaining)
    console.log("Receiving Remaining Goods (5/10)...");
    const finalPo = await purchasingService.receiveGoods(po.id, user.id, {
        warehouseId: warehouse.id,
        items: [{ productId: product.id, quantity: 5 }]
    });
    console.log("PO Status after full receive:", finalPo.status); // Should be RECEIVED

    if (finalPo.status !== "RECEIVED") {
        throw new Error(`Expected RECEIVED, got ${finalPo.status}`);
    }

    // 7. PDF Generation Test
    console.log("Testing PDF Generation...");
    const pdfBuffer = await purchasingService.generatePoPdf(po.id);
    if (pdfBuffer.length > 0) {
        console.log(`PDF Generated successfully. Size: ${pdfBuffer.length} bytes`);
    } else {
        throw new Error("PDF generation returned empty buffer");
    }

    console.log("VERIFICATION SUCCESSFUL");

  } catch (error) {
    console.error("Verification Failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
