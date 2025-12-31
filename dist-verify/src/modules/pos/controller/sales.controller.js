"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesController = void 0;
const sales_validation_1 = require("../sales.validation");
const sales_service_1 = require("../service/sales.service");
const errors_1 = require("../../../lib/errors");
/**
 * The SalesController handles the request/response cycle for sales document endpoints.
 * It validates incoming data and orchestrates calls to the SalesService.
 */
class SalesController {
    /**
     * Create a new sales document (Draft, Quote, Invoice, Credit Note)
     */
    static async createDocument(req, res, next) {
        try {
            const input = sales_validation_1.createSalesDocumentSchema.parse(req.body);
            const userBranchId = req.user?.branchId;
            const userId = req.user?.userId;
            const branchId = userBranchId || input.branchId;
            if (!branchId || !userId) {
                res.status(401).json({ success: false, error: 'User context required' });
                return;
            }
            // Record-level isolation: Ensure user can only create for authorized branches
            if (req.authorizedBranchIds && req.authorizedBranchIds.length > 0) {
                if (!req.authorizedBranchIds.includes(branchId)) {
                    throw new errors_1.AppError(errors_1.ErrorCode.FORBIDDEN, 403, 'Cannot create document for an unauthorized branch');
                }
            }
            // Transform input to match service expectations
            const serviceInput = {
                type: input.type,
                status: input.status,
                customerId: input.customerId || undefined,
                issueDate: typeof input.issueDate === 'string' ? new Date(input.issueDate) : input.issueDate,
                dueDate: input.dueDate ? (typeof input.dueDate === 'string' ? new Date(input.dueDate) : input.dueDate) : undefined,
                notes: input.notes,
                items: input.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    taxRate: item.taxRate,
                    discount: item.discount,
                })),
            };
            const document = await sales_service_1.SalesService.createDocument(serviceInput, branchId, userId);
            res.status(201).json({ success: true, data: document });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * List all sales documents with optional filters
     */
    static async listDocuments(req, res, next) {
        try {
            const query = sales_validation_1.listDocumentsQuerySchema.parse(req.query);
            const userBranchId = req.user?.branchId;
            let branchIdFilter = query.branchId || userBranchId;
            // Record-level isolation: Enforce authorized branches
            if (req.authorizedBranchIds && req.authorizedBranchIds.length > 0) {
                // If they requested a specific branch, check if it's authorized
                if (query.branchId && !req.authorizedBranchIds.includes(query.branchId)) {
                    throw new errors_1.AppError(errors_1.ErrorCode.FORBIDDEN, 403, 'Unauthorized branch access');
                }
                // Force the filter to be restricted to authorized branches
                branchIdFilter = query.branchId || req.authorizedBranchIds[0]; // Simplification for now, or we could pass the whole array to service if it supported it.
            }
            const documents = await sales_service_1.SalesService.listDocuments({
                ...query,
                branchId: (branchIdFilter || undefined)
            });
            res.status(200).json({ success: true, data: documents });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get a single sales document by ID
     */
    static async getDocumentById(req, res, next) {
        try {
            const id = req.params.id;
            if (!id) {
                res.status(400).json({ success: false, error: 'Document ID is required' });
                return;
            }
            const document = await sales_service_1.SalesService.getDocumentById(id);
            if (!document) {
                res.status(404).json({ success: false, error: 'Document not found' });
                return;
            }
            res.status(200).json({ success: true, data: document });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Convert a document from one type to another (e.g., Quote to Invoice)
     */
    static async convertDocument(req, res, next) {
        try {
            const id = req.params.id;
            if (!id) {
                res.status(400).json({ success: false, error: 'Document ID is required' });
                return;
            }
            // Parse but ignore the type since convertToInvoice always creates an invoice
            sales_validation_1.convertDocumentSchema.parse(req.body);
            const branchId = req.user?.branchId;
            const userId = req.user?.userId;
            if (!branchId || !userId) {
                res.status(401).json({ success: false, error: 'User context required' });
                return;
            }
            // Isolation check
            const source = await sales_service_1.SalesService.getDocumentById(id);
            if (!source) {
                throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, 'Source document not found');
            }
            if (req.authorizedBranchIds && req.authorizedBranchIds.length > 0) {
                if (!req.authorizedBranchIds.includes(source.branchId)) {
                    throw new errors_1.AppError(errors_1.ErrorCode.FORBIDDEN, 403, 'Cannot convert document from another branch');
                }
            }
            const convertedDocument = await sales_service_1.SalesService.convertToInvoice(id, branchId, userId);
            res.status(201).json({ success: true, data: convertedDocument });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Create a POS sale (simplified invoice creation for retail)
     */
    static async createPOSSale(req, res, next) {
        try {
            const input = sales_validation_1.createPOSSaleSchema.parse(req.body);
            const branchId = req.user?.branchId || input.branchId;
            const userId = req.user?.userId || input.userId;
            if (!branchId || !userId) {
                res.status(401).json({ success: false, error: 'User context required' });
                return;
            }
            // Record-level isolation
            if (req.authorizedBranchIds && req.authorizedBranchIds.length > 0) {
                if (!req.authorizedBranchIds.includes(branchId)) {
                    throw new errors_1.AppError(errors_1.ErrorCode.FORBIDDEN, 403, 'Cannot create POS sale for an unauthorized branch');
                }
            }
            // Transform input to match service expectations
            const sale = await sales_service_1.SalesService.createPOSSale({
                branchId,
                userId,
                items: input.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unit_price,
                    taxRate: item.tax_rate,
                    discount: item.discount,
                })),
                paymentMethod: input.payment_method,
                amountPaid: input.amount_paid,
                notes: input.notes,
            });
            res.status(201).json({
                success: true,
                data: sale,
                message: 'Sale completed successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get POS sales history
     */
    static async getPOSSales(req, res, next) {
        try {
            const { date, payment_method, limit = '50', offset = '0' } = req.query;
            let branchIdFilter = req.user?.branchId || req.query.branchId;
            if (req.authorizedBranchIds && req.authorizedBranchIds.length > 0) {
                if (req.query.branchId && !req.authorizedBranchIds.includes(req.query.branchId)) {
                    throw new errors_1.AppError(errors_1.ErrorCode.FORBIDDEN, 403, 'Unauthorized branch access');
                }
                branchIdFilter = req.query.branchId || req.authorizedBranchIds?.[0] || "";
            }
            if (!branchIdFilter) {
                throw new errors_1.AppError(errors_1.ErrorCode.BAD_REQUEST, 400, 'Branch ID is required');
            }
            const sales = await sales_service_1.SalesService.getPOSSales({
                branchId: branchIdFilter,
                dateFilter: date,
                paymentMethod: payment_method,
                limit: parseInt(limit),
                offset: parseInt(offset),
            });
            res.status(200).json({ success: true, data: sales });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get a single POS sale by ID
     */
    static async getPOSSaleById(req, res, next) {
        try {
            const id = req.params.id;
            if (!id) {
                res.status(400).json({ success: false, error: 'Sale ID is required' });
                return;
            }
            const sale = await sales_service_1.SalesService.getPOSSaleById(id);
            if (!sale) {
                res.status(404).json({ success: false, error: 'Sale not found' });
                return;
            }
            res.status(200).json({ success: true, data: sale });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Void/cancel a sales document
     */
    static async voidDocument(req, res, next) {
        try {
            const id = req.params.id;
            if (!id) {
                res.status(400).json({ success: false, error: 'Document ID is required' });
                return;
            }
            const { reason } = req.body;
            const document = await sales_service_1.SalesService.voidDocument(id, reason);
            res.status(200).json({ success: true, data: document });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Create a credit note from an invoice
     */
    static async createCreditNote(req, res, next) {
        try {
            const invoiceId = req.params.invoiceId;
            if (!invoiceId) {
                res.status(400).json({ success: false, error: 'Invoice ID is required' });
                return;
            }
            const { items, reason } = req.body;
            const branchId = req.user?.branchId;
            const userId = req.user?.userId;
            if (!branchId || !userId) {
                res.status(401).json({ success: false, error: 'User context required' });
                return;
            }
            const creditNote = await sales_service_1.SalesService.createCreditNote({
                invoiceId,
                items: items.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    taxRate: item.taxRate,
                    discount: item.discount,
                })),
                reason,
                branchId,
                userId,
            });
            res.status(201).json({ success: true, data: creditNote });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Record a payment for an invoice
     */
    static async recordPayment(req, res, next) {
        try {
            const id = req.params.id;
            if (!id) {
                res.status(400).json({ success: false, error: 'Document ID is required' });
                return;
            }
            const { amount, payment_method, reference } = req.body;
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, error: 'User context required' });
                return;
            }
            const payment = await sales_service_1.SalesService.recordPayment({
                documentId: id,
                amount,
                paymentMethod: payment_method,
                reference,
                userId,
            });
            res.status(201).json({ success: true, data: payment });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.SalesController = SalesController;
