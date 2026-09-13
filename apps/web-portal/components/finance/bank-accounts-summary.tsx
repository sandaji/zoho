"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Landmark, TrendingUp } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { fetchBankAccounts } from "@/app/dashboard/finance/lib/api";
import type { BankAccount } from "@/app/dashboard/finance/types";

export const BankAccountsSummary = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const response = await fetchBankAccounts();
        if (response.success && response.data) {
          const accountsArray = Array.isArray(response.data)
            ? response.data
            : response.data.accounts || [];
          setAccounts(accountsArray);
          setTotalBalance(
            response.data.totalBalance ||
              accountsArray.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0)
          );
        } else {
          setError(response.error?.message || "Failed to load bank accounts");
        }
      } catch (err) {
        console.error("Error loading bank accounts:", err);
        setError("An error occurred");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/10">
        <CardContent className="pt-6 flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{error}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Bank Accounts</CardTitle>
          <div className="flex items-center gap-1 bg-success/10 border border-success/20 px-2 py-1 rounded text-xs text-success font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            {formatCurrency(totalBalance)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {accounts.length === 0 ? (
          <div className="py-8 text-center">
            <Landmark className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No bank accounts configured</p>
          </div>
        ) : (
          accounts.map((account) => {
            const hasUnreconciled = account.unreconciliedTransactions > 0;

            return (
              <div
                key={account.id}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  hasUnreconciled
                    ? "bg-warning-muted border-warning-border"
                    : "bg-muted border-border"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {account.accountName}
                        </p>
                        <p className="text-xs text-muted-foreground">{account.accountNumber}</p>
                      </div>
                    </div>
                    {hasUnreconciled && (
                      <div className="mt-2 text-xs text-warning bg-warning/10 px-2 py-1 rounded inline-block">
                        {account.unreconciliedTransactions} transactions pending reconciliation
                      </div>
                    )}
                    {account.lastReconciliationDate && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last reconciled:{" "}
                        {new Date(account.lastReconciliationDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(account.balance)}
                    </p>
                    <p className="text-xs text-muted-foreground">{account.currency || "USD"}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
