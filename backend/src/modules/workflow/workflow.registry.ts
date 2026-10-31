/**
 * Domain handlers: what actually happens to the business record once the
 * approval chain finishes. The engine decides WHO must approve; a handler
 * decides what the outcome DOES (approve the credit note, apply the stock
 * adjustment, post the payroll...). Handlers are registered by entity type.
 */

export interface WorkflowInstanceView {
  id: string;
  instanceNumber: string;
  definitionCode: string;
  entityType: string;
  entityId: string;
  title: string;
  amount: number | null;
  branchId: string | null;
  requestedById: string;
  payload: unknown;
}

export interface WorkflowHandler {
  /** Runs once the last stage approves. `actorId` is the person who gave the final approval. */
  onApproved(instance: WorkflowInstanceView, actorId: string): Promise<void>;
  /** Runs when any stage rejects. */
  onRejected?(instance: WorkflowInstanceView, actorId: string, reason: string): Promise<void>;
  /** Runs when the requester (or an admin) withdraws a pending request. */
  onCancelled?(instance: WorkflowInstanceView, actorId: string): Promise<void>;
}

const handlers = new Map<string, WorkflowHandler>();

export const registerWorkflowHandler = (entityType: string, handler: WorkflowHandler) => {
  handlers.set(entityType, handler);
};

export const getWorkflowHandler = (entityType: string) => handlers.get(entityType);
