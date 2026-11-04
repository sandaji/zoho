/**
 * Registers what each approved / rejected request actually does.
 * Imported once by workflow.routes.ts so every handler is live at startup.
 */
import { prisma } from "@core/database/db";
import { registerWorkflowHandler, WorkflowInstanceView } from "../workflow.registry";
import { SalesService } from "../../pos/services/sales.service";
import { SalesDocumentStatus } from "../../../generated/enums";
import { InventoryService } from "../../inventory/services/inventory.service";
import { HrService } from "../../hr/services";
import { ExpenseReportService } from "../../finance/services/expense-report.service";
import { ExpenseReportStatus } from "../../../generated";
import stockCounts from "../../inventory/services/stock-count.service";

// ---------------------------------------------------------------------------
// Customer refund: the credit note is raised as a DRAFT (nothing moves yet).
// Approval closes it and puts the stock back; rejection or withdrawal voids it.
// ---------------------------------------------------------------------------
async function voidDraftCreditNote(inst: WorkflowInstanceView, why: string) {
  const doc = await prisma.salesDocument.findUnique({ where: { id: inst.entityId }, select: { status: true, notes: true } });
  if (!doc || doc.status !== SalesDocumentStatus.DRAFT) return;
  await prisma.salesDocument.update({
    where: { id: inst.entityId },
    data: {
      status: SalesDocumentStatus.VOID,
      notes: [doc.notes, `Refund ${inst.instanceNumber} ${why}`].filter(Boolean).join(" | "),
    },
  });
}

// ---------------------------------------------------------------------------
// Stock adjustment: nothing is written until the last stage approves. The
// request itself lives in the workflow payload, so rejection needs no clean-up.
// The adjustment is booked to the requester, who is the accountable person.
// ---------------------------------------------------------------------------
registerWorkflowHandler("STOCK_ADJUSTMENT", {
  onApproved: async (inst) => {
    const dto = inst.payload as any;
    if (!dto?.productId || !dto?.warehouseId) throw new Error("Adjustment details are missing from the request");
    await new InventoryService().adjustInventory(
      { ...dto, notes: [dto.notes, `Approved via ${inst.instanceNumber}`].filter(Boolean).join(" | "), reference: dto.reference || inst.instanceNumber },
      inst.requestedById,
    );
  },
});

// ---------------------------------------------------------------------------
// Payroll run: records sit in "submitted" while the chain decides. Final approval
// moves them to "approved" (the only route to that status); rejection or
// withdrawal sends them back to draft so HR can correct and resubmit.
// ---------------------------------------------------------------------------
async function payrollIds(inst: WorkflowInstanceView): Promise<string[]> {
  const ids = (inst.payload as any)?.payrollIds;
  return Array.isArray(ids) ? ids.filter((x: unknown): x is string => typeof x === "string") : [];
}

async function returnPayrollToDraft(inst: WorkflowInstanceView, note: string) {
  const ids = await payrollIds(inst);
  if (!ids.length) return;
  await prisma.payroll.updateMany({ where: { id: { in: ids }, status: "submitted" }, data: { status: "draft", notes: note } });
}

registerWorkflowHandler("PAYROLL_RUN", {
  onApproved: async (inst) => {
    const hr = new HrService();
    for (const id of await payrollIds(inst)) {
      const rec = await prisma.payroll.findUnique({ where: { id }, select: { status: true } });
      if (!rec) continue;
      if (rec.status === "draft") await hr.updatePayroll(id, { status: "submitted" } as any, {}, { viaWorkflow: true });
      if (rec.status === "draft" || rec.status === "submitted") {
        await hr.updatePayroll(id, { status: "approved", notes: `Approved via ${inst.instanceNumber}` } as any, {}, { viaWorkflow: true });
      }
    }
  },
  onRejected: async (inst, _actor, reason) => {
    await returnPayrollToDraft(inst, `Payroll ${inst.instanceNumber} rejected${reason ? `: ${reason}` : ""}`);
  },
  onCancelled: async (inst) => {
    await returnPayrollToDraft(inst, `Payroll ${inst.instanceNumber} withdrawn`);
  },
});

// ---------------------------------------------------------------------------
// Expense report: the engine picks one approver by the report total; the report
// itself only changes status once that person decides.
// ---------------------------------------------------------------------------
registerWorkflowHandler("EXPENSE_REPORT", {
  onApproved: async (inst, actorId) => {
    await new ExpenseReportService().updateStatus(
      inst.entityId,
      ExpenseReportStatus.APPROVED,
      actorId,
      [],
      undefined,
      { viaWorkflow: true },
    );
  },
  onRejected: async (inst, actorId, reason) => {
    await new ExpenseReportService().updateStatus(
      inst.entityId,
      ExpenseReportStatus.REJECTED,
      actorId,
      [],
      reason || "Rejected",
      { viaWorkflow: true },
    );
  },
});

// ---------------------------------------------------------------------------
// Stock transfer: approval reserves the stock and releases the request to picking.
// Rejection returns it to DRAFT (there is no rejected status) with a note.
// ---------------------------------------------------------------------------
registerWorkflowHandler("STOCK_TRANSFER", {
  onApproved: async (inst, actorId) => {
    await new InventoryService().approveTransfer(actorId, inst.entityId, { notes: `Approved via ${inst.instanceNumber}` } as any);
  },
  onRejected: async (inst, _actor, reason) => {
    const t = await prisma.stockTransfer.findUnique({ where: { id: inst.entityId }, select: { status: true, notes: true } });
    if (!t || t.status !== "PENDING_APPROVAL") return;
    await prisma.stockTransfer.update({
      where: { id: inst.entityId },
      data: { status: "DRAFT", notes: [t.notes, `Rejected ${inst.instanceNumber}${reason ? `: ${reason}` : ""}`].filter(Boolean).join(" | ") },
    });
  },
  onCancelled: async (inst) => {
    const t = await prisma.stockTransfer.findUnique({ where: { id: inst.entityId }, select: { status: true, notes: true } });
    if (!t || t.status !== "PENDING_APPROVAL") return;
    await prisma.stockTransfer.update({
      where: { id: inst.entityId },
      data: { status: "DRAFT", notes: [t.notes, `Request ${inst.instanceNumber} withdrawn`].filter(Boolean).join(" | ") },
    });
  },
});

// Stock count: approval posts every variance as a stock adjustment (booked to the person
// who posted the count). Rejection or withdrawal returns it to review.
registerWorkflowHandler("STOCK_COUNT", {
  onApproved: async (inst) => {
    await stockCounts.applyApproved(inst.entityId, inst.instanceNumber, inst.requestedById);
  },
  onRejected: async (inst, _actor, reason) => {
    await stockCounts.returnToReview(inst.entityId, `Approval ${inst.instanceNumber} rejected${reason ? `: ${reason}` : ""}`);
  },
  onCancelled: async (inst) => {
    await stockCounts.returnToReview(inst.entityId, `Approval ${inst.instanceNumber} withdrawn`);
  },
});

// Price override: approval is itself the permit (checked when the document is saved),
// so there is nothing to apply.
registerWorkflowHandler("PRICE_OVERRIDE", { onApproved: async () => {} });

registerWorkflowHandler("CREDIT_NOTE", {
  onApproved: async (inst, actorId) => {
    await SalesService.approveCreditNote(inst.entityId, actorId);
  },
  onRejected: async (inst, _actorId, reason) => {
    await voidDraftCreditNote(inst, `rejected${reason ? `: ${reason}` : ""}`);
  },
  onCancelled: async (inst) => {
    await voidDraftCreditNote(inst, "withdrawn by the requester");
  },
});
