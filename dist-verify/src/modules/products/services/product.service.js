"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const db_1 = require("../../../lib/db");
const errors_1 = require("../../../lib/errors");
const logger_1 = require("../../../lib/logger");
class ProductService {
    /**
     * Get the main warehouse (first warehouse by creation date)
     */
    async getMainWarehouse() {
        const mainWarehouse = await db_1.prisma.warehouse.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
        });
        if (!mainWarehouse) {
            throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "No active warehouse found. Please create a warehouse first.");
        }
        return mainWarehouse;
    }
    /**
     * Create a new product
     */
    async createProduct(data) {
        try {
            // Check if SKU already exists
            const existingSKU = await db_1.prisma.product.findUnique({
                where: { sku: data.sku },
            });
            if (existingSKU) {
                throw new errors_1.AppError(errors_1.ErrorCode.ALREADY_EXISTS, 409, `Product with SKU "${data.sku}" already exists`);
            }
            // Check if UPC already exists (if provided)
            if (data.upc) {
                const existingUPC = await db_1.prisma.product.findUnique({
                    where: { upc: data.upc },
                });
                if (existingUPC) {
                    throw new errors_1.AppError(errors_1.ErrorCode.ALREADY_EXISTS, 409, `Product with UPC "${data.upc}" already exists`);
                }
            }
            // Determine warehouse for initial inventory
            let warehouseId = data.warehouseId;
            if (!warehouseId) {
                const mainWarehouse = await this.getMainWarehouse();
                warehouseId = mainWarehouse.id;
            }
            else {
                // Verify the specified warehouse exists and is active
                const warehouse = await db_1.prisma.warehouse.findUnique({
                    where: { id: warehouseId },
                });
                if (!warehouse || !warehouse.isActive) {
                    throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Specified warehouse not found or inactive");
                }
            }
            const initialQuantity = data.quantity || 0;
            // Create the product and inventory in a transaction
            const result = await db_1.prisma.$transaction(async (tx) => {
                // Create the product
                const product = await tx.product.create({
                    data: {
                        sku: data.sku,
                        upc: data.upc || null,
                        barcode: data.barcode || null,
                        name: data.name,
                        description: data.description || null,
                        category: data.category || null,
                        subcategory: data.subcategory || null,
                        product_type: data.product_type || "physical",
                        cost_price: data.cost_price,
                        unit_price: data.unit_price,
                        tax_rate: data.tax_rate || 0.16,
                        quantity: initialQuantity,
                        reorder_level: data.reorder_level || 10,
                        reorder_quantity: data.reorder_quantity || 20,
                        unit_of_measurement: data.unit_of_measurement || "pcs",
                        weight: data.weight || null,
                        weight_unit: data.weight_unit || null,
                        length: data.length || null,
                        width: data.width || null,
                        height: data.height || null,
                        dimension_unit: data.dimension_unit || null,
                        image_url: data.image_url || null,
                        supplier_name: data.supplier_name || null,
                        supplier_part_number: data.supplier_part_number || null,
                        lead_time_days: data.lead_time_days || null,
                        status: data.status || "active",
                    },
                });
                // Determine inventory status based on quantity
                const reorderLevel = data.reorder_level || 10;
                let inventoryStatus = "in_stock";
                if (initialQuantity === 0) {
                    inventoryStatus = "out_of_stock";
                }
                else if (initialQuantity < reorderLevel) {
                    inventoryStatus = "low_stock";
                }
                // Create initial inventory record for the warehouse
                await tx.inventory.create({
                    data: {
                        productId: product.id,
                        warehouseId: warehouseId,
                        quantity: initialQuantity,
                        reserved: 0,
                        available: initialQuantity,
                        status: inventoryStatus,
                        last_counted: new Date(),
                    },
                });
                return product;
            });
            logger_1.logger.info({
                productId: result.id,
                productName: result.name,
                warehouseId,
                initialQuantity,
            }, `Product created and allocated to warehouse`);
            return result;
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                throw error;
            }
            logger_1.logger.error(error, "Error creating product");
            throw new errors_1.AppError(errors_1.ErrorCode.INTERNAL_ERROR, 500, "Failed to create product");
        }
    }
    /**
     * Get products with pagination and filters
     */
    async getProducts(query) {
        try {
            const { page, limit, search, category, status } = query;
            const skip = (page - 1) * limit;
            // Build filter conditions
            const where = {};
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: "insensitive" } },
                    { sku: { contains: search, mode: "insensitive" } },
                    { description: { contains: search, mode: "insensitive" } },
                ];
            }
            if (category) {
                where.category = category;
            }
            if (status) {
                where.status = status;
            }
            // Get products and total count
            const [products, total] = await Promise.all([
                db_1.prisma.product.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: "desc" },
                }),
                db_1.prisma.product.count({ where }),
            ]);
            return {
                products,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            logger_1.logger.error(error, "Error fetching products");
            throw new errors_1.AppError(errors_1.ErrorCode.INTERNAL_ERROR, 500, "Failed to fetch products");
        }
    }
    /**
     * Get product by ID
     */
    async getProductById(id) {
        try {
            const product = await db_1.prisma.product.findUnique({
                where: { id },
                include: {
                    inventory: {
                        include: {
                            warehouse: true,
                        },
                    },
                },
            });
            return product;
        }
        catch (error) {
            logger_1.logger.error(error, `Error fetching product ${id}`);
            throw new errors_1.AppError(errors_1.ErrorCode.INTERNAL_ERROR, 500, "Failed to fetch product");
        }
    }
    /**
     * Update product
     */
    async updateProduct(id, data) {
        try {
            // Check if product exists
            const existing = await db_1.prisma.product.findUnique({
                where: { id },
            });
            if (!existing) {
                throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Product not found");
            }
            // Check for duplicate SKU if updating
            if (data.sku && data.sku !== existing.sku) {
                const duplicateSKU = await db_1.prisma.product.findUnique({
                    where: { sku: data.sku },
                });
                if (duplicateSKU) {
                    throw new errors_1.AppError(errors_1.ErrorCode.ALREADY_EXISTS, 409, `Product with SKU "${data.sku}" already exists`);
                }
            }
            // Update the product
            const product = await db_1.prisma.product.update({
                where: { id },
                data: {
                    ...(data.sku && { sku: data.sku }),
                    ...(data.upc !== undefined && { upc: data.upc }),
                    ...(data.barcode !== undefined && { barcode: data.barcode }),
                    ...(data.name && { name: data.name }),
                    ...(data.description !== undefined && {
                        description: data.description,
                    }),
                    ...(data.category !== undefined && { category: data.category }),
                    ...(data.subcategory !== undefined && {
                        subcategory: data.subcategory,
                    }),
                    ...(data.product_type && { product_type: data.product_type }),
                    ...(data.cost_price !== undefined && { cost_price: data.cost_price }),
                    ...(data.unit_price !== undefined && { unit_price: data.unit_price }),
                    ...(data.tax_rate !== undefined && { tax_rate: data.tax_rate }),
                    ...(data.quantity !== undefined && { quantity: data.quantity }),
                    ...(data.reorder_level !== undefined && {
                        reorder_level: data.reorder_level,
                    }),
                    ...(data.reorder_quantity !== undefined && {
                        reorder_quantity: data.reorder_quantity,
                    }),
                    ...(data.unit_of_measurement && {
                        unit_of_measurement: data.unit_of_measurement,
                    }),
                    ...(data.weight !== undefined && { weight: data.weight }),
                    ...(data.weight_unit !== undefined && {
                        weight_unit: data.weight_unit,
                    }),
                    ...(data.length !== undefined && { length: data.length }),
                    ...(data.width !== undefined && { width: data.width }),
                    ...(data.height !== undefined && { height: data.height }),
                    ...(data.dimension_unit !== undefined && {
                        dimension_unit: data.dimension_unit,
                    }),
                    ...(data.image_url !== undefined && { image_url: data.image_url }),
                    ...(data.supplier_name !== undefined && {
                        supplier_name: data.supplier_name,
                    }),
                    ...(data.supplier_part_number !== undefined && {
                        supplier_part_number: data.supplier_part_number,
                    }),
                    ...(data.lead_time_days !== undefined && {
                        lead_time_days: data.lead_time_days,
                    }),
                    ...(data.status && { status: data.status }),
                },
            });
            logger_1.logger.info(`Product updated: ${product.id} - ${product.name}`);
            return product;
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                throw error;
            }
            logger_1.logger.error(error, `Error updating product ${id}`);
            throw new errors_1.AppError(errors_1.ErrorCode.INTERNAL_ERROR, 500, "Failed to update product");
        }
    }
    /**
     * Search products with stock information for POS
     * Returns products with available stock in the specified branch
     */
    async searchProductsForPOS(query) {
        try {
            const { search, branchId, limit = 20 } = query;
            // Get warehouse for the branch
            const warehouse = await db_1.prisma.warehouse.findFirst({
                where: { branchId, isActive: true },
            });
            if (!warehouse) {
                return [];
            }
            // Search products
            const products = await db_1.prisma.product.findMany({
                where: {
                    AND: [
                        {
                            OR: [
                                { name: { contains: search, mode: "insensitive" } },
                                { sku: { contains: search, mode: "insensitive" } },
                                { barcode: { contains: search, mode: "insensitive" } },
                                { upc: { contains: search, mode: "insensitive" } },
                            ],
                        },
                        { status: "active" },
                        { isActive: true },
                    ],
                },
                include: {
                    inventory: {
                        where: {
                            warehouseId: warehouse.id,
                        },
                    },
                },
                take: limit,
                orderBy: [
                    { name: "asc" },
                ],
            });
            // Format response with stock information
            return products.map((product) => {
                const inventory = product.inventory[0];
                return {
                    id: product.id,
                    sku: product.sku,
                    name: product.name,
                    description: product.description,
                    unit_price: product.unit_price,
                    tax_rate: product.tax_rate,
                    category: product.category,
                    unit_of_measurement: product.unit_of_measurement,
                    image_url: product.image_url,
                    // Stock information
                    quantity: product.quantity,
                    available: inventory?.available || 0,
                    reserved: inventory?.reserved || 0,
                    status: inventory?.status || "out_of_stock",
                    reorder_level: product.reorder_level,
                };
            });
        }
        catch (error) {
            logger_1.logger.error(error, "Error searching products for POS");
            throw new errors_1.AppError(errors_1.ErrorCode.INTERNAL_ERROR, 500, "Failed to search products");
        }
    }
    /**
     * Delete product
     */
    async deleteProduct(id) {
        try {
            // Check if product exists
            const existing = await db_1.prisma.product.findUnique({
                where: { id },
            });
            if (!existing) {
                throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Product not found");
            }
            // Soft delete by setting status to discontinued
            await db_1.prisma.product.update({
                where: { id },
                data: {
                    status: "discontinued",
                    isActive: false,
                },
            });
            logger_1.logger.info(`Product deleted: ${id}`);
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                throw error;
            }
            logger_1.logger.error(error, `Error deleting product ${id}`);
            throw new errors_1.AppError(errors_1.ErrorCode.INTERNAL_ERROR, 500, "Failed to delete product");
        }
    }
}
exports.ProductService = ProductService;
