"use strict";
/**
 * Product Routes
 * /products
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_service_1 = require("../services/product.service");
const auth_1 = require("../../../lib/auth");
const rbac_middleware_1 = require("../../../middleware/rbac.middleware");
const errors_1 = require("../../../lib/errors");
const router = (0, express_1.Router)();
const productService = new product_service_1.ProductService();
// Create new product
router.post("/", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.product.manage'), async (req, res, next) => {
    try {
        const product = await productService.createProduct(req.body);
        res.status(201).json({
            success: true,
            data: product,
        });
    }
    catch (error) {
        next(error);
    }
});
// Get all products with pagination and filters
router.get("/", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.product.view'), async (req, res, next) => {
    try {
        const { page = "1", limit = "50", search, category, status } = req.query;
        const result = await productService.getProducts({
            page: parseInt(page),
            limit: parseInt(limit),
            search: search,
            category: category,
            status: status,
        });
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
});
// Get product by ID
router.get("/:id", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.product.view'), async (req, res, next) => {
    try {
        const product = await productService.getProductById(req.params.id);
        if (!product) {
            throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Product not found");
        }
        res.json({
            success: true,
            data: product,
        });
    }
    catch (error) {
        next(error);
    }
});
// Update product (PUT - full replacement)
router.put("/:id", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.product.manage'), async (req, res, next) => {
    try {
        const product = await productService.updateProduct(req.params.id, req.body);
        res.json({
            success: true,
            data: product,
        });
    }
    catch (error) {
        next(error);
    }
});
// Update product (PATCH - partial update)
router.patch("/:id", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.product.manage'), async (req, res, next) => {
    try {
        const product = await productService.updateProduct(req.params.id, req.body);
        res.json({
            success: true,
            data: product,
        });
    }
    catch (error) {
        next(error);
    }
});
// Search products for POS with stock information
router.get("/search/pos", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.product.view'), async (req, res, next) => {
    try {
        const { q, branchId, limit = "20" } = req.query;
        if (!q || !branchId) {
            throw new errors_1.AppError(errors_1.ErrorCode.BAD_REQUEST, 400, "Search query (q) and branchId are required");
        }
        const products = await productService.searchProductsForPOS({
            search: q,
            branchId: branchId,
            limit: parseInt(limit),
        });
        res.json({
            success: true,
            data: products,
        });
    }
    catch (error) {
        next(error);
    }
});
// Delete product
router.delete("/:id", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.product.manage'), async (req, res, next) => {
    try {
        await productService.deleteProduct(req.params.id);
        res.json({
            success: true,
            message: "Product deleted successfully",
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
