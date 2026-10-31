import { prisma } from "@core/database/db";
import { AppError, ErrorCode } from "@core/errors/errors";
import { CustomersService } from "../customers/customers.service";

export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "UNQUALIFIED", "CONVERTED"] as const;
export const LEAD_SOURCES = ["WALK_IN", "REFERRAL", "WEBSITE", "SOCIAL_MEDIA", "PHONE", "EVENT", "CAMPAIGN", "OTHER"] as const;
export const OPEN_STAGES = ["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION"] as const;
export const OPPORTUNITY_STAGES = [...OPEN_STAGES, "WON", "LOST"] as const;
export const INTERACTION_TYPES = ["CALL", "EMAIL", "MEETING", "VISIT", "WHATSAPP", "NOTE"] as const;

const STAGE_PROBABILITY: Record<string, number> = {
  PROSPECTING: 10,
  QUALIFICATION: 25,
  PROPOSAL: 50,
  NEGOTIATION: 75,
  WON: 100,
  LOST: 0,
};

const bad = (msg: string) => new AppError(ErrorCode.VALIDATION_ERROR, 400, msg);
const forbid = (msg: string) => new AppError(ErrorCode.FORBIDDEN, 403, msg);
const notFound = (msg: string) => new AppError(ErrorCode.NOT_FOUND, 404, msg);

export interface CrmContext {
  userId: string;
  branchId?: string | null;
  perms: string[];
}

const clean = (v?: string | null) => (v && v.trim() ? v.trim() : null);
const asDate = (v: unknown, label: string): Date => {
  const d = new Date(v as string);
  if (!v || Number.isNaN(d.getTime())) throw bad(`${label} is not a valid date.`);
  return d;
};

export class CrmService {
  // ---------------------------------------------------------------- helpers

  private seesAll = (c: CrmContext) => c.perms.includes("crm.pipeline.view_all");
  private crossBranch = (c: CrmContext) => c.perms.includes("org.branches.view_all");

  private async myTerritoryIds(userId: string): Promise<string[]> {
    const rows = await prisma.crmTerritoryMember.findMany({ where: { userId }, select: { territoryId: true } });
    return rows.map((r) => r.territoryId);
  }

  /** Visibility filter for leads and opportunities. */
  private async recordScope(c: CrmContext): Promise<Record<string, any>> {
    const and: Record<string, any>[] = [];
    if (!this.crossBranch(c) && c.branchId) and.push({ OR: [{ branchId: c.branchId }, { branchId: null }] });
    if (!this.seesAll(c)) {
      const territories = await this.myTerritoryIds(c.userId);
      and.push({
        OR: [{ ownerId: c.userId }, ...(territories.length ? [{ territoryId: { in: territories } }] : [])],
      });
    }
    return and.length ? { AND: and } : {};
  }

  private async canAccess(rec: { ownerId: string; territoryId?: string | null; branchId?: string | null }, c: CrmContext) {
    if (!this.crossBranch(c) && c.branchId && rec.branchId && rec.branchId !== c.branchId) return false;
    if (this.seesAll(c) || rec.ownerId === c.userId) return true;
    if (rec.territoryId) return (await this.myTerritoryIds(c.userId)).includes(rec.territoryId);
    return false;
  }

  private async assertAccess(rec: { ownerId: string; territoryId?: string | null; branchId?: string | null }, c: CrmContext) {
    if (!(await this.canAccess(rec, c))) throw forbid("You do not have access to this record.");
  }

  private async attachUsers<T extends Record<string, any>>(rows: T[], keys: string[]) {
    const ids = new Set<string>();
    for (const r of rows) for (const k of keys) if (r[k]) ids.add(r[k]);
    const users = ids.size
      ? await prisma.user.findMany({ where: { id: { in: [...ids] } }, select: { id: true, name: true, email: true } })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    return rows.map((r) => {
      const extra: Record<string, unknown> = {};
      for (const k of keys) extra[k.replace(/Id$/, "")] = r[k] ? (byId.get(r[k]) ?? null) : null;
      return { ...r, ...extra };
    });
  }

  private async attachTerritories<T extends Record<string, any>>(rows: T[]) {
    const ids = [...new Set(rows.map((r) => r.territoryId).filter(Boolean))] as string[];
    const list = ids.length
      ? await prisma.crmTerritory.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      : [];
    const byId = new Map(list.map((t) => [t.id, t]));
    return rows.map((r) => ({ ...r, territory: r.territoryId ? (byId.get(r.territoryId) ?? null) : null }));
  }

  private async nextNumber(prefix: string, counter: () => Promise<number>) {
    return `${prefix}-${new Date().getFullYear()}-${((await counter()) + 1).toString().padStart(5, "0")}`;
  }

  private async userByEmail(email?: string) {
    if (!email?.trim()) throw bad("A user email is required.");
    const u = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
      select: { id: true, name: true, email: true },
    });
    if (!u) throw bad(`No user found with the email ${email.trim()}.`);
    return u;
  }

  /** A territory the caller may file records under (members, or anyone with view_all). */
  private async assertTerritoryUsable(territoryId: string | null | undefined, c: CrmContext) {
    if (!territoryId) return;
    const t = await prisma.crmTerritory.findUnique({ where: { id: territoryId } });
    if (!t || !t.isActive) throw bad("That territory does not exist or is inactive.");
    if (this.seesAll(c)) return;
    if (!(await this.myTerritoryIds(c.userId)).includes(territoryId))
      throw forbid("You can only use territories you belong to.");
  }

  // ------------------------------------------------------------------ leads

  async createLead(
    c: CrmContext,
    d: {
      name: string;
      company?: string;
      email?: string;
      phone?: string;
      address?: string;
      source?: string;
      notes?: string;
      territoryId?: string;
      ownerEmail?: string;
    },
  ) {
    if (!d.name?.trim()) throw bad("Lead name is required.");
    if (!d.email?.trim() && !d.phone?.trim()) throw bad("Give at least an email or a phone number.");
    const source = (d.source || "OTHER").toUpperCase();
    if (!(LEAD_SOURCES as readonly string[]).includes(source)) throw bad("Unknown lead source.");
    await this.assertTerritoryUsable(d.territoryId, c);

    // Only managers (view_all) may assign a lead to someone else.
    let ownerId = c.userId;
    if (d.ownerEmail?.trim()) {
      if (!this.seesAll(c)) throw forbid("Only a sales manager can assign a lead to someone else.");
      ownerId = (await this.userByEmail(d.ownerEmail)).id;
    }

    const leadNumber = await this.nextNumber("LD", () => prisma.crmLead.count());
    const lead = await prisma.crmLead.create({
      data: {
        leadNumber,
        name: d.name.trim(),
        company: clean(d.company),
        email: clean(d.email),
        phone: clean(d.phone),
        address: clean(d.address),
        source,
        notes: clean(d.notes),
        territoryId: d.territoryId || null,
        branchId: c.branchId ?? null,
        ownerId,
      },
    });
    return lead;
  }

  async listLeads(
    c: CrmContext,
    q: { status?: string; search?: string; territoryId?: string; ownerId?: string; limit?: number; offset?: number },
  ) {
    const scope = await this.recordScope(c);
    const where: Record<string, any> = { ...scope };
    const and: Record<string, any>[] = scope.AND ? [...scope.AND] : [];
    if (q.status) where.status = q.status.toUpperCase();
    if (q.territoryId) where.territoryId = q.territoryId;
    if (q.ownerId && this.seesAll(c)) where.ownerId = q.ownerId;
    if (q.search?.trim()) {
      const s = q.search.trim();
      and.push({
        OR: [
          { name: { contains: s, mode: "insensitive" } },
          { company: { contains: s, mode: "insensitive" } },
          { email: { contains: s, mode: "insensitive" } },
          { phone: { contains: s, mode: "insensitive" } },
          { leadNumber: { contains: s, mode: "insensitive" } },
        ],
      });
    }
    if (and.length) where.AND = and;

    const limit = Math.min(q.limit || 50, 200);
    const [rows, total] = await Promise.all([
      prisma.crmLead.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: q.offset || 0 }),
      prisma.crmLead.count({ where }),
    ]);
    const withOwners = await this.attachUsers(rows, ["ownerId"]);
    return { data: await this.attachTerritories(withOwners), total, limit, offset: q.offset || 0 };
  }

  async getLead(id: string, c: CrmContext) {
    const lead = await prisma.crmLead.findUnique({ where: { id } });
    if (!lead) throw notFound("Lead not found");
    await this.assertAccess(lead, c);
    const [interactions, tasks, opportunities] = await Promise.all([
      prisma.crmInteraction.findMany({ where: { leadId: id }, orderBy: { interactionDate: "desc" }, take: 100 }),
      prisma.crmTask.findMany({ where: { leadId: id }, orderBy: { dueDate: "asc" }, take: 100 }),
      prisma.crmOpportunity.findMany({ where: { leadId: id }, orderBy: { createdAt: "desc" } }),
    ]);
    const [withOwner] = await this.attachUsers([lead], ["ownerId"]);
    const [full] = await this.attachTerritories([withOwner]);
    return {
      ...full,
      interactions: await this.attachUsers(interactions, ["createdById"]),
      tasks: await this.attachUsers(tasks, ["assignedToId"]),
      opportunities,
    };
  }

  async updateLead(
    id: string,
    c: CrmContext,
    d: Partial<{
      name: string;
      company: string;
      email: string;
      phone: string;
      address: string;
      source: string;
      status: string;
      notes: string;
      territoryId: string | null;
      ownerEmail: string;
    }>,
  ) {
    const lead = await prisma.crmLead.findUnique({ where: { id } });
    if (!lead) throw notFound("Lead not found");
    await this.assertAccess(lead, c);
    if (lead.status === "CONVERTED") throw bad("A converted lead can no longer be edited.");

    const data: Record<string, any> = {};
    if (d.name !== undefined) {
      if (!d.name.trim()) throw bad("Lead name cannot be empty.");
      data.name = d.name.trim();
    }
    for (const k of ["company", "email", "phone", "address", "notes"] as const)
      if (d[k] !== undefined) data[k] = clean(d[k]);
    if (d.source !== undefined) {
      const s = d.source.toUpperCase();
      if (!(LEAD_SOURCES as readonly string[]).includes(s)) throw bad("Unknown lead source.");
      data.source = s;
    }
    if (d.status !== undefined) {
      const s = d.status.toUpperCase();
      if (!(LEAD_STATUSES as readonly string[]).includes(s) || s === "CONVERTED")
        throw bad("Status must be NEW, CONTACTED, QUALIFIED or UNQUALIFIED. Use Convert to turn a lead into a customer.");
      data.status = s;
    }
    if (d.territoryId !== undefined) {
      await this.assertTerritoryUsable(d.territoryId, c);
      data.territoryId = d.territoryId || null;
    }
    if (d.ownerEmail?.trim()) {
      if (!this.seesAll(c)) throw forbid("Only a sales manager can reassign a lead.");
      data.ownerId = (await this.userByEmail(d.ownerEmail)).id;
    }
    return prisma.crmLead.update({ where: { id }, data });
  }

  /** Turns a lead into a customer record (or links to an existing one with the same name). */
  async convertLead(id: string, c: CrmContext) {
    const lead = await prisma.crmLead.findUnique({ where: { id } });
    if (!lead) throw notFound("Lead not found");
    await this.assertAccess(lead, c);
    if (lead.status === "CONVERTED") throw bad("This lead has already been converted.");
    if (lead.status === "UNQUALIFIED") throw bad("An unqualified lead cannot be converted. Re-qualify it first.");

    const customerName = (lead.company || lead.name).trim();
    // Customer names and emails are both unique, so match on either before creating.
    const existing =
      (await CustomersService.findByName(customerName)) ??
      (lead.email
        ? await prisma.customer.findFirst({ where: { email: { equals: lead.email, mode: "insensitive" } } })
        : null);
    const customer =
      existing ??
      (await CustomersService.create({
        name: customerName,
        email: lead.email,
        phone: lead.phone,
        address: lead.address,
        customerType: lead.company ? "CORPORATE" : "RETAIL",
      }));

    const updated = await prisma.crmLead.update({
      where: { id },
      data: { status: "CONVERTED", customerId: customer.id, convertedAt: new Date() },
    });
    return { lead: updated, customer, linkedExisting: !!existing };
  }

  // ---------------------------------------------------------- opportunities

  async createOpportunity(
    c: CrmContext,
    d: {
      title: string;
      leadId?: string;
      customerId?: string;
      customerName?: string;
      value?: number;
      expectedCloseDate?: string;
      territoryId?: string;
      notes?: string;
      ownerEmail?: string;
    },
  ) {
    if (!d.title?.trim()) throw bad("Opportunity title is required.");
    if (d.value !== undefined && !(d.value >= 0)) throw bad("Value cannot be negative.");

    let territoryId = d.territoryId || null;
    let customerId = d.customerId || null;
    let customerName = clean(d.customerName);
    let branchId = c.branchId ?? null;
    let ownerId = c.userId;

    if (d.leadId) {
      const lead = await prisma.crmLead.findUnique({ where: { id: d.leadId } });
      if (!lead) throw bad("That lead does not exist.");
      await this.assertAccess(lead, c);
      territoryId = territoryId ?? lead.territoryId;
      customerId = customerId ?? lead.customerId;
      customerName = customerName ?? lead.company ?? lead.name;
      branchId = lead.branchId ?? branchId;
      ownerId = lead.ownerId;
    }
    if (customerId && !customerName) {
      const cust = await prisma.customer.findUnique({ where: { id: customerId }, select: { name: true } });
      if (!cust) throw bad("That customer does not exist.");
      customerName = cust.name;
    }
    if (!customerName) throw bad("Pick a customer or a lead for this opportunity.");
    await this.assertTerritoryUsable(territoryId, c);

    if (d.ownerEmail?.trim()) {
      if (!this.seesAll(c)) throw forbid("Only a sales manager can assign an opportunity to someone else.");
      ownerId = (await this.userByEmail(d.ownerEmail)).id;
    }

    const opportunityNumber = await this.nextNumber("OP", () => prisma.crmOpportunity.count());
    return prisma.crmOpportunity.create({
      data: {
        opportunityNumber,
        title: d.title.trim(),
        leadId: d.leadId || null,
        customerId,
        customerName,
        value: d.value ?? 0,
        probability: STAGE_PROBABILITY.PROSPECTING,
        expectedCloseDate: d.expectedCloseDate ? asDate(d.expectedCloseDate, "Expected close date") : null,
        notes: clean(d.notes),
        territoryId,
        branchId,
        ownerId,
      },
    });
  }

  async listOpportunities(
    c: CrmContext,
    q: { stage?: string; search?: string; territoryId?: string; ownerId?: string; open?: boolean },
  ) {
    const scope = await this.recordScope(c);
    const where: Record<string, any> = { ...scope };
    const and: Record<string, any>[] = scope.AND ? [...scope.AND] : [];
    if (q.stage) where.stage = q.stage.toUpperCase();
    else if (q.open) where.stage = { in: [...OPEN_STAGES] };
    if (q.territoryId) where.territoryId = q.territoryId;
    if (q.ownerId && this.seesAll(c)) where.ownerId = q.ownerId;
    if (q.search?.trim()) {
      const s = q.search.trim();
      and.push({
        OR: [
          { title: { contains: s, mode: "insensitive" } },
          { customerName: { contains: s, mode: "insensitive" } },
          { opportunityNumber: { contains: s, mode: "insensitive" } },
        ],
      });
    }
    if (and.length) where.AND = and;

    const rows = await prisma.crmOpportunity.findMany({ where, orderBy: { updatedAt: "desc" }, take: 500 });
    return this.attachDocuments(await this.attachTerritories(await this.attachUsers(rows, ["ownerId"])));
  }

  async getOpportunity(id: string, c: CrmContext) {
    const opp = await prisma.crmOpportunity.findUnique({ where: { id } });
    if (!opp) throw notFound("Opportunity not found");
    await this.assertAccess(opp, c);
    const [interactions, tasks] = await Promise.all([
      prisma.crmInteraction.findMany({ where: { opportunityId: id }, orderBy: { interactionDate: "desc" }, take: 100 }),
      prisma.crmTask.findMany({ where: { opportunityId: id }, orderBy: { dueDate: "asc" }, take: 100 }),
    ]);
    const [withOwner] = await this.attachUsers([opp], ["ownerId"]);
    const [withTerritory] = await this.attachTerritories([withOwner]);
    const [full] = await this.attachDocuments([withTerritory]);
    return {
      ...full,
      interactions: await this.attachUsers(interactions, ["createdById"]),
      tasks: await this.attachUsers(tasks, ["assignedToId"]),
    };
  }

  async updateOpportunity(
    id: string,
    c: CrmContext,
    d: Partial<{ title: string; value: number; expectedCloseDate: string | null; notes: string; territoryId: string | null; ownerEmail: string }>,
  ) {
    const opp = await prisma.crmOpportunity.findUnique({ where: { id } });
    if (!opp) throw notFound("Opportunity not found");
    await this.assertAccess(opp, c);
    if (opp.stage === "WON" || opp.stage === "LOST") throw bad("A closed opportunity can no longer be edited.");

    const data: Record<string, any> = {};
    if (d.title !== undefined) {
      if (!d.title.trim()) throw bad("Title cannot be empty.");
      data.title = d.title.trim();
    }
    if (d.value !== undefined) {
      if (!(d.value >= 0)) throw bad("Value cannot be negative.");
      data.value = d.value;
    }
    if (d.expectedCloseDate !== undefined)
      data.expectedCloseDate = d.expectedCloseDate ? asDate(d.expectedCloseDate, "Expected close date") : null;
    if (d.notes !== undefined) data.notes = clean(d.notes);
    if (d.territoryId !== undefined) {
      await this.assertTerritoryUsable(d.territoryId, c);
      data.territoryId = d.territoryId || null;
    }
    if (d.ownerEmail?.trim()) {
      if (!this.seesAll(c)) throw forbid("Only a sales manager can reassign an opportunity.");
      data.ownerId = (await this.userByEmail(d.ownerEmail)).id;
    }
    return prisma.crmOpportunity.update({ where: { id }, data });
  }

  async moveStage(id: string, c: CrmContext, stage: string, lostReason?: string) {
    const next = (stage || "").toUpperCase();
    if (!(OPPORTUNITY_STAGES as readonly string[]).includes(next)) throw bad("Unknown stage.");
    const opp = await prisma.crmOpportunity.findUnique({ where: { id } });
    if (!opp) throw notFound("Opportunity not found");
    await this.assertAccess(opp, c);
    if (opp.stage === "WON" || opp.stage === "LOST") throw bad("This opportunity is already closed.");
    if (next === opp.stage) return opp;
    if (next === "LOST" && !lostReason?.trim()) throw bad("Say why the opportunity was lost.");
    if (next === "WON" && !(opp.value > 0)) throw bad("Set the deal value before marking it won.");

    const closing = next === "WON" || next === "LOST";
    return prisma.crmOpportunity.update({
      where: { id },
      data: {
        stage: next,
        probability: STAGE_PROBABILITY[next],
        closedAt: closing ? new Date() : null,
        lostReason: next === "LOST" ? lostReason!.trim() : null,
      },
    });
  }

  // ----------------------------------------------------------- interactions

  /** Quotation / invoice summary for deals that have one linked. */
  private async attachDocuments<T extends { salesDocumentId?: string | null }>(rows: T[]) {
    const ids = [...new Set(rows.map((r) => r.salesDocumentId).filter(Boolean))] as string[];
    const docs = ids.length
      ? await prisma.salesDocument.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            type: true,
            status: true,
            documentId: true,
            quoteNumber: true,
            invoiceNumber: true,
            draftNumber: true,
            total: true,
            paymentStatus: true,
          },
        })
      : [];
    const byId = new Map(
      docs.map((d) => [
        d.id,
        {
          id: d.id,
          type: String(d.type),
          status: String(d.status),
          number: d.invoiceNumber || d.quoteNumber || d.draftNumber || d.documentId,
          total: d.total,
          paymentStatus: d.paymentStatus ? String(d.paymentStatus) : null,
        },
      ]),
    );
    return rows.map((r) => ({ ...r, document: r.salesDocumentId ? (byId.get(r.salesDocumentId) ?? null) : null }));
  }

  /** Attach a quotation or invoice, found by its number, to a deal. */
  async linkDocument(id: string, c: CrmContext, documentNumber: string) {
    const opp = await prisma.crmOpportunity.findUnique({ where: { id } });
    if (!opp) throw notFound("Opportunity not found");
    await this.assertAccess(opp, c);
    const num = documentNumber?.trim();
    if (!num) throw bad("Enter the quotation or invoice number.");

    const doc = await prisma.salesDocument.findFirst({
      where: {
        OR: [
          { quoteNumber: { equals: num, mode: "insensitive" } },
          { invoiceNumber: { equals: num, mode: "insensitive" } },
          { documentId: { equals: num, mode: "insensitive" } },
        ],
      },
      select: { id: true, customerId: true, createdById: true, total: true },
    });
    if (!doc) throw bad(`No quotation or invoice found with the number ${num}.`);

    const wide = c.perms.includes("sales.order.view_all") || this.seesAll(c);
    if (!wide && doc.createdById !== c.userId) throw forbid("You can only link documents you created.");
    if (opp.customerId && doc.customerId && opp.customerId !== doc.customerId)
      throw bad("That document belongs to a different customer than this deal.");
    const taken = await prisma.crmOpportunity.findFirst({
      where: { salesDocumentId: doc.id, NOT: { id } },
      select: { opportunityNumber: true },
    });
    if (taken) throw bad(`That document is already linked to ${taken.opportunityNumber}.`);

    const updated = await prisma.crmOpportunity.update({
      where: { id },
      data: {
        salesDocumentId: doc.id,
        ...(!opp.customerId && doc.customerId ? { customerId: doc.customerId } : {}),
        ...(opp.value > 0 ? {} : { value: doc.total }),
      },
    });
    return (await this.attachDocuments([updated]))[0];
  }

  async unlinkDocument(id: string, c: CrmContext) {
    const opp = await prisma.crmOpportunity.findUnique({ where: { id } });
    if (!opp) throw notFound("Opportunity not found");
    await this.assertAccess(opp, c);
    return prisma.crmOpportunity.update({ where: { id }, data: { salesDocumentId: null } });
  }

  /** The record an interaction or task hangs off must be visible to the caller. */
  private async assertParent(c: CrmContext, p: { leadId?: string; opportunityId?: string; customerId?: string }) {
    if (!p.leadId && !p.opportunityId && !p.customerId) throw bad("Attach it to a lead, an opportunity or a customer.");
    if (p.leadId) {
      const l = await prisma.crmLead.findUnique({ where: { id: p.leadId } });
      if (!l) throw bad("That lead does not exist.");
      await this.assertAccess(l, c);
    }
    if (p.opportunityId) {
      const o = await prisma.crmOpportunity.findUnique({ where: { id: p.opportunityId } });
      if (!o) throw bad("That opportunity does not exist.");
      await this.assertAccess(o, c);
    }
    if (p.customerId) {
      const cust = await prisma.customer.findUnique({ where: { id: p.customerId }, select: { id: true } });
      if (!cust) throw bad("That customer does not exist.");
    }
  }

  async logInteraction(
    c: CrmContext,
    d: { type?: string; subject: string; notes?: string; interactionDate?: string; leadId?: string; opportunityId?: string; customerId?: string },
  ) {
    if (!d.subject?.trim()) throw bad("A subject is required.");
    const type = (d.type || "NOTE").toUpperCase();
    if (!(INTERACTION_TYPES as readonly string[]).includes(type)) throw bad("Unknown interaction type.");
    await this.assertParent(c, d);
    const interactionDate = d.interactionDate ? asDate(d.interactionDate, "Interaction date") : new Date();
    const row = await prisma.crmInteraction.create({
      data: {
        type,
        subject: d.subject.trim(),
        notes: clean(d.notes),
        interactionDate,
        leadId: d.leadId || null,
        opportunityId: d.opportunityId || null,
        customerId: d.customerId || null,
        createdById: c.userId,
      },
    });

    // First contact moves a brand-new lead on to CONTACTED.
    if (d.leadId && type !== "NOTE") {
      await prisma.crmLead.updateMany({ where: { id: d.leadId, status: "NEW" }, data: { status: "CONTACTED" } });
    }
    return row;
  }

  async listInteractions(c: CrmContext, q: { leadId?: string; opportunityId?: string; customerId?: string }) {
    await this.assertParent(c, q);
    const where: Record<string, any> = {};
    if (q.leadId) where.leadId = q.leadId;
    if (q.opportunityId) where.opportunityId = q.opportunityId;
    if (q.customerId) where.customerId = q.customerId;
    const rows = await prisma.crmInteraction.findMany({ where, orderBy: { interactionDate: "desc" }, take: 200 });
    return this.attachUsers(rows, ["createdById"]);
  }

  // ------------------------------------------------------------------ tasks

  async createTask(
    c: CrmContext,
    d: { title: string; notes?: string; dueDate: string; leadId?: string; opportunityId?: string; customerId?: string; assigneeEmail?: string },
  ) {
    if (!d.title?.trim()) throw bad("A title is required.");
    const dueDate = asDate(d.dueDate, "Due date");
    await this.assertParent(c, d);
    let assignedToId = c.userId;
    if (d.assigneeEmail?.trim()) {
      const u = await this.userByEmail(d.assigneeEmail);
      if (u.id !== c.userId && !this.seesAll(c)) throw forbid("Only a sales manager can assign follow-ups to others.");
      assignedToId = u.id;
    }
    return prisma.crmTask.create({
      data: {
        title: d.title.trim(),
        notes: clean(d.notes),
        dueDate,
        leadId: d.leadId || null,
        opportunityId: d.opportunityId || null,
        customerId: d.customerId || null,
        assignedToId,
        createdById: c.userId,
      },
    });
  }

  async listTasks(c: CrmContext, q: { status?: string; mine?: boolean; leadId?: string; opportunityId?: string; overdue?: boolean }) {
    const where: Record<string, any> = {};
    if (!this.seesAll(c) || q.mine !== false) {
      where.OR = [{ assignedToId: c.userId }, { createdById: c.userId }];
    }
    if (q.status) where.status = q.status.toUpperCase();
    if (q.leadId) where.leadId = q.leadId;
    if (q.opportunityId) where.opportunityId = q.opportunityId;
    if (q.overdue) {
      where.status = "OPEN";
      where.dueDate = { lt: new Date() };
    }
    const rows = await prisma.crmTask.findMany({ where, orderBy: { dueDate: "asc" }, take: 300 });
    return this.attachUsers(rows, ["assignedToId", "createdById"]);
  }

  async setTaskStatus(id: string, c: CrmContext, status: string) {
    const next = (status || "").toUpperCase();
    if (!["OPEN", "DONE", "CANCELLED"].includes(next)) throw bad("Status must be OPEN, DONE or CANCELLED.");
    const task = await prisma.crmTask.findUnique({ where: { id } });
    if (!task) throw notFound("Task not found");
    if (!this.seesAll(c) && task.assignedToId !== c.userId && task.createdById !== c.userId)
      throw forbid("This follow-up belongs to someone else.");
    return prisma.crmTask.update({
      where: { id },
      data: { status: next, completedAt: next === "DONE" ? new Date() : null },
    });
  }

  // ------------------------------------------------------------ territories

  async listTerritories(c: CrmContext) {
    const where: Record<string, any> = { isActive: true };
    if (!this.crossBranch(c) && c.branchId) where.OR = [{ branchId: c.branchId }, { branchId: null }];
    const [territories, members] = await Promise.all([
      prisma.crmTerritory.findMany({ where, orderBy: { name: "asc" } }),
      prisma.crmTerritoryMember.findMany({ select: { territoryId: true } }),
    ]);
    const counts = new Map<string, number>();
    for (const m of members) counts.set(m.territoryId, (counts.get(m.territoryId) ?? 0) + 1);
    return territories.map((t) => ({ ...t, memberCount: counts.get(t.id) ?? 0 }));
  }

  async getTerritory(id: string, c: CrmContext) {
    const t = await prisma.crmTerritory.findUnique({ where: { id } });
    if (!t) throw notFound("Territory not found");
    const members = await prisma.crmTerritoryMember.findMany({ where: { territoryId: id }, orderBy: { createdAt: "asc" } });
    const isMember = members.some((m) => m.userId === c.userId);
    if (!isMember && !this.seesAll(c) && !c.perms.includes("crm.territory.manage"))
      throw forbid("You can only view territories you belong to.");

    const [leadCount, opps] = await Promise.all([
      prisma.crmLead.count({ where: { territoryId: id } }),
      prisma.crmOpportunity.findMany({ where: { territoryId: id }, select: { stage: true, value: true, probability: true } }),
    ]);
    const open = opps.filter((o) => (OPEN_STAGES as readonly string[]).includes(o.stage));
    return {
      ...t,
      members: await this.attachUsers(members, ["userId"]),
      performance: {
        leads: leadCount,
        openDeals: open.length,
        openValue: open.reduce((s, o) => s + o.value, 0),
        weightedValue: open.reduce((s, o) => s + (o.value * o.probability) / 100, 0),
        wonDeals: opps.filter((o) => o.stage === "WON").length,
        wonValue: opps.filter((o) => o.stage === "WON").reduce((s, o) => s + o.value, 0),
      },
    };
  }

  async createTerritory(c: CrmContext, d: { name: string; description?: string; branchId?: string }) {
    if (!d.name?.trim()) throw bad("Territory name is required.");
    const dup = await prisma.crmTerritory.findUnique({ where: { name: d.name.trim() } });
    if (dup) throw bad("A territory with that name already exists.");
    return prisma.crmTerritory.create({
      data: { name: d.name.trim(), description: clean(d.description), branchId: d.branchId ?? c.branchId ?? null },
    });
  }

  async updateTerritory(id: string, d: Partial<{ name: string; description: string; isActive: boolean }>) {
    const t = await prisma.crmTerritory.findUnique({ where: { id } });
    if (!t) throw notFound("Territory not found");
    const data: Record<string, any> = {};
    if (d.name !== undefined) {
      if (!d.name.trim()) throw bad("Territory name cannot be empty.");
      const dup = await prisma.crmTerritory.findUnique({ where: { name: d.name.trim() } });
      if (dup && dup.id !== id) throw bad("A territory with that name already exists.");
      data.name = d.name.trim();
    }
    if (d.description !== undefined) data.description = clean(d.description);
    if (d.isActive !== undefined) data.isActive = d.isActive;
    return prisma.crmTerritory.update({ where: { id }, data });
  }

  async addMember(territoryId: string, email: string) {
    const t = await prisma.crmTerritory.findUnique({ where: { id: territoryId } });
    if (!t) throw notFound("Territory not found");
    const u = await this.userByEmail(email);
    return prisma.crmTerritoryMember.upsert({
      where: { territoryId_userId: { territoryId, userId: u.id } },
      update: {},
      create: { territoryId, userId: u.id },
    });
  }

  async removeMember(territoryId: string, userId: string) {
    await prisma.crmTerritoryMember.deleteMany({ where: { territoryId, userId } });
    return { removed: true };
  }

  // ---------------------------------------------------------------- targets

  async setTarget(
    c: CrmContext,
    d: { userEmail: string; territoryId?: string; periodStart: string; periodEnd: string; targetAmount: number },
  ) {
    const u = await this.userByEmail(d.userEmail);
    const periodStart = asDate(d.periodStart, "Period start");
    const periodEnd = asDate(d.periodEnd, "Period end");
    if (periodEnd <= periodStart) throw bad("The period must end after it starts.");
    if (!(d.targetAmount > 0)) throw bad("The target must be greater than zero.");
    if (d.territoryId) {
      const t = await prisma.crmTerritory.findUnique({ where: { id: d.territoryId } });
      if (!t) throw bad("That territory does not exist.");
    }
    const overlap = await prisma.crmSalesTarget.findFirst({
      where: {
        userId: u.id,
        territoryId: d.territoryId || null,
        periodStart: { lt: periodEnd },
        periodEnd: { gt: periodStart },
      },
    });
    if (overlap) throw bad("This person already has a target covering part of that period.");
    return prisma.crmSalesTarget.create({
      data: {
        userId: u.id,
        territoryId: d.territoryId || null,
        periodStart,
        periodEnd,
        targetAmount: d.targetAmount,
        createdById: c.userId,
      },
    });
  }

  async deleteTarget(id: string) {
    await prisma.crmSalesTarget.deleteMany({ where: { id } });
    return { deleted: true };
  }

  /** Targets with progress: won deals closed in the period, owned by the person. */
  async listTargets(c: CrmContext, q: { current?: boolean }) {
    const where: Record<string, any> = {};
    const all = c.perms.includes("crm.target.manage") || this.seesAll(c);
    if (!all) where.userId = c.userId;
    if (q.current) {
      const now = new Date();
      where.periodStart = { lte: now };
      where.periodEnd = { gte: now };
    }
    const targets = await prisma.crmSalesTarget.findMany({ where, orderBy: { periodStart: "desc" }, take: 200 });
    const withProgress = await Promise.all(
      targets.map(async (t) => {
        const won = await prisma.crmOpportunity.aggregate({
          where: {
            ownerId: t.userId,
            stage: "WON",
            closedAt: { gte: t.periodStart, lte: t.periodEnd },
            ...(t.territoryId && { territoryId: t.territoryId }),
          },
          _sum: { value: true },
          _count: true,
        });
        const achieved = won._sum.value ?? 0;
        return {
          ...t,
          achieved,
          dealsWon: won._count,
          percent: t.targetAmount > 0 ? Math.round((achieved / t.targetAmount) * 1000) / 10 : 0,
        };
      }),
    );
    return this.attachTerritories(await this.attachUsers(withProgress, ["userId"]));
  }

  // -------------------------------------------------------------- dashboard

  async dashboard(c: CrmContext) {
    const scope = await this.recordScope(c);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [leads, opps, myOpenTasks] = await Promise.all([
      prisma.crmLead.groupBy({ by: ["status"], where: scope, _count: true }),
      prisma.crmOpportunity.findMany({
        where: scope,
        select: { stage: true, value: true, probability: true, closedAt: true, territoryId: true },
      }),
      prisma.crmTask.findMany({
        where: { assignedToId: c.userId, status: "OPEN" },
        select: { dueDate: true },
      }),
    ]);

    const leadByStatus: Record<string, number> = {};
    let totalLeads = 0;
    for (const l of leads) {
      leadByStatus[l.status] = l._count;
      totalLeads += l._count;
    }

    const pipeline = OPEN_STAGES.map((stage) => {
      const rows = opps.filter((o) => o.stage === stage);
      return {
        stage,
        count: rows.length,
        value: rows.reduce((s, o) => s + o.value, 0),
        weighted: rows.reduce((s, o) => s + (o.value * o.probability) / 100, 0),
      };
    });

    const won = opps.filter((o) => o.stage === "WON");
    const lost = opps.filter((o) => o.stage === "LOST");
    const wonThisMonth = won.filter((o) => o.closedAt && o.closedAt >= monthStart);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 86_400_000);

    // Territory league table: only for people who can see more than their own.
    let territories: { id: string; name: string; openValue: number; wonValue: number; deals: number }[] = [];
    if (this.seesAll(c)) {
      const list = await prisma.crmTerritory.findMany({ where: { isActive: true }, select: { id: true, name: true } });
      territories = list
        .map((t) => {
          const rows = opps.filter((o) => o.territoryId === t.id);
          return {
            id: t.id,
            name: t.name,
            openValue: rows.filter((o) => (OPEN_STAGES as readonly string[]).includes(o.stage)).reduce((s, o) => s + o.value, 0),
            wonValue: rows.filter((o) => o.stage === "WON").reduce((s, o) => s + o.value, 0),
            deals: rows.length,
          };
        })
        .sort((a, b) => b.wonValue - a.wonValue);
    }

    return {
      leads: {
        total: totalLeads,
        byStatus: leadByStatus,
        conversionRate: totalLeads ? Math.round(((leadByStatus.CONVERTED ?? 0) / totalLeads) * 1000) / 10 : 0,
      },
      pipeline,
      openValue: pipeline.reduce((s, p) => s + p.value, 0),
      weightedValue: pipeline.reduce((s, p) => s + p.weighted, 0),
      won: { count: won.length, value: won.reduce((s, o) => s + o.value, 0) },
      wonThisMonth: { count: wonThisMonth.length, value: wonThisMonth.reduce((s, o) => s + o.value, 0) },
      winRate: won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 1000) / 10 : 0,
      myTasks: {
        open: myOpenTasks.length,
        overdue: myOpenTasks.filter((t) => t.dueDate < startOfToday).length,
        dueToday: myOpenTasks.filter((t) => t.dueDate >= startOfToday && t.dueDate < endOfToday).length,
      },
      territories,
      myTargets: await this.listTargets({ ...c, perms: c.perms.filter((p) => p !== "crm.target.manage" && p !== "crm.pipeline.view_all") }, { current: true }),
    };
  }
}

export default new CrmService();
