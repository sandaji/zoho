import { PrismaClient } from './src/generated/client';

const prisma = new PrismaClient();

async function test() {
  try {
    console.log("Testing Admin Stats...");
    const [
      total_branches,
      total_warehouses,
      total_users,
      total_products,
      pending_deliveries,
      low_stock_items_result,
    ] = await (prisma as any).$transaction([
      (prisma as any).branch.count({ where: { isActive: true } }),
      (prisma as any).warehouse.count({ where: { isActive: true } }),
      (prisma as any).user.count({ where: { isActive: true } }),
      (prisma as any).product.count({ where: { isActive: true } }),
      (prisma as any).delivery.count({ where: { status: { in: ['pending', 'assigned', 'in_transit'] } } }),
      (prisma as any).$queryRaw`SELECT COUNT(*) as count FROM products WHERE "isActive" = true AND quantity <= reorder_level`,
    ]);

    console.log("Success!");
    console.log({
      total_branches,
      total_warehouses,
      total_users,
      total_products,
      pending_deliveries,
      low_stock_items_result
    });
    
    const low_stock_items = Number((low_stock_items_result as any)[0].count);
    console.log("Low stock items:", low_stock_items);

  } catch (error) {
    console.error("FAILED with error:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
