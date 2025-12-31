"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersService = void 0;
// backend/src/modules/customers/customers.service.ts
const db_1 = require("../../lib/db");
class CustomersService {
    /**
     * Create a new customer
     */
    static async create(data) {
        return db_1.prisma.customer.create({
            data: {
                name: data.name,
                email: data.email || null,
                phone: data.phone || null,
                address: data.address || null,
                taxId: data.taxId || null,
            },
        });
    }
    /**
     * Find all customers with optional search and pagination
     */
    static async findAll(query) {
        const limit = query.limit || 50;
        const offset = query.offset || 0;
        const where = query.search
            ? {
                OR: [
                    { name: { contains: query.search, mode: "insensitive" } },
                    { email: { contains: query.search, mode: "insensitive" } },
                    { phone: { contains: query.search, mode: "insensitive" } },
                ],
            }
            : {};
        const [customers, total] = await Promise.all([
            db_1.prisma.customer.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: offset,
            }),
            db_1.prisma.customer.count({ where }),
        ]);
        return { data: customers, total, limit, offset };
    }
    /**
     * Quick search for POS autocomplete
     */
    static async search(term, limit = 10) {
        if (!term || term.length < 2) {
            return [];
        }
        return db_1.prisma.customer.findMany({
            where: {
                OR: [
                    { name: { contains: term, mode: "insensitive" } },
                    { phone: { contains: term, mode: "insensitive" } },
                    { email: { contains: term, mode: "insensitive" } },
                ],
            },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
            },
            take: limit,
            orderBy: { name: "asc" },
        });
    }
    /**
     * Find customer by ID
     */
    static async findById(id) {
        return db_1.prisma.customer.findUnique({
            where: { id },
            include: {
                salesDocuments: {
                    take: 5,
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        documentId: true,
                        type: true,
                        total: true,
                        createdAt: true,
                    },
                },
                _count: {
                    select: { salesDocuments: true, payments: true },
                },
            },
        });
    }
    /**
     * Update customer
     */
    static async update(id, data) {
        return db_1.prisma.customer.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.email !== undefined && { email: data.email || null }),
                ...(data.phone !== undefined && { phone: data.phone || null }),
                ...(data.address !== undefined && { address: data.address || null }),
                ...(data.taxId !== undefined && { taxId: data.taxId || null }),
            },
        });
    }
    /**
     * Delete customer (hard delete - consider soft delete in production)
     */
    static async delete(id) {
        // Check if customer has sales documents
        const customer = await db_1.prisma.customer.findUnique({
            where: { id },
            include: { _count: { select: { salesDocuments: true } } },
        });
        if (customer && customer._count.salesDocuments > 0) {
            throw new Error("Cannot delete customer with existing sales documents");
        }
        return db_1.prisma.customer.delete({
            where: { id },
        });
    }
}
exports.CustomersService = CustomersService;
