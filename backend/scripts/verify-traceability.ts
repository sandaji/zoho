import dotenv from 'dotenv';
import path from 'path';

// Construct path relative to CWD (root of project)
const envPath = path.resolve(process.cwd(), 'backend/.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env:', result.error);
} else {
  console.log('Loaded .env');
}

// Dynamic imports to avoid hoisting issues
// Dynamic imports to avoid hoisting issues
async function main() {
  // Import pre-configured prisma instance from db.ts (must occur after env load)
  // db.ts export is named 'prisma'
  const { prisma } = await import('../src/lib/db');
  const { MovementType, SalesDocumentType, SalesDocumentStatus, PaymentStatus, PaymentMethod } = await import('../src/generated/enums');
  
  // Restore SalesService import
  const { SalesService } = await import('../src/modules/pos/service/sales.service');
  
  console.log('DATABASE_URL is:', process.env.DATABASE_URL ? 'DEFINED' : 'UNDEFINED');
  
  // const prisma = new PrismaClient(); // Removed manual init
  const salesService = new SalesService();

  console.log('Starting Traceability Verification...');

  // 1. Setup Data: Get a Branch, Warehouse, Product, and User
  const branch = await prisma.branch.findFirst();
  if (!branch) throw new Error('No branch found');

  const warehouse = await prisma.warehouse.findFirst({ where: { branchId: branch.id } });
  if (!warehouse) throw new Error('No warehouse found for branch');

  const product = await prisma.product.findFirst({ where: { quantity: { gt: 10 } } });
  if (!product) throw new Error('No suitable product found');

  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No user found');

  console.log(`Using Product: ${product.name} (ID: ${product.id})`);
  console.log(`Initial Global Quantity: ${product.quantity}`);

  const initialInventory = await prisma.inventory.findUnique({
    where: { productId_warehouseId: { productId: product.id, warehouseId: warehouse.id } }
  });
  console.log(`Initial Warehouse Quantity: ${initialInventory?.quantity || 0}`);

  // 2. Perform Sale
  const saleQuantity = 2;
  console.log(`Performing Sale of ${saleQuantity} units...`);

  const saleInput = {
    branchId: branch.id,
    userId: user.id,
    items: [{
      productId: product.id,
      quantity: saleQuantity,
      unitPrice: Number(product.unit_price),
      description: 'Test Sale Item'
    }],
    paymentMethod: PaymentMethod.cash, // Use enum value
    amountPaid: Number(product.unit_price) * saleQuantity
  };

  // Call static method
  const sale = await SalesService.createPOSSale(saleInput);
  console.log(`Sale Created: ${sale.documentId} (ID: ${sale.id})`);

  // 3. Verify Inventory Decrement
  const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
  const updatedInventory = await prisma.inventory.findUnique({
    where: { productId_warehouseId: { productId: product.id, warehouseId: warehouse.id } }
  });

  console.log(`New Global Quantity: ${updatedProduct?.quantity}`);
  console.log(`New Warehouse Quantity: ${updatedInventory?.quantity}`);

  if (updatedProduct?.quantity !== product.quantity - saleQuantity) {
    console.error('FAIL: Product global quantity mismatch');
  } else {
    console.log('PASS: Product global quantity updated correctly');
  }

  if (updatedInventory?.quantity !== (initialInventory?.quantity || 0) - saleQuantity) {
    console.error('FAIL: Warehouse inventory quantity mismatch');
  } else {
    console.log('PASS: Warehouse inventory quantity updated correctly');
  }

  // 4. Verify Stock Movement Creation
  const movement = await prisma.stockMovement.findFirst({
    where: {
      salesId: sale.id,
      productId: product.id,
      type: MovementType.OUTBOUND
    }
  });

  if (movement) {
    console.log(`PASS: Stock Movement found! ID: ${movement.id}, Qty: ${movement.quantity}, Ref: ${movement.reference}`);
  } else {
    console.error('FAIL: No Stock Movement record found for this sale');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
