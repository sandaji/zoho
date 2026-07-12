import { jest, describe, beforeEach, it, expect } from "@jest/globals";

const mockBudgetFindMany = jest.fn();
const mockBudgetCreate = jest.fn();
const mockBudgetUpdate = jest.fn();
const mockBudgetDelete = jest.fn();
const mockBudgetFindUnique = jest.fn();
const mockAccountFindUnique = jest.fn();

jest.mock("../../src/lib/db", () => ({
  prisma: {
    budget: {
      findMany: mockBudgetFindMany,
      create: mockBudgetCreate,
      update: mockBudgetUpdate,
      delete: mockBudgetDelete,
      findUnique: mockBudgetFindUnique,
    },
    chartOfAccount: {
      findUnique: mockAccountFindUnique,
    },
  },
}));

jest.mock("../../src/lib/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

import { BudgetService } from "../../src/modules/finance/services/budget.service";

describe("BudgetService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a budget and returns the computed variance", async () => {
    mockAccountFindUnique.mockResolvedValue({
      id: "acct-1",
      account_code: "6001",
      account_name: "Rent",
    });

    mockBudgetCreate.mockResolvedValue({
      id: "budget-1",
      budget_name: "Rent Budget",
      fiscal_year: 2026,
      account_id: "acct-1",
      period_type: "monthly",
      period_start: new Date("2026-01-01"),
      period_end: new Date("2026-01-31"),
      budgeted_amount: 100000,
      actual_amount: 90000,
      variance: -10000,
      variance_percent: -10,
      status: "active",
      created_by: "user-1",
      approved_by: null,
      approved_date: null,
      notes: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      account: {
        id: "acct-1",
        account_code: "6001",
        account_name: "Rent",
      },
    });

    const service = new BudgetService();

    const result = await service.createBudget({
      budgetName: "Rent Budget",
      fiscalYear: 2026,
      accountId: "acct-1",
      budgetedAmount: 100000,
      actualAmount: 90000,
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      periodType: "monthly",
      createdBy: "user-1",
      notes: "Operations",
      status: "active",
    });

    expect(mockBudgetCreate).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.data.budget.variance).toBe(-10000);
    expect(result.data.budget.variancePercent).toBe(-10);
  });
});
