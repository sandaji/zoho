"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Building2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAdminBranch } from "@/lib/AdminBranchContext";
import { fetchGlobalFinancials, GlobalFinancialsData } from "@/lib/admin-global-api";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ============================================================================
// COMPONENT
// ============================================================================

export function GlobalFinancialsWidget() {
  const { token } = useAuth();
  const { selectedBranchId, setSelectedBranchId, branches, permissions } = useAdminBranch();

  const [data, setData] = useState<GlobalFinancialsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(30);

  // Check permissions
  if (!permissions.canViewFinancials) {
    return (
      <Card className="rounded-xl border border-red-100 bg-white shadow-sm">
        <CardContent className="py-12 text-center">
          <AlertCircle className="mx-auto mb-3 h-12 w-12 text-red-400" />
          <h3 className="text-base font-semibold text-slate-800">Access Denied</h3>
          <p className="mt-1 text-sm text-slate-500">
            You don't have permission to view financial data.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Load data
  const loadData = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const financials = await fetchGlobalFinancials(token, selectedBranchId, period);
      setData(financials);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load financial data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, selectedBranchId, period]);

  // Safe data access
  const safeData = data || {
    gross_revenue: 0,
    net_global_revenue: 0,
    total_tax: 0,
    total_discount: 0,
    total_expenses: 0,
    net_profit: 0,
    total_orders: 0,
    internal_transfers: 0,
    branch_breakdown: [],
  };

  // KPI calculations
  const kpis = useMemo(
    () => [
      {
        title: "Net Global Revenue",
        value: formatCurrency(safeData.net_global_revenue),
        subtitle: `${period} days`,
        icon: DollarSign,
        color: safeData.net_global_revenue >= 0 ? "emerald" : "red",
        trend: safeData.net_global_revenue > 0 ? "up" : "down",
      },
      {
        title: "Net Profit",
        value: formatCurrency(safeData.net_profit),
        subtitle: "After expenses",
        icon: TrendingUp,
        color: safeData.net_profit >= 0 ? "emerald" : "red",
        trend: safeData.net_profit > 0 ? "up" : "down",
      },
      {
        title: "Total Orders",
        value: safeData.total_orders.toLocaleString(),
        subtitle: "Across branches",
        icon: Receipt,
        color: "blue",
      },
      {
        title: "Internal Transfers",
        value: safeData.internal_transfers.toString(),
        subtitle: "IBT movements",
        icon: Building2,
        color: "purple",
      },
    ],
    [safeData, period]
  );

  if (loading && !data) {
    return (
      <Card className="rounded-xl border border-emerald-100 bg-white shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-emerald-900">Global Financials</CardTitle>
            <div className="h-8 w-32 animate-pulse rounded bg-emerald-100" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-emerald-50" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card className="rounded-xl border border-red-100 bg-white shadow-sm">
        <CardContent className="py-12 text-center">
          <AlertCircle className="mx-auto mb-3 h-12 w-12 text-red-400" />
          <h3 className="text-base font-semibold text-slate-800">Failed to Load Data</h3>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <Button
            onClick={loadData}
            variant="outline"
            className="mt-4 border-emerald-200 text-emerald-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border border-emerald-100 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-emerald-900">Global Financials</CardTitle>
          <div className="flex items-center gap-3">
            {/* Period selector */}
            <Select value={period.toString()} onValueChange={(v) => setPeriod(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>

            {/* Branch selector */}
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.code} - {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={loadData}
              variant="outline"
              size="sm"
              disabled={loading}
              className="gap-2 border-emerald-200 text-emerald-700"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* KPI Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.title}
                className="relative overflow-hidden rounded-lg border border-emerald-100 bg-emerald-50/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                      {kpi.title}
                    </p>
                    <p className="text-2xl font-bold text-emerald-900 mt-1">{kpi.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {kpi.trend &&
                        (kpi.trend === "up" ? (
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        ))}
                      <span className="text-xs text-emerald-500">{kpi.subtitle}</span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      kpi.color === "emerald"
                        ? "bg-emerald-100"
                        : kpi.color === "red"
                          ? "bg-red-100"
                          : kpi.color === "blue"
                            ? "bg-blue-100"
                            : "bg-purple-100"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        kpi.color === "emerald"
                          ? "text-emerald-600"
                          : kpi.color === "red"
                            ? "text-red-600"
                            : kpi.color === "blue"
                              ? "text-blue-600"
                              : "text-purple-600"
                      )}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Branch Breakdown */}
        {safeData.branch_breakdown.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-emerald-900 mb-3">Branch Performance</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {safeData.branch_breakdown.map((branch) => (
                <div
                  key={branch.branch.id}
                  className="rounded-lg border border-emerald-100 bg-white p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">{branch.branch.code}</p>
                      <p className="text-xs text-emerald-600">{branch.branch.name}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {branch.orderCount} orders
                    </Badge>
                  </div>
                  <p className="text-lg font-bold text-emerald-900">
                    {formatCurrency(branch.revenue)}
                  </p>
                  <p className="text-xs text-emerald-500">
                    Tax: {formatCurrency(branch.tax)} • Disc: {formatCurrency(branch.discount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
