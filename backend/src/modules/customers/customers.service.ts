// backend/src/modules/customers/customers.service.ts
import { prisma } from '@core/database/db';
import { CodeGeneratorService } from '@shared/code-generator.service';
import { CustomerLedgerService } from './customer-ledger.service';

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
    customerType?: string;
    creditLimit?: number;
    currentBalance?: number;
    isActive?: boolean;
    salesmanId: string; // every customer has a salesman
  }) {
    await CustomerLedgerService.assertValidSalesman(data.salesmanId);
    const code = await CodeGeneratorService.generateCustomerCode();
    return prisma.customer.create({
      data: {
        code,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        taxId: data.taxId || null,
        customerType: data.customerType || "RETAIL",
        creditLimit: data.creditLimit || 0,
        currentBalance: data.currentBalance || 0,
        isActive: data.isActive !== false,
        salesmanId: data.salesmanId,
      },
    });
  }

  /**
   * Find customer by name
   */
  static async findByName(name: string) {
    return prisma.customer.findUnique({
      where: { name },
    });
  }

  /**
   * Find all active customers with optional search and pagination
   */
  static async findAll(query: {
    search?: string;
    limit?: number;
    offset?: number;
    salesmanId?: string; // a user id, or "none" for customers without a salesman
  }) {
    const limit = query.limit || 50;
    const offset = query.offset || 0;

    const where = {
      isActive: true,
      ...(query.salesmanId === "none"
        ? { salesmanId: null }
        : query.salesmanId
          ? { salesmanId: query.salesmanId }
          : {}),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" as const } },
          { email: { contains: query.search, mode: "insensitive" as const } },
          { phone: { contains: query.search, mode: "insensitive" as const } },
          { code: { contains: query.search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.customer.count({ where }),
    ]);

    const ids = Array.from(new Set(customers.map((c) => c.salesmanId).filter(Boolean) as string[]));
    const users = ids.length
      ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      : [];
    const names = new Map(users.map((u) => [u.id, u.name]));
    const data = customers.map((c) => ({
      ...c,
      salesmanName: c.salesmanId ? names.get(c.salesmanId) ?? null : null,
    }));

    return { data, total, limit, offset };
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
        isActive: true,
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { phone: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
          { code: { contains: term, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        code: true,
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
    const found = await this.findByIdRaw(id);
    if (!found) return found;
    const salesman = found.salesmanId
      ? await prisma.user.findUnique({ where: { id: found.salesmanId }, select: { name: true } })
      : null;
    return { ...found, salesmanName: salesman?.name ?? null };
  }

  private static async findByIdRaw(id: string) {
    return prisma.customer.findUnique({
      where: { id },
      include: {
        salesDocuments: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            documentId: true,
            type: true,
            status: true,
            total: true,
            balance: true,
            createdAt: true,
          },
        },
        payments: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            amount: true,
            method: true,
            createdAt: true,
            salesDocument: {
              select: {
                documentId: true,
              },
            },
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
      customerType?: string;
      creditLimit?: number;
      currentBalance?: number;
      isActive?: boolean;
      salesmanId?: string;
    }
  ) {
    if (data.salesmanId) await CustomerLedgerService.assertValidSalesman(data.salesmanId);
    return prisma.customer.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.taxId !== undefined && { taxId: data.taxId || null }),
        ...(data.customerType && { customerType: data.customerType }),
        ...(data.creditLimit !== undefined && { creditLimit: data.creditLimit }),
        ...(data.currentBalance !== undefined && { currentBalance: data.currentBalance }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.salesmanId && { salesmanId: data.salesmanId }),
      },
    });
  }

  /** Assign one salesman to many customers (clean-up of customers created before this rule). */
  static async assignSalesman(customerIds: string[], salesmanId: string) {
    await CustomerLedgerService.assertValidSalesman(salesmanId);
    const r = await prisma.customer.updateMany({ where: { id: { in: customerIds } }, data: { salesmanId } });
    return { updated: r.count };
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
