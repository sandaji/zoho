/**
 * Petty cash — imprest funds held by a custodian.
 */
import { apiClient } from "./api-client";

type Person = { id: string; name?: string | null; email: string } | null;

export interface PettyCashEntry {
  id: string;
  entryNumber: string;
  type: "TOPUP" | "DISBURSEMENT";
  amount: number;
  balanceAfter: number;
  payee?: string | null;
  category?: string | null;
  description: string;
  receiptRef?: string | null;
  entryDate: string;
  recordedById: string;
  recordedBy?: Person;
  voidedAt?: string | null;
  voidedBy?: Person;
  voidReason?: string | null;
  createdAt: string;
}

export interface PettyCashFund {
  id: string;
  name: string;
  custodianId: string;
  custodian?: Person;
  imprestAmount: number;
  maxPerTransaction: number;
  balance: number;
  entries?: PettyCashEntry[];
}

async function call<T>(path: string, method: "GET" | "POST", body?: unknown, fallback = "Request failed") {
  const res = await apiClient.request<T>(path, method, body);
  if (!res.success) throw new Error(res.error?.message || fallback);
  return res.data as T;
}

export const pettyCashService = {
  listFunds: () => call<PettyCashFund[]>("/v1/finance/petty-cash/funds", "GET"),
  getFund: (id: string) => call<PettyCashFund>(`/v1/finance/petty-cash/funds/${id}`, "GET"),
  createFund: (data: {
    name: string;
    custodianEmail: string;
    imprestAmount: number;
    maxPerTransaction: number;
  }) => call<PettyCashFund>("/v1/finance/petty-cash/funds", "POST", data),
  topUp: (id: string, data: { amount: number; source: string; description?: string }) =>
    call<PettyCashEntry>(`/v1/finance/petty-cash/funds/${id}/topup`, "POST", data),
  disburse: (
    id: string,
    data: { amount: number; payee: string; category: string; description: string; receiptRef?: string },
  ) => call<PettyCashEntry>(`/v1/finance/petty-cash/funds/${id}/disburse`, "POST", data),
  voidEntry: (entryId: string, reason: string) =>
    call<PettyCashEntry>(`/v1/finance/petty-cash/entries/${entryId}/void`, "POST", { reason }),
};

export const PETTY_CATEGORIES = [
  "Transport",
  "Refreshments",
  "Stationery",
  "Cleaning & Sanitation",
  "Postage & Courier",
  "Minor Repairs",
  "Airtime & Data",
  "Other",
];
