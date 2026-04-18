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
          setAccounts(response.data.accounts);
          setTotalBalance(response.data.totalBalance);
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
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Bank Accounts</CardTitle>
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
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">{error}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Bank Accounts</CardTitle>
          <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded text-sm text-green-700 font-medium">
            <TrendingUp className="h-4 w-4" />
            {formatCurrency(totalBalance)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {accounts.length === 0 ? (
          <div className="py-8 text-center">
            <Landmark className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No bank accounts configured</p>
          </div>
        ) : (
          <>
            {accounts.map((account) => {
              const hasUnreconciled = account.unreconciliedTransactions > 0;

              return (
                <div
                  key={account.id}
                  className={cn(
                    "rounded-lg border p-3 transition-colors",
                    hasUnreconciled ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Landmark className="h-4 w-4 text-gray-600" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {account.accountName}
                          </p>
                          <p className="text-xs text-gray-500">{account.accountNumber}</p>
                        </div>
                      </div>
                      {hasUnreconciled && (
                        <div className="mt-2 text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded inline-block">
                          {account.unreconciliedTransactions} transactions pending reconciliation
                        </div>
                      )}
                      {account.lastReconciliationDate && (
                        <p className="text-xs text-gray-500 mt-2">
                          Last reconciled:{" "}
                          {new Date(account.lastReconciliationDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(account.balance)}
                      </p>
                      <p className="text-xs text-gray-500">{account.currency || "USD"}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
};
