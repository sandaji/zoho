/**
 * Starting definitions. The engine creates one the first time it is needed;
 * after that the stages live in the database and are edited from the designer
 * (changes apply to NEW requests only; requests already in flight keep the
 * stages they started with).
 *
 * Stages sharing the same `order` run in parallel and must ALL approve.
 * A stage with `minAmount` is skipped for smaller requests.
 */

export interface DefaultStage {
  order: number;
  name: string;
  approverPermission: string;
  branchScoped?: boolean;
  minAmount?: number;
  escalateAfterHours?: number;
  escalateToPermission?: string;
}

export interface DefaultDefinition {
  code: string;
  name: string;
  description: string;
  entityType: string;
  stages: DefaultStage[];
}

export const DEFAULT_DEFINITIONS: DefaultDefinition[] = [
  {
    code: "CUSTOMER_REFUND",
    name: "Customer refund",
    description: "Cashier raises a credit note; the branch manager reviews it, then finance approves.",
    entityType: "CREDIT_NOTE",
    stages: [
      {
        order: 1,
        name: "Branch manager review",
        approverPermission: "workflow.refund.branch_approve",
        branchScoped: true,
        escalateAfterHours: 24,
        escalateToPermission: "workflow.refund.finance_approve",
      },
      {
        order: 2,
        name: "Finance manager approval",
        approverPermission: "workflow.refund.finance_approve",
        escalateAfterHours: 48,
      },
    ],
  },
];
