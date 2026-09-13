"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchReconciliationStatus } from "@/app/dashboard/finance/lib/api";
import { formatCurrency } from "@/app/dashboard/finance/lib/api";
import type { ReconciliationStatusResponse } from "@/app/dashboard/finance/types";

const statusConfig = {
  reconciled:  { icon: CheckCircle,  colorClass: "text-success",     bgClass: "bg-success/10 border-success/20" },
  pending:     { icon: Clock,        colorClass: "text-warning",      bgClass: "bg-warning-muted border-warning-border" },
  in_progress: { icon: Clock,        colorClass: "text-info",         bgClass: "bg-info-muted border-info-border" },
  discrepancy: { icon: AlertTriangle, colorClass: "text-destructive", bgClass: "bg-destructive/10 border-destructive/30" },
};

export function ReconciliationStatus() {
  const [data, setData] = useState<ReconciliationStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReconciliationStatus = async () => {
      try {
        setError(null);
        const result = await fetchReconciliationStatus();
        if (result.success && result.data) {
          setData(result.data);
        } else {
          setError("Failed to load reconciliation status");
        }
      } catch (err) {
        console.error("Error loading reconciliation status:", err);
        setError("Failed to load reconciliation status");
      } finally {
        setLoading(false);
      }
    };

    loadReconciliationStatus();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error || "Failed to load data"}
          </div>
        </CardContent>
      </Card>
    );
  }

  const reconciliationRate =
    Math.round(((data.reconciledCount + data.pendingCount) / data.totalAccounts) * 100) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reconciliation Status</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Reconciliation Rate</p>
            <p className="mt-1 text-2xl font-bold text-success">{reconciliationRate}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {formatCurrency(data.totalAmount)}
            </p>
          </div>
        </div>

        {/* Status Overview — uses semantic token classes */}
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { key: "reconciled",  count: data.reconciledCount,   label: "Reconciled"  },
              { key: "pending",     count: data.pendingCount,       label: "Pending"     },
              { key: "in_progress", count: 0,                       label: "In Progress" },
              { key: "discrepancy", count: data.discrepancyCount,   label: "Discrepancy" },
            ] as const
          ).map(({ key, count, label }) => {
            const cfg = statusConfig[key];
            const Icon = cfg.icon;
            return (
              <div key={key} className={cn("rounded-lg border p-3", cfg.bgClass)}>
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", cfg.colorClass)} />
                  <div className="flex-1">
                    <p className={cn("text-xs", cfg.colorClass)}>{label}</p>
                    <p className="font-semibold text-foreground">{count}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Accounts List */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Account Details</p>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {data.items.map((item, idx) => {
              const cfg = statusConfig[item.status as keyof typeof statusConfig] ?? statusConfig.pending;
              const StatusIcon = cfg.icon;

              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3",
                    cfg.bgClass
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={cn("h-4 w-4", cfg.colorClass)} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.accountName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.transactionCount} transactions
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(item.amount)}
                    </p>
                    {item.variance !== undefined && item.variance !== 0 && (
                      <p className={cn("text-xs", item.variance > 0 ? "text-destructive" : "text-success")}>
                        Variance: {formatCurrency(Math.abs(item.variance))}
                      </p>
                    )}
                    {item.daysOverdue > 0 && (
                      <p className="text-xs text-warning">{item.daysOverdue} days overdue</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
