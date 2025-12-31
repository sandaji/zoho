"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Construct path relative to CWD (root of project)
const envPath = path_1.default.resolve(process.cwd(), 'backend/.env');
console.log('Loading .env from:', envPath);
const result = dotenv_1.default.config({ path: envPath });
if (result.error) {
    console.error('Error loading .env:', result.error);
}
else {
    console.log('Loaded .env');
}
// Dynamic imports to avoid hoisting issues
// Dynamic imports to avoid hoisting issues
async function main() {
    // Import pre-configured prisma instance from db.ts (must occur after env load)
    // db.ts export is named 'prisma'
    const { prisma } = await Promise.resolve().then(() => __importStar(require('../src/lib/db')));
    const { MovementType, SalesDocumentType, SalesDocumentStatus, PaymentStatus, PaymentMethod } = await Promise.resolve().then(() => __importStar(require('../src/generated/enums')));
    // Restore SalesService import
    const { SalesService } = await Promise.resolve().then(() => __importStar(require('../src/modules/pos/service/sales.service')));
    console.log('DATABASE_URL is:', process.env.DATABASE_URL ? 'DEFINED' : 'UNDEFINED');
    // const prisma = new PrismaClient(); // Removed manual init
    const salesService = new SalesService();
    console.log('Starting Traceability Verification...');
    // 1. Setup Data: Get a Branch, Warehouse, Product, and User
    const branch = await prisma.branch.findFirst();
    if (!branch)
        throw new Error('No branch found');
    const warehouse = await prisma.warehouse.findFirst({ where: { branchId: branch.id } });
    if (!warehouse)
        throw new Error('No warehouse found for branch');
    const product = await prisma.product.findFirst({ where: { quantity: { gt: 10 } } });
    if (!product)
        throw new Error('No suitable product found');
    const user = await prisma.user.findFirst();
    if (!user)
        throw new Error('No user found');
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
    }
    else {
        console.log('PASS: Product global quantity updated correctly');
    }
    if (updatedInventory?.quantity !== (initialInventory?.quantity || 0) - saleQuantity) {
        console.error('FAIL: Warehouse inventory quantity mismatch');
    }
    else {
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
    }
    else {
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
