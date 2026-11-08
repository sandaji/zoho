/**
 * Public, read-only API for apps and partners. Authenticated with an API key (X-API-Key header),
 * never a user login. Cost prices and any internal fields are never returned.
 *
 *   GET /api/v1/public/products?search=&category=&limit=50&offset=0     scope products:read
 *   GET /api/v1/public/products/:id                                      scope products:read
 *   GET /api/v1/public/stock?sku=SKU1,SKU2                               scope stock:read
 */
import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "@core/database/db";
import { apiKeyAuth, type ApiPrincipal } from "./api-key.service";

const router = Router();
const principal = (req: Request) => (req as any).apiKey as ApiPrincipal;
const send = (res: Response, data: unknown, meta?: unknown) => res.json({ status: "success", data, ...(meta ? { meta } : {}) });
const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await fn(req, res);
  } catch (e) {
    next(e);
  }
};

const PRODUCT_FIELDS = {
  id: true,
  sku: true,
  barcode: true,
  name: true,
  description: true,
  category: true,
  subcategory: true,
  unit_price: true,
  tax_rate: true,
  unit_of_measurement: true,
  image_url: true,
} as const;

/** Sellable stock per product, limited to the key's branch when it has one. */
async function availability(p: ApiPrincipal, productIds: string[]) {
  if (productIds.length === 0) return new Map<string, number>();
  let warehouseIds: string[] | undefined;
  if (p.branchId) {
    const ws = await prisma.warehouse.findMany({ where: { branchId: p.branchId, isActive: true }, select: { id: true } });
    warehouseIds = ws.map((w) => w.id);
  }
  const rows = await prisma.inventory.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds }, ...(warehouseIds ? { warehouseId: { in: warehouseIds } } : {}) },
    _sum: { available: true },
  });
  return new Map(rows.map((r) => [r.productId, Math.max(0, Math.floor(r._sum.available ?? 0))]));
}

const shape = (p: any, avail?: Map<string, number>) => ({
  id: p.id,
  sku: p.sku,
  barcode: p.barcode,
  name: p.name,
  description: p.description,
  category: p.category,
  subcategory: p.subcategory,
  price: p.unit_price,
  taxRate: p.tax_rate,
  unit: p.unit_of_measurement,
  imageUrl: p.image_url,
  ...(avail ? { available: avail.get(p.id) ?? 0 } : {}),
});

router.get(
  "/products",
  apiKeyAuth("products:read"),
  wrap(async (req, res) => {
    const p = principal(req);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "50"), 10) || 50, 1), 100);
    const offset = Math.max(parseInt(String(req.query.offset ?? "0"), 10) || 0, 0);
    const search = String(req.query.search ?? "").trim();
    const category = String(req.query.category ?? "").trim();
    const where: any = { isActive: true };
    if (category) where.category = category;
    if (search) where.OR = [{ name: { contains: search, mode: "insensitive" } }, { sku: { contains: search, mode: "insensitive" } }, { barcode: search }];
    const [rows, total] = await Promise.all([
      prisma.product.findMany({ where, select: PRODUCT_FIELDS, orderBy: { name: "asc" }, take: limit, skip: offset }),
      prisma.product.count({ where }),
    ]);
    const avail = p.scopes.includes("stock:read") ? await availability(p, rows.map((r) => r.id)) : undefined;
    send(res, rows.map((r) => shape(r, avail)), { total, limit, offset });
  }),
);

router.get(
  "/products/:id",
  apiKeyAuth("products:read"),
  wrap(async (req, res) => {
    const p = principal(req);
    const row = await prisma.product.findFirst({ where: { id: req.params.id as string, isActive: true }, select: PRODUCT_FIELDS });
    if (!row) return void res.status(404).json({ status: "error", error: { message: "Product not found" } });
    const avail = p.scopes.includes("stock:read") ? await availability(p, [row.id]) : undefined;
    send(res, shape(row, avail));
  }),
);

router.get(
  "/stock",
  apiKeyAuth("stock:read"),
  wrap(async (req, res) => {
    const p = principal(req);
    const skus = String(req.query.sku ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100);
    if (skus.length === 0) return void res.status(400).json({ status: "error", error: { message: "Pass ?sku=SKU1,SKU2 (up to 100)" } });
    const rows = await prisma.product.findMany({ where: { sku: { in: skus }, isActive: true }, select: { id: true, sku: true } });
    const avail = await availability(p, rows.map((r) => r.id));
    send(res, rows.map((r) => ({ sku: r.sku, available: avail.get(r.id) ?? 0 })));
  }),
);

export default router;
