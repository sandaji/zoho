import { describe, expect, it } from "@jest/globals";
import { formatCurrency as formatSharedCurrency } from "@/lib/utils";
import { formatCurrency as formatMoneyCurrency } from "@/lib/utils/money";

describe("KES currency formatting", () => {
  it("formats shared utility amounts as Kenyan shillings with two decimals", () => {
    const formatted = formatSharedCurrency(1234.5);

    expect(formatted).toContain("Ksh");
    expect(formatted).toContain("1,234.50");
    expect(formatted).not.toContain("$");
  });

  it("defaults the money utility to Kenyan shillings", () => {
    const formatted = formatMoneyCurrency(1234.5);

    expect(formatted).toContain("Ksh");
    expect(formatted).toContain("1,234.50");
    expect(formatted).not.toContain("$");
  });
});
