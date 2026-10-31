/**
 * Registers what each approved / rejected request actually does.
 * Imported once by workflow.routes.ts so every handler is live at startup.
 */
import { prisma } from "@core/database/db";
import { registerWorkflowHandler, WorkflowInstanceView } from "../workflow.registry";
import { SalesService } from "../../pos/services/sales.service";
import { SalesDocumentStatus } from "../../../generated/enums";

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
