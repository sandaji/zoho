// backend/src/modules/customers/customers.service.ts
import { prisma } from "../../lib/db";

export class CustomersService {
  /**
   * Create a new customer
   */
  static async create(data: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    taxId?: string | null;
  }) {
    return prisma.customer.create({
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
  static async findAll(query: {
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = query.limit || 50;
    const offset = query.offset || 0;

    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" as const } },
            { email: { contains: query.search, mode: "insensitive" as const } },
            { phone: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.customer.count({ where }),
    ]);

    return { data: customers, total, limit, offset };
  }

  /**
   * Quick search for POS autocomplete
   */
  static async search(term: string, limit: number = 10) {
    if (!term || term.length < 2) {
      return [];
    }

    return prisma.customer.findMany({
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
  static async findById(id: string) {
    return prisma.customer.findUnique({
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
  static async update(
    id: string,
    data: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      taxId?: string | null;
    }
  ) {
    return prisma.customer.update({
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
  static async delete(id: string) {
    // Check if customer has sales documents
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { salesDocuments: true } } },
    });

    if (customer && customer._count.salesDocuments > 0) {
      throw new Error("Cannot delete customer with existing sales documents");
    }

    return prisma.customer.delete({
      where: { id },
    });
  }
}
