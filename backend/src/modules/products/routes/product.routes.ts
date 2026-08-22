/**
 * Product Routes
 * /products
 */

import { Router } from "express";
import { ProductService } from "../services/product.service";
import { authMiddleware as authenticate } from "../../../lib/auth";
import { requirePermission } from "../../../middleware/rbac.middleware";
import { AppError, ErrorCode } from "../../../lib/errors";

const router = Router();
const productService = new ProductService();

// Create new product
router.post("/", authenticate, requirePermission('inventory.product.manage'), async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

// Bulk-import products from a parsed spreadsheet (Import Products dialog).
// Body: { branchId, vendorId, products: [{ sku, name, category?, quantity?, cost_price, unit_price, status?, reorder_level? }] }
// Partial success is expected — a bad row is reported per-row, not a 4xx for the whole batch.
router.post("/bulk-import", authenticate, requirePermission('inventory.product.manage'), async (req, res, next) => {
  try {
    const { branchId, vendorId, products } = req.body;

    if (!branchId || !vendorId) {
      throw new AppError(ErrorCode.BAD_REQUEST, 400, "branchId and vendorId are required");
    }
    if (!Array.isArray(products) || products.length === 0) {
      throw new AppError(ErrorCode.BAD_REQUEST, 400, "products array is required and must not be empty");
    }
    if (products.length > 2000) {
      throw new AppError(ErrorCode.BAD_REQUEST, 400, "Maximum 2000 products per import — split the file into smaller batches");
    }

    const result = await productService.bulkImportProducts({ branchId, vendorId, products });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Get all products with pagination and filters
router.get("/", authenticate, requirePermission('inventory.product.view'), async (req, res, next) => {
  try {
    const { page = "1", limit = "50", search, category, status, branchId, vendorId } = req.query;

    const result = await productService.getProducts({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
      category: category as string,
      status: status as string,
      branchId: branchId as string,
      vendorId: vendorId as string,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Get product by ID
router.get("/:id", authenticate, requirePermission('inventory.product.view'), async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id as string);

    if (!product) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Product not found");
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

// Update product (PUT - full replacement)
router.put("/:id", authenticate, requirePermission('inventory.product.manage'), async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id as string, req.body);
    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

// Update product (PATCH - partial update)
router.patch("/:id", authenticate, requirePermission('inventory.product.manage'), async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id as string, req.body);
    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

// Search products for POS with stock information
router.get("/search/pos", authenticate, requirePermission('inventory.product.view'), async (req, res, next) => {
  try {
    const { q, branchId, limit = "20" } = req.query;

    if (!q || !branchId) {
      throw new AppError(
        ErrorCode.BAD_REQUEST,
        400,
        "Search query (q) and branchId are required"
      );
    }

    const products = await productService.searchProductsForPOS({
      search: q as string,
      branchId: branchId as string,
      limit: parseInt(limit as string),
    });

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
});

// Delete product
router.delete("/:id", authenticate, requirePermission('inventory.product.manage'), async (req, res, next) => {
  try {
    await productService.deleteProduct(req.params.id as string);
    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// Get all categories
router.get("/categories", authenticate, requirePermission('inventory.product.view'), async (req, res, next) => {
  try {
    const { prisma } = await import("../../../lib/db");
    
    // Get all categories with their subcategories
    const categories = await prisma.category.findMany({
      include: {
        subcategories: {
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    next(error);
  }
});

// Create category
router.post("/categories", authenticate, requirePermission('inventory.product.manage'), async (req, res, next) => {
  try {
    const { prisma } = await import("../../../lib/db");
    const { name } = req.body;

    if (!name) {
      throw new AppError(ErrorCode.BAD_REQUEST, 400, "Category name is required");
    }

    const category = await prisma.category.create({
      data: { name }
    });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
});

// Delete category
router.delete("/categories/:id", authenticate, requirePermission('inventory.product.manage'), async (req, res, next) => {
  try {
    const { prisma } = await import("../../../lib/db");
    
    // Delete subcategories first
    await prisma.subcategory.deleteMany({
      where: { categoryId: req.params.id }
    });

    // Delete category
    await prisma.category.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: "Category deleted successfully"
    });
  } catch (error) {
    next(error);
  }
});

// Create subcategory
router.post("/categories/:categoryId/subcategories", authenticate, requirePermission('inventory.product.manage'), async (req, res, next) => {
  try {
    const { prisma } = await import("../../../lib/db");
    const { name } = req.body;
    const { categoryId } = req.params;

    if (!name) {
      throw new AppError(ErrorCode.BAD_REQUEST, 400, "Subcategory name is required");
    }

    const subcategory = await prisma.subcategory.create({
      data: { 
        name,
        categoryId 
      }
    });

    res.status(201).json({
      success: true,
      data: subcategory
    });
  } catch (error) {
    next(error);
  }
});

// Delete subcategory
router.delete("/categories/:categoryId/subcategories/:subcategoryId", authenticate, requirePermission('inventory.product.manage'), async (req, res, next) => {
  try {
    const { prisma } = await import("../../../lib/db");
    
    await prisma.subcategory.delete({
      where: { id: req.params.subcategoryId }
    });

    res.json({
      success: true,
      message: "Subcategory deleted successfully"
    });
  } catch (error) {
    next(error);
  }
});

export default router;
