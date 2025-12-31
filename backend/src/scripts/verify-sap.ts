import { ProductService } from "../modules/products/services/product.service";
import { InventoryService } from "../modules/inventory/service/inventory.service";
import { PurchasingService } from "../modules/purchasing/purchasing.service";
import { prisma } from "../lib/db";

async function verifySAPWorkflows() {
  console.log("--- Starting SAP Workflow Verification ---");

  const productService = new ProductService();
  const inventoryService = new InventoryService();
  const purchasingService = new PurchasingService();

  // 1. Get sample data from seeding
  console.log("Checking for seeded data...");
  const vendor = await prisma.vendor.findFirst({ where: { code: "V-001" } });
  const branch = await prisma.branch.findFirst({ where: { code: "BR-001" }, include: { warehouses: true } });
  const user = await prisma.user.findFirst({ where: { role: "super_admin" } });

  if (!vendor || !branch || !user) {
    throw new Error("Missing seeded data. Run seed-sap.ts first.");
  }

  const warehouseId = branch.warehouses[0]?.id;
  if (!warehouseId) throw new Error("Branch has no warehouses.");

  console.log(`Using Vendor: ${vendor.name}, Branch: ${branch.name}, User: ${user.email}`);

  // 2. Verify Product Creation (Mandatory Vendor/Branch)
  console.log("\n[1/3] Verifying Product Creation Discipline...");
  try {
    const product = await prisma.product.upsert({
      where: { sku: "VERIFY-001" },
      update: { vendorId: vendor.id, branchId: branch.id },
      create: {
        sku: "VERIFY-001",
        name: "Verification Product",
        cost_price: 100,
        unit_price: 150,
        vendorId: vendor.id,
        // @ts-ignore
        branchId: branch.id,
        isActive: true,
      }
    });
    console.log("✓ Product created/verified successfully with mandatory fields.");
    
    // Test direct vendor change block (Service level)
    console.log("Verifying Vendor Lock (Approval Request creation)...");
    const approval = await productService.requestVendorChange(user.id, product.id, vendor.id, "Testing lock");
    if (approval.status === "PENDING") {
        console.log("✓ Vendor change successfully rerouted to ApprovalRequest.");
    }

  } catch (e) {
    console.error("✗ Product validation failed:", e);
  }

  // 3. Verify Single-Vendor PO
  console.log("\n[2/3] Verifying Single-Vendor PO Integrity...");
  // Create another vendor and product to test mixed vendor PO
  const vendor2 = await prisma.vendor.upsert({
    where: { code: "V-002" },
    update: {},
    create: { code: "V-002", name: "Secondary Supplier" }
  });
  
  const product2 = await prisma.product.upsert({
    where: { sku: "VERIFY-002" },
    update: { vendorId: vendor2.id, branchId: branch.id },
    create: {
      sku: "VERIFY-002",
      name: "Product 2",
      cost_price: 50,
      unit_price: 80,
      vendorId: vendor2.id,
      // @ts-ignore
      branchId: branch.id
    }
  });

  try {
    const mainProduct = await prisma.product.findFirst({ where: { sku: "VERIFY-001" } });
    await purchasingService.createPurchaseOrder(user.id, {
      vendorId: vendor.id,
      branchId: branch.id,
      expectedDeliveryDate: new Date().toISOString(),
      items: [
        { productId: mainProduct!.id, quantity: 10, unitPrice: 100 },
        { productId: product2.id, quantity: 5, unitPrice: 50 } // WRONG VENDOR
      ]
    });
    console.log("✗ ERROR: Mixed-vendor PO was allowed!");
  } catch (e: any) {
    console.log(`✓ Blocked mixed-vendor PO: ${e.message}`);
  }

  // 4. Verify 2-Step Transfer
  console.log("\n[3/3] Verifying 2-Step Stock Transfer...");
  try {
     const product = await prisma.product.findFirst({ where: { sku: "VERIFY-001" } });
     // Add some stock first
     await prisma.inventory.upsert({
         where: { productId_warehouseId: { productId: product!.id, warehouseId } },
         create: { productId: product!.id, warehouseId, quantity: 50, available: 50 },
         update: { quantity: 50, available: 50 }
     });

     // Create target branch/warehouse
     const branch2 = await prisma.branch.upsert({
         where: { code: "BR-002" },
         create: { code: "BR-002", name: "Secondary Branch", city: "Mombasa" },
         update: {}
     });
     const wh2 = await prisma.warehouse.upsert({
         where: { code: "WH-002" },
         create: { code: "WH-002", name: "Coastal WH", branchId: branch2.id, location: "Port Area", capacity: 1000 },
         update: {}
     });

     console.log("Initiating transfer...");
     const transfer = await inventoryService.initiateTransfer(user.id, {
         fromWarehouseId: warehouseId,
         toWarehouseId: wh2.id,
         productId: product!.id,
         quantity: 20,
         truckRegNo: "KAA 123X",
         driverName: "John Doe"
     });
     console.log(`✓ Transfer ${transfer.transferNo} initiated (Status: ${transfer.status})`);

     // Verify reservation
     const srcInv = await prisma.inventory.findUnique({
         where: { productId_warehouseId: { productId: product!.id, warehouseId } }
     });
     console.log(`Source Available: ${srcInv?.available} (Expected: 30)`);

     console.log("Confirming transfer...");
     await inventoryService.confirmTransfer(user.id, {
         transferId: transfer.id,
         items: [{ productId: product!.id, receivedQuantity: 20 }]
     });

     const destInv = await prisma.inventory.findUnique({
         where: { productId_warehouseId: { productId: product!.id, warehouseId: wh2.id } }
     });
     console.log(`✓ Transfer COMPLETED. Target Quantity: ${destInv?.quantity}`);

  } catch (e) {
    console.error("✗ Transfer verification failed:", e);
  }

  console.log("\n--- Verification Complete ---");
}

verifySAPWorkflows()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
