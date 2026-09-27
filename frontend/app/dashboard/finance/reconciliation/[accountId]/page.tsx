"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_ENDPOINTS, getAuthHeaders, getApiUrl } from "@/lib/api-config";
import { Loader2, ArrowLeftRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface BankTransaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type: "income" | "expense" | "transfer" | "adjustment";
}

export default function ReconciliationMatchingPage() {
  const params = useParams();
  const accountId = params.accountId as string;

  const [loading, setLoading] = useState(true);
  const [bankLines, setBankLines] = useState<BankTransaction[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<BankTransaction[]>([]);

  const [selectedBankLine, setSelectedBankLine] = useState<string | null>(null);
  const [selectedLedgerEntry, setSelectedLedgerEntry] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    if (accountId) fetchData();
  }, [accountId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(getApiUrl(API_ENDPOINTS.BANK_RECONCILIATION_DATA(accountId)), {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      setBankLines(json.data.bankLines);
      setLedgerEntries(json.data.ledgerEntries);
    } catch (error) {
      toast.error("Error loading reconciliation data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMatch = async () => {
    if (!selectedBankLine || !selectedLedgerEntry) return;

    try {
      setReconciling(true);
      const res = await fetch(getApiUrl(API_ENDPOINTS.BANK_RECONCILE), {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bankTransactionId: selectedBankLine,
          systemTransactionId: selectedLedgerEntry,
        }),
      });

      if (!res.ok) throw new Error("Match failed (Amount Mismatch?)");

      toast.success("Transaction Matched!");

      // Remove from local state
      setBankLines((prev) => prev.filter((l) => l.id !== selectedBankLine));
      setLedgerEntries((prev) => prev.filter((e) => e.id !== selectedLedgerEntry));

      setSelectedBankLine(null);
      setSelectedLedgerEntry(null);
    } catch (error) {
      toast.error("Match Failed. Ensure amounts match exactly.");
    } finally {
      setReconciling(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount);
  };

  // Signed amount: expense transactions are shown/compared as negative.
  const getSignedAmount = (txn: BankTransaction) =>
    txn.transaction_type === "expense" ? -txn.amount : txn.amount;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-4 p-4 sm:p-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reconcile Transactions</h1>
          <p className="text-muted-foreground">Match bank statement lines with system records</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="mr-4 text-sm font-medium text-muted-foreground">
            Selected: {selectedBankLine ? 1 : 0} Bank | {selectedLedgerEntry ? 1 : 0} Ledger
          </div>
          <Button
            onClick={handleMatch}
            disabled={!selectedBankLine || !selectedLedgerEntry || reconciling}
          >
            {reconciling ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowLeftRight className="mr-2 h-4 w-4" />
            )}
            Match
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          {/* Bank Statement Side */}
          <Card className="flex min-h-64 flex-col overflow-hidden border-info-border/60">
            <CardHeader className="border-b border-info-border/40 bg-info-muted/50 py-3">
              <CardTitle className="text-lg text-foreground">Bank Statement Lines</CardTitle>
            </CardHeader>
            <div className="flex-1 overflow-y-auto p-0">
              {bankLines.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  All caught up! No unreconciled lines.
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {bankLines.map((line) => (
                    <div
                      key={line.id}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-3 border-l-4 border-transparent p-3 transition-colors hover:bg-info-muted/60",
                        selectedBankLine === line.id && "border-info-border bg-info-muted"
                      )}
                      onClick={() =>
                        setSelectedBankLine(line.id === selectedBankLine ? null : line.id)
                      }
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {format(new Date(line.transaction_date), "MMM d, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">{line.description}</div>
                      </div>
                      <div className="font-bold">{formatCurrency(getSignedAmount(line))}</div>
                      {selectedBankLine === line.id && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-info" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* System Ledger Side */}
          <Card className="flex min-h-64 flex-col overflow-hidden border-success-border/60">
            <CardHeader className="border-b border-success-border/40 bg-success-muted/50 py-3">
              <CardTitle className="text-lg text-foreground">System Records (Ledger)</CardTitle>
            </CardHeader>
            <div className="flex-1 overflow-y-auto p-0">
              {ledgerEntries.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No unreconciled system entries found.
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {ledgerEntries.map((entry) => {
                    const amount = getSignedAmount(entry);
                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          "flex cursor-pointer items-center justify-between gap-3 border-l-4 border-transparent p-3 transition-colors hover:bg-success-muted/60",
                          selectedLedgerEntry === entry.id &&
                            "border-success-border bg-success-muted"
                        )}
                        onClick={() =>
                          setSelectedLedgerEntry(entry.id === selectedLedgerEntry ? null : entry.id)
                        }
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {format(new Date(entry.transaction_date), "MMM d, yyyy")}
                          </div>
                          <div className="text-xs text-muted-foreground">{entry.description}</div>
                        </div>
                        <div className="font-bold">{formatCurrency(amount)}</div>
                        {selectedLedgerEntry === entry.id && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
