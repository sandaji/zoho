import { prisma } from "../../../lib/db";
import { AppError, ErrorCode } from "../../../lib/errors";
import { logger } from "../../../lib/logger";
import { InventoryService } from "../../inventory/service/inventory.service";

interface CreateProductDTO {
  sku: string;
  upc?: string | null;
  barcode?: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  subcategory?: string | null;
  product_type?: "physical" | "digital" | "service";
  cost_price: number;
  unit_price: number;
  tax_rate?: number;
  unit_of_measurement?: string;
  weight?: number | null;
  weight_unit?: string | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimension_unit?: string | null;
  image_url?: string | null;
  vendorId: string; // Mandatory vendor assignment
  supplier_part_number?: string | null;
  lead_time_days?: number | null;
  status?: "active" | "inactive" | "discontinued";
  // Branch & Warehouse inventory (moved to BranchInventory)
  branchId: string; // Required: which branch this product is being added to
  quantity?: number; // Initial quantity for this branch
  reorder_level?: number; // Branch-specific reorder level
  reorder_quantity?: number; // Branch-specific reorder quantity
}

interface GetProductsQuery {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  status?: string;
  branchId?: string; // Branch-specific inventory filtering
  vendorId?: string; // Vendor-specific filtering
  sortBy?: "name" | "sku" | "price" | "createdAt" | "quantity";
  sortOrder?: "asc" | "desc";
}

export class ProductService {
  /**
   * Get the main warehouse (first warehouse by creation date)
   */
  private async getMainWarehouse() {
    const mainWarehouse = await prisma.warehouse.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });

    if (!mainWarehouse) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        404,
        "No active warehouse found. Please create a warehouse first.",
      );
    }

    return mainWarehouse;
  }

  /**
   * Create a new product
   */
  async createProduct(data: CreateProductDTO) {
    try {
      // --- Pre-flight checks (outside transaction to minimise tx duration) ---

      // Check if SKU already exists
      const existingSKU = await prisma.product.findUnique({
        where: { sku: data.sku },
      });
      if (existingSKU) {
        throw new AppError(
          ErrorCode.ALREADY_EXISTS,
          409,
          `Product with SKU "${data.sku}" already exists`,
        );
      }

      // Check if UPC already exists (if provided)
      if (data.upc) {
        const existingUPC = await prisma.product.findUnique({
          where: { upc: data.upc },
        });
        if (existingUPC) {
          throw new AppError(
            ErrorCode.ALREADY_EXISTS,
            409,
            `Product with UPC "${data.upc}" already exists`,
          );
        }
      }

      // Verify branch and its warehouses exist
      const branch = await prisma.branch.findUnique({
        where: { id: data.branchId },
        include: { warehouses: { where: { isActive: true } } },
      });
      if (!branch) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Specified branch not found");
      }
      if (branch.warehouses.length === 0) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Branch has no active warehouses");
      }

      const initialQuantity = data.quantity || 0;
      const reorderLevel = data.reorder_level || 10;
      const reorderQuantity = data.reorder_quantity || 20;

      // Determine inventory status based on quantity
      let inventoryStatus: "in_stock" | "low_stock" | "out_of_stock" =
        "in_stock";
      if (initialQuantity === 0) {
        inventoryStatus = "out_of_stock";
      } else if (initialQuantity < reorderLevel) {
        inventoryStatus = "low_stock";
      }

      // Create the product and branch inventory in a transaction
      // Timeout raised to 15s — remote DB + audit log middleware adds latency
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create the master product
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
            unit_of_measurement: data.unit_of_measurement || "pcs",
            weight: data.weight || null,
            weight_unit: data.weight_unit || null,
            length: data.length || null,
            width: data.width || null,
            height: data.height || null,
            dimension_unit: data.dimension_unit || null,
            image_url: data.image_url || null,
            vendorId: data.vendorId,
            supplier_part_number: data.supplier_part_number || null,
            lead_time_days: data.lead_time_days || null,
            status: data.status || "active",
          },
        });

        // 2. Create BranchInventory record for localised inventory
        await tx.branchInventory.create({
          data: {
            productId: product.id,
            branchId: data.branchId,
            quantity: initialQuantity,
            reorder_level: reorderLevel,
            reorder_quantity: reorderQuantity,
            reserved: 0,
            available: initialQuantity,
            status: inventoryStatus,
            last_counted: new Date(),
          },
        });

        // 3. Create warehouse-level stock. Initial stock with quantity > 0
        // must go through InventoryService.receiveStock — it's the only
        // path that also creates a StockBatch cost lot, which is what FIFO
        // depletion (every POS sale) actually reads from. A bare
        // tx.inventory.create() here made Inventory.quantity look correct
        // everywhere in the UI while leaving zero StockBatch rows behind,
        // so the very first sale of a newly-added product failed with
        // "Insufficient stock: ... available 0" despite the product page
        // showing full stock. receiveStock also re-syncs BranchInventory
        // itself, so the row created in step 2 above gets its
        // quantity/available/status recalculated from the real ledger
        // while keeping the reorder_level/reorder_quantity just set on it.
        const primaryWarehouse = branch.warehouses[0];
        if (initialQuantity > 0) {
          await InventoryService.receiveStock(tx, {
            productId: product.id,
            warehouseId: primaryWarehouse!.id,
            quantity: initialQuantity,
            unitCost: data.cost_price,
            reference: "Initial stock on product creation",
          });
        } else {
          await tx.inventory.create({
            data: {
              productId: product.id,
              warehouseId: primaryWarehouse!.id,
              quantity: 0,
              reserved: 0,
              available: 0,
              status: "out_of_stock",
              last_counted: new Date(),
            },
          });
        }

        return product;
      }, {
        timeout: 15000, // 15s — accommodates remote DB latency + audit log writes
      });

      logger.info(
        {
          productId: result.id,
          productName: result.name,
          branchId: data.branchId,
          initialQuantity,
        },
        `Product created and allocated to branch`,
      );

      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error(error as Error, "Error creating product");
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        500,
        "Failed to create product",
      );
    }
  }

  /**
   * Bulk-import products from a parsed spreadsheet (e.g. the Product
   * Catalogue export re-uploaded, or any file with the same columns:
   * SKU, Name, Category, Quantity, Cost Price, Selling Price, Status,
   * Reorder Level).
   *
   * The export/import round trip never includes vendorId or branchId
   * (they aren't columns in the spreadsheet), but both are mandatory on
   * every product in this system — see createProduct()'s vendorId/branchId
   * comments. So the caller picks ONE branch and ONE vendor for the whole
   * batch up front, and every row in the file is created under that
   * branch/vendor pair.
   *
   * Unlike createProduct(), a single bad row must not fail the whole
   * import — each row gets its own try/catch and its own transaction, so
   * one duplicate SKU or missing price doesn't block the other 500 rows.
   * The branch/vendor existence check happens once, up front, since it's
   * the same for every row.
   */
  async bulkImportProducts(input: {
    branchId: string;
    vendorId: string;
    products: Array<{
      sku: string;
      name: string;
      category?: string | null;
      quantity?: number;
      cost_price: number;
      unit_price: number;
      status?: string;
      reorder_level?: number;
    }>;
  }) {
    const { branchId, vendorId, products } = input;

    // Validate branch + vendor once for the whole batch
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: { warehouses: { where: { isActive: true } } },
    });
    if (!branch) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Specified branch not found");
    }
    if (branch.warehouses.length === 0) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Branch has no active warehouses");
    }

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Specified vendor not found");
    }

    const primaryWarehouse = branch.warehouses[0]!;
    const validStatuses = ["active", "inactive", "discontinued"];

    const results = {
      total: products.length,
      created: 0,
      failed: 0,
      errors: [] as Array<{ row: number; sku?: string; message: string }>,
    };

    for (let i = 0; i < products.length; i++) {
      const row = products[i]!;
      // +2 accounts for the header row and 1-based spreadsheet row numbering,
      // so the row number reported here matches what the user sees in Excel.
      const rowNum = i + 2;

      try {
        const sku = row.sku?.toString().trim();
        const name = row.name?.toString().trim();
        const costPrice = Number(row.cost_price);
        const unitPrice = Number(row.unit_price);

        if (!sku) throw new Error("SKU is required");
        if (!name) throw new Error("Product name is required");
        if (row.cost_price === undefined || row.cost_price === null || row.cost_price === ("" as any) || isNaN(costPrice) || costPrice < 0) {
          throw new Error("Valid cost price is required");
        }
        if (row.unit_price === undefined || row.unit_price === null || row.unit_price === ("" as any) || isNaN(unitPrice) || unitPrice < 0) {
          throw new Error("Valid selling price is required");
        }

        const existingSKU = await prisma.product.findUnique({ where: { sku } });
        if (existingSKU) {
          throw new Error(`SKU "${sku}" already exists`);
        }

        const initialQuantity =
          row.quantity !== undefined && !isNaN(Number(row.quantity)) && Number(row.quantity) > 0
            ? Math.floor(Number(row.quantity))
            : 0;
        const reorderLevel =
          row.reorder_level !== undefined && !isNaN(Number(row.reorder_level)) && Number(row.reorder_level) >= 0
            ? Math.floor(Number(row.reorder_level))
            : 10;
        const reorderQuantity = Math.max(reorderLevel * 2, 20);

        const statusValue = row.status?.toString().trim().toLowerCase();
        const status = validStatuses.includes(statusValue || "")
          ? (statusValue as "active" | "inactive" | "discontinued")
          : "active";

        let inventoryStatus: "in_stock" | "low_stock" | "out_of_stock" = "in_stock";
        if (initialQuantity === 0) inventoryStatus = "out_of_stock";
        else if (initialQuantity < reorderLevel) inventoryStatus = "low_stock";

        await prisma.$transaction(
          async (tx) => {
            const product = await tx.product.create({
              data: {
                sku,
                name,
                category: row.category?.toString().trim() || null,
                cost_price: costPrice,
                unit_price: unitPrice,
                tax_rate: 0.16,
                unit_of_measurement: "pcs",
                vendorId,
                status,
              },
            });

            await tx.branchInventory.create({
              data: {
                productId: product.id,
                branchId,
                quantity: initialQuantity,
                reorder_level: reorderLevel,
                reorder_quantity: reorderQuantity,
                reserved: 0,
                available: initialQuantity,
                status: inventoryStatus,
                last_counted: new Date(),
              },
            });

            // See createProduct()'s comment above — quantity > 0 must go
            // through receiveStock to create a StockBatch, or FIFO sales
            // depletion later fails with "available 0" despite this row
            // showing stock in the Products/Inventory UI.
            if (initialQuantity > 0) {
              await InventoryService.receiveStock(tx, {
                productId: product.id,
                warehouseId: primaryWarehouse.id,
                quantity: initialQuantity,
                unitCost: costPrice,
                reference: "Initial stock via bulk import",
              });
            } else {
              await tx.inventory.create({
                data: {
                  productId: product.id,
                  warehouseId: primaryWarehouse.id,
                  quantity: 0,
                  reserved: 0,
                  available: 0,
                  status: "out_of_stock",
                  last_counted: new Date(),
                },
              });
            }
          },
          { timeout: 15000 },
        );

        results.created++;
      } catch (err) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          sku: row?.sku?.toString(),
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    logger.info(
      { branchId, vendorId, total: results.total, created: results.created, failed: results.failed },
      "Bulk product import completed",
    );

    return results;
  }

  /**
   * Get products with pagination and filters
   * Now supports branch-specific inventory queries
   */
  async getProducts(query: GetProductsQuery) {
    try {
      const { page, limit, search, category, status, branchId, vendorId } =
        query;
      const skip = (page - 1) * limit;

      // Build filter conditions for products table
      const where: any = {
        isActive: true,
      };

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

      if (vendorId) {
        where.vendorId = vendorId;
      }

      // Build sort order
      const orderBy: any = {};
      if (query.sortBy) {
        const field = query.sortBy === "price" ? "unit_price" : query.sortBy;
        orderBy[field] = query.sortOrder || "asc";
      } else {
        orderBy.createdAt = "desc";
      }

      // Get products and total count
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            branchInventory: branchId
              ? {
                  where: { branchId },
                  include: { branch: true },
                }
              : {
                  include: { branch: true },
                },
          },
        }),
        prisma.product.count({ where }),
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
    } catch (error) {
      logger.error(error as Error, "Error fetching products");
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        500,
        "Failed to fetch products",
      );
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string) {
    try {
      const product = await prisma.product.findUnique({
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
    } catch (error) {
      logger.error(error as Error, `Error fetching product ${id}`);
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        500,
        "Failed to fetch product",
      );
    }
  }

  /**
   * Update product
   */
  async updateProduct(id: string, data: Partial<CreateProductDTO>) {
    try {
      // Check if product exists
      const existing = await prisma.product.findUnique({
        where: { id },
        include: { branchInventory: true },
      });

      if (!existing) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Product not found");
      }

      // Check for duplicate SKU if updating
      if (data.sku && data.sku !== existing.sku) {
        const duplicateSKU = await prisma.product.findUnique({
          where: { sku: data.sku },
        });

        if (duplicateSKU) {
          throw new AppError(
            ErrorCode.ALREADY_EXISTS,
            409,
            `Product with SKU "${data.sku}" already exists`,
          );
        }
      }

      // VENDOR LOCKING: Changes to vendorId require approval
      if (data.vendorId && data.vendorId !== existing.vendorId) {
        // Here we would normally create an approval request instead of updating.
        // For discipline, we check if the user is SUPER_ADMIN.
        // However, the service doesn't have the user context.
        // We'll throw an error if a non-approved change is attempted
        // AND provide a method to create approval requests.

        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          "Direct vendor changes are blocked. Please create an approval request.",
        );
      }

      // Update the product
      const product = await prisma.product.update({
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
          // quantity, reorder_level, reorder_quantity are managed via BranchInventory table
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
          ...(data.supplier_part_number !== undefined && {
            supplier_part_number: data.supplier_part_number,
          }),
          ...(data.lead_time_days !== undefined && {
            lead_time_days: data.lead_time_days,
          }),
          ...(data.status && { status: data.status }),
        },
      });

      logger.info(`Product updated: ${product.id} - ${product.name}`);

      // CONSOLIDATION: Update localized inventory if branchId and inventory fields are provided
      if (data.branchId && (data.quantity !== undefined || data.reorder_level !== undefined || data.reorder_quantity !== undefined)) {
        const branchInv = existing.branchInventory?.find((bi: any) => bi.branchId === data.branchId);
        const currentReserved = branchInv?.reserved || 0;

        // Update Branch-level inventory
        await prisma.branchInventory.upsert({
          where: {
            productId_branchId: {
              productId: id,
              branchId: data.branchId,
            }
          },
          create: {
            productId: id,
            branchId: data.branchId,
            quantity: data.quantity || 0,
            available: (data.quantity || 0) - currentReserved,
            reorder_level: data.reorder_level || 10,
            reorder_quantity: data.reorder_quantity || 20,
          },
          update: {
            ...(data.quantity !== undefined && { 
              quantity: data.quantity,
              available: data.quantity - currentReserved
            }),
            ...(data.reorder_level !== undefined && { reorder_level: data.reorder_level }),
            ...(data.reorder_quantity !== undefined && { reorder_quantity: data.reorder_quantity }),
          }
        });

        // Update Warehouse-level inventory (for POS validation)
        if (data.quantity !== undefined) {
          const warehouse = await prisma.warehouse.findFirst({
            where: { branchId: data.branchId, isActive: true }
          });
          if (warehouse) {
            const warehouseInv = await prisma.inventory.findUnique({
              where: { 
                productId_warehouseId: { 
                  productId: id, 
                  warehouseId: warehouse.id 
                } 
              }
            });
            const whReserved = warehouseInv?.reserved || 0;

            await prisma.inventory.upsert({
              where: {
                productId_warehouseId: {
                  productId: id,
                  warehouseId: warehouse.id,
                }
              },
              create: {
                productId: id,
                warehouseId: warehouse.id,
                quantity: data.quantity,
                available: data.quantity - whReserved,
              },
              update: {
                quantity: data.quantity,
                available: data.quantity - whReserved,
              },
            });
          }
        }
        logger.info(`Inventory synchronized for product ${id} in branch ${data.branchId}`);
      }

      return product;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error(error as Error, `Error updating product ${id}`);
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        500,
        "Failed to update product",
      );
    }
  }

  /**
   * Search products with stock information for POS
   * Returns products with available stock in the specified branch
   */
  async searchProductsForPOS(query: {
    search: string;
    branchId: string;
    limit?: number;
  }) {
    try {
      const { search, branchId, limit = 20 } = query;

      // Get warehouse for the branch
      const warehouse = await prisma.warehouse.findFirst({
        where: { branchId, isActive: true },
      });

      if (!warehouse) {
        return [];
      }

      // Search products
      const products = await prisma.product.findMany({
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
        orderBy: [{ name: "asc" }],
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
          quantity: inventory?.quantity || 0,
          available: inventory?.available || 0,
          reserved: inventory?.reserved || 0,
          status: inventory?.status || "out_of_stock",
          reorder_level: 10,
        };
      });
    } catch (error) {
      logger.error(error as Error, "Error searching products for POS");
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        500,
        "Failed to search products",
      );
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(id: string) {
    try {
      // Check if product exists
      const existing = await prisma.product.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Product not found");
      }

      // Soft delete by setting status to discontinued
      await prisma.product.update({
        where: { id },
        data: {
          status: "discontinued",
          isActive: false,
        },
      });

      logger.info(`Product deleted: ${id}`);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error(error as Error, `Error deleting product ${id}`);
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        500,
        "Failed to delete product",
      );
    }
  }
  /**
   * Create an approval request for a vendor change
   */
  async requestVendorChange(
    userId: string,
    productId: string,
    newVendorId: string,
    notes?: string,
  ) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product)
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Product not found");

    const vendor = await prisma.vendor.findUnique({
      where: { id: newVendorId },
    });
    if (!vendor)
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Vendor not found");

    return prisma.approvalRequest.create({
      data: {
        type: "VENDOR_CHANGE",
        status: "PENDING",
        requestedById: userId,
        referenceId: productId,
        data: {
          oldVendorId: product.vendorId,
          newVendorId: newVendorId,
        },
        notes: notes || `Request to change vendor for ${product.name}`,
      },
    });
  }

  /**
   * Process an approval request (Admin/SuperAdmin only)
   */
  async processApproval(
    userId: string,
    approvalId: string,
    status: "APPROVED" | "REJECTED",
    adminNotes?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({
        where: { id: approvalId },
      });
      if (!request)
        throw new AppError(
          ErrorCode.NOT_FOUND,
          404,
          "Approval request not found",
        );
      if (request.status !== "PENDING")
        throw new AppError(
          ErrorCode.INVALID_STATUS,
          400,
          "Request already processed",
        );

      const updatedRequest = await tx.approvalRequest.update({
        where: { id: approvalId },
        data: {
          status: status,
          approvedById: userId,
          notes: adminNotes
            ? `${request.notes} | Admin Note: ${adminNotes}`
            : request.notes,
        },
      });

      if (status === "APPROVED") {
        const data = request.data as any;
        if (request.type === "VENDOR_CHANGE") {
          await tx.product.update({
            where: { id: request.referenceId! },
            data: { vendorId: data.newVendorId },
          });
        }
      }

      return updatedRequest;
    });
  }
}
