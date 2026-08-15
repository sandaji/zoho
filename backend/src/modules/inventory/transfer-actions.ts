/**
 * Transfer workflow action resolver.
 *
 * Per the agreed architecture: TransferStatus represents business state
 * only. Which UI actions are available is a function of (current status,
 * user's permissions) — computed here, server-side, and returned to the
 * frontend as `availableActions`. The frontend renders whatever comes
 * back; it never re-derives "can this user dispatch?" from status alone.
 *
 * Extending the workflow (Picking, Verification, etc. — Phase 2) means
 * adding entries to TRANSFER_ACTIONS below, not scattering new
 * `status === X` checks across frontend components.
 *
 * Scope note: only the four actions actually implemented today
 * (approve/dispatch/receive, plus the initial request which happens via
 * POST /inventory/transfers/request rather than a status transition) are
 * listed. Cancel/reject/dispute are intentionally left out until their
 * backing endpoints exist (Phase 2/4) — better to show no button than a
 * button wired to nothing.
 */

import type { TransferStatus } from "../../generated";

export interface TransferActionDef {
  action: string;
  label: string;
  permission: string;
}

/**
 * Minimal shape needed to resolve actions — deliberately not the full
 * transfer object, so this stays easy to call from anywhere (controller,
 * tests) without over-coupling to Prisma's return shape.
 */
export interface TransferActionContext {
  status: TransferStatus;
  pickingCompletedAt?: Date | string | null;
}

const TRANSFER_ACTIONS: Partial<Record<TransferStatus, TransferActionDef[]>> = {
  PENDING_APPROVAL: [
    {
      action: "approve",
      label: "Approve",
      permission: "inventory.transfer.approve",
    },
  ],
  APPROVED: [
    {
      action: "start_picking",
      label: "Start Picking",
      permission: "inventory.transfer.pick",
    },
  ],
  // PICKING is handled specially below — which action is available depends
  // on whether picking has been completed yet (pickingCompletedAt), not
  // just on status. See getAvailableTransferActions.
  VERIFIED: [
    {
      action: "dispatch",
      label: "Dispatch",
      permission: "inventory.transfer.dispatch",
    },
  ],
  DISPATCHED: [
    {
      action: "receive",
      label: "Receive",
      permission: "inventory.transfer.receive",
    },
  ],
  PARTIALLY_RECEIVED: [
    {
      action: "receive",
      label: "Receive Remainder",
      permission: "inventory.transfer.receive",
    },
    {
      action: "raise_issue",
      label: "Raise Issue / Dispute",
      permission: "inventory.transfer.issue",
    },
  ],
  RECEIVED: [
    {
      action: "raise_issue",
      label: "Raise Issue / Dispute",
      permission: "inventory.transfer.issue",
    },
  ],
  DISCREPANCY: [
    {
      action: "raise_issue",
      label: "Raise Issue / Dispute",
      permission: "inventory.transfer.issue",
    },
    {
      action: "resolve_issue",
      label: "Resolve Issue",
      permission: "inventory.transfer.resolve_issue",
    },
  ],
};

const PICKING_ACTIONS_BEFORE_COMPLETE: TransferActionDef[] = [
  {
    action: "complete_picking",
    label: "Complete Picking",
    permission: "inventory.transfer.pick",
  },
];

const PICKING_ACTIONS_AFTER_COMPLETE: TransferActionDef[] = [
  {
    action: "verify",
    label: "Verify Picked Items",
    permission: "inventory.transfer.verify",
  },
];

/**
 * Resolve which actions a user (identified by their permission codes) can
 * take on a transfer right now. PICKING is the one status whose available
 * actions depend on more than the status alone (whether picking has been
 * completed yet) — handled as a sub-state flag rather than a 9th status,
 * per the "statuses are business state, not UI state" principle.
 */
export function getAvailableTransferActions(
  transfer: TransferActionContext,
  userPermissions: string[],
): Array<{ action: string; label: string }> {
  let candidates: TransferActionDef[];

  if (transfer.status === "PICKING") {
    candidates = transfer.pickingCompletedAt
      ? PICKING_ACTIONS_AFTER_COMPLETE
      : PICKING_ACTIONS_BEFORE_COMPLETE;
  } else {
    candidates = TRANSFER_ACTIONS[transfer.status] || [];
  }

  return candidates
    .filter((c) => userPermissions.includes(c.permission))
    .map(({ action, label }) => ({ action, label }));
}
