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

// Get all products with pagination and filters
router.get("/", authenticate, requirePermission('inventory.product.view'), async (req, res, next) => {
  try {
    const { page = "1", limit = "50", search, category, status, branchId } = req.query;

    const result = await productService.getProducts({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
      category: category as string,
      status: status as string,
      branchId: branchId as string,
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

export default router;
