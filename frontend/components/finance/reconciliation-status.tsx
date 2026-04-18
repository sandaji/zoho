"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { fetchReconciliationStatus } from "@/app/dashboard/finance/lib/api";
import { formatCurrency } from "@/app/dashboard/finance/lib/api";
import type { ReconciliationStatusResponse } from "@/app/dashboard/finance/types";

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
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Reconciliation Status</CardTitle>
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
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Reconciliation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error || "Failed to load data"}
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    reconciled: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
    pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    in_progress: { icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
    discrepancy: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  };

  const reconciliationRate =
    Math.round(((data.reconciledCount + data.pendingCount) / data.totalAccounts) * 100) || 0;

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Reconciliation Status</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Reconciliation Rate</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{reconciliationRate}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatCurrency(data.totalAmount)}
            </p>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-green-50 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="flex-1">
                <p className="text-xs text-green-700">Reconciled</p>
                <p className="font-semibold text-green-900">{data.reconciledCount}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <div className="flex-1">
                <p className="text-xs text-amber-700">Pending</p>
                <p className="font-semibold text-amber-900">{data.pendingCount}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-blue-50 p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <div className="flex-1">
                <p className="text-xs text-blue-700">In Progress</p>
                <p className="font-semibold text-blue-900">0</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-red-50 p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="flex-1">
                <p className="text-xs text-red-700">Discrepancy</p>
                <p className="font-semibold text-red-900">{data.discrepancyCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Accounts List */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-900">Account Details</p>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {data.items.map((item, idx) => {
              const config = statusConfig[item.status as keyof typeof statusConfig];
              const StatusIcon = config.icon;

              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between rounded-lg border ${config.bg} p-3`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`h-4 w-4 ${config.color}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.accountName}</p>
                        <p className="text-xs text-gray-600">
                          {item.transactionCount} transactions
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(item.amount)}
                    </p>
                    {item.variance !== undefined && item.variance !== 0 && (
                      <p
                        className={`text-xs ${item.variance > 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        Variance: {formatCurrency(Math.abs(item.variance))}
                      </p>
                    )}
                    {item.daysOverdue > 0 && (
                      <p className="text-xs text-amber-600">{item.daysOverdue} days overdue</p>
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
