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
  maxAmount?: number;
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
  {
    code: "PRICE_OVERRIDE",
    name: "Price override",
    description:
      "Sales rep asks to sell below the catalogue price; the sales manager approves, and the branch manager also signs off when the total discount reaches KSh 10,000. Approval is a one-time permit for that product, price and quantity.",
    entityType: "PRICE_OVERRIDE",
    stages: [
      {
        order: 1,
        name: "Sales manager approval",
        approverPermission: "workflow.price_override.sales_approve",
        branchScoped: true,
        escalateAfterHours: 4,
        escalateToPermission: "workflow.price_override.branch_approve",
      },
      {
        order: 2,
        name: "Branch manager approval",
        approverPermission: "workflow.price_override.branch_approve",
        branchScoped: true,
        minAmount: 10000,
        escalateAfterHours: 8,
      },
    ],
  },
  {
    code: "EXPENSE_REPORT",
    name: "Expense report",
    description:
      "One approver, chosen by the report total: under KSh 10,000 standard, up to KSh 100,000 high-value, above that executive. The employee cannot approve their own report.",
    entityType: "EXPENSE_REPORT",
    stages: [
      { order: 1, name: "Standard approval", approverPermission: "finance.expense.approve_standard", branchScoped: true, maxAmount: 10000, escalateAfterHours: 48, escalateToPermission: "finance.expense.approve_high_value" },
      { order: 1, name: "High-value approval", approverPermission: "finance.expense.approve_high_value", branchScoped: true, minAmount: 10000, maxAmount: 100000, escalateAfterHours: 48, escalateToPermission: "finance.expense.approve_executive" },
      { order: 1, name: "Executive approval", approverPermission: "finance.expense.approve_executive", minAmount: 100000, escalateAfterHours: 72 },
    ],
  },
  {
    code: "STOCK_TRANSFER",
    name: "Stock transfer",
    description: "A transfer request must be approved before stock is reserved and picking can start.",
    entityType: "STOCK_TRANSFER",
    stages: [
      { order: 1, name: "Transfer approval", approverPermission: "inventory.transfer.approve", escalateAfterHours: 24 },
    ],
  },
  {
    code: "PAYROLL_APPROVAL",
    name: "Payroll approval",
    description:
      "HR submits a month's payroll; the HR manager reviews it, finance verifies the funding, and the MD gives final approval. Records only become approved once all three have signed.",
    entityType: "PAYROLL_RUN",
    stages: [
      { order: 1, name: "HR manager review", approverPermission: "workflow.payroll.hr_approve", escalateAfterHours: 24 },
      { order: 2, name: "Finance manager verification", approverPermission: "workflow.payroll.finance_approve", escalateAfterHours: 24 },
      { order: 3, name: "MD approval", approverPermission: "workflow.payroll.md_approve", escalateAfterHours: 48 },
    ],
  },
  {
    code: "STOCK_COUNT",
    name: "Stock count posting",
    description:
      "The count's variances are posted as stock adjustments only after approval. The inventory manager approves every count; variances over KSh 100,000 (gross) also need finance sign-off.",
    entityType: "STOCK_COUNT",
    stages: [
      { order: 1, name: "Inventory manager approval", approverPermission: "workflow.stock_adjust.inventory_approve", escalateAfterHours: 48, escalateToPermission: "workflow.stock_count.approve_high" },
      { order: 2, name: "Finance review (large variance)", approverPermission: "workflow.stock_count.approve_high", minAmount: 100000, escalateAfterHours: 72 },
    ],
  },
  {
    code: "STOCK_ADJUSTMENT",
    name: "Stock adjustment",
    description:
      "Store keeper requests a write-off or count correction; the warehouse manager reviews it, then the inventory manager approves. Stock only changes once approved.",
    entityType: "STOCK_ADJUSTMENT",
    stages: [
      {
        order: 1,
        name: "Warehouse manager review",
        approverPermission: "workflow.stock_adjust.warehouse_approve",
        branchScoped: true,
        escalateAfterHours: 24,
        escalateToPermission: "workflow.stock_adjust.inventory_approve",
      },
      {
        order: 2,
        name: "Inventory manager approval",
        approverPermission: "workflow.stock_adjust.inventory_approve",
        escalateAfterHours: 48,
      },
    ],
  },
];
