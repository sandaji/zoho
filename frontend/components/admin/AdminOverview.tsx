"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailySummary } from "@/lib/admin-api";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  DollarSign,
  Receipt,
  Tag,
  Package,
  Users,
  Store,
  AlertCircle,
  RefreshCw,
  ArrowUp,
  MoreHorizontal,
  Activity,
  Crown,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { fetchDailySummary } from "@/lib/admin-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────────────
const safeNumber = (value: any, defaultValue = 0): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};
const formatNumber = (value: any) => safeNumber(value).toLocaleString();

// ── CVA: KPI card accent bar ──────────────────────────────────────────────────
const kpiAccent = cva("absolute left-0 top-0 h-full w-1 rounded-l-xl", {
  variants: {
    color: {
      emerald: "bg-emerald-500",
      yellow:  "bg-yellow-400",
      teal:    "bg-teal-500",
      rose:    "bg-rose-400",
    },
  },
  defaultVariants: { color: "emerald" },
});

// ── CVA: product status badge ────────────────────────────────────────────────
const productBadge = cva("text-[11px] font-semibold", {
  variants: {
    level: {
      hot:     "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      popular: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
      regular: "bg-slate-100 text-slate-600 hover:bg-slate-100",
    },
  },
  defaultVariants: { level: "regular" },
});

export default function AdminOverview() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDailySummary(token);
      setSummary(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [token]);

  if (loading && !summary) return <LoadingSkeleton />;

  if (error && !summary) {
    return (
      <Card className="rounded-xl border border-red-100 bg-white shadow-sm">
        <CardContent className="py-12 text-center">
          <AlertCircle className="mx-auto mb-3 h-12 w-12 text-red-400" />
          <h3 className="text-base font-semibold text-slate-800">Failed to Load Data</h3>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <Button onClick={loadData} variant="outline" className="mt-4 border-emerald-200 text-emerald-700">
            <RefreshCw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  // ── Safe data ─────────────────────────────────────────────────────────────
  const safe = {
    total_sales:    safeNumber(summary.total_sales),
    total_revenue:  safeNumber(summary.total_revenue),
    total_tax:      safeNumber(summary.total_tax),
    total_discount: safeNumber(summary.total_discount),
    top_products: (Array.isArray(summary.top_products) ? summary.top_products : []).map((p) => ({
      productId: p?.productId || "unknown",
      name:      p?.name      || "Unknown Product",
      quantity:  safeNumber(p?.quantity),
    })),
  };

  const kpis = [
    {
      title:    "Gross Revenue",
      value:    formatCurrency(safe.total_revenue),
      subtitle: "Today's total",
      icon:     DollarSign,
      color:    "emerald" as const,
    },
    {
      title:    "Transaction Count",
      value:    formatNumber(safe.total_sales),
      subtitle: "Sales orders",
      icon:     Receipt,
      color:    "yellow" as const,
    },
    {
      title:    "Tax Collected",
      value:    formatCurrency(safe.total_tax),
      subtitle: "VAT & levies",
      icon:     TrendingUp,
      color:    "teal" as const,
    },
    {
      title:    "Discounts Given",
      value:    formatCurrency(safe.total_discount),
      subtitle: "Total deductions",
      icon:     Tag,
      color:    "rose" as const,
    },
  ];

  const totalProductsSold = safe.top_products.reduce((a, p) => a + p.quantity, 0);
  const avgOrderValue     = safe.total_sales > 0
    ? formatCurrency(safe.total_revenue / safe.total_sales)
    : formatCurrency(0);

  return (
    <div className="space-y-6 pb-6">
      {/* ── Command header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400">
            <Crown className="h-5 w-5 text-emerald-900" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-emerald-900">Today's Command View</h2>
            {lastUpdated && (
              <p className="text-xs text-emerald-500">
                Last synced: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        <Button
          onClick={loadData}
          variant="outline"
          size="sm"
          disabled={loading}
          className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {/* ── Row 1: KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.title}
              className="relative overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <span className={cn(kpiAccent({ color: kpi.color }))} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-5">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  {kpi.title}
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
                  <Icon className="h-4 w-4 text-emerald-700" />
                </div>
              </CardHeader>
              <CardContent className="pl-5">
                <p className="text-2xl font-bold text-emerald-900">{kpi.value}</p>
                <div className="mt-1 flex items-center gap-1 text-xs text-emerald-500">
                  <ArrowUp className="h-3 w-3 text-emerald-400" />
                  {kpi.subtitle}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Row 2: Derived metrics + Top Products ────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Performance callouts */}
        <Card className="rounded-xl border border-emerald-100 bg-white shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-emerald-900">
              <Activity className="h-4 w-4 text-emerald-600" /> Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Avg. Order Value",   value: avgOrderValue },
              { label: "Total Products Sold", value: formatNumber(totalProductsSold) },
            ].map((m) => (
              <div
                key={m.label}
                className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2.5"
              >
                <span className="text-xs font-medium text-emerald-700">{m.label}</span>
                <span className="text-sm font-bold text-emerald-900">{m.value}</span>
              </div>
            ))}

            {/* System health indicators */}
            <div className="mt-2 space-y-2 border-t border-emerald-100 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                System Signals
              </p>
              {[
                { label: "Active Users",   icon: Users,  value: "—" },
                { label: "Active Branches", icon: Store,  value: "—" },
                { label: "Low Stock SKUs",  icon: Package, value: "—" },
              ].map(({ label, icon: Icon, value }) => (
                <div key={label} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs text-emerald-600">{label}</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-800">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top-selling products table */}
        <Card className="rounded-xl border border-emerald-100 bg-white shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm text-emerald-900">Top Selling Products</CardTitle>
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              {safe.top_products.length} products
            </Badge>
          </CardHeader>
          <CardContent>
            {safe.top_products.length === 0 ? (
              <div className="py-10 text-center">
                <Package className="mx-auto mb-2 h-10 w-10 text-emerald-200" />
                <p className="text-sm text-emerald-400">No sales data available</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-emerald-100">
                    <TableHead className="text-emerald-600">Product</TableHead>
                    <TableHead className="text-center text-emerald-600">Status</TableHead>
                    <TableHead className="text-right text-emerald-600">Units Sold</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safe.top_products.slice(0, 8).map((product, index) => {
                    const qty = product.quantity;
                    const level = qty > 20 ? "hot" : qty > 10 ? "popular" : "regular";
                    const statusLabel = qty > 20 ? "Hot" : qty > 10 ? "Popular" : "Regular";

                    return (
                      <TableRow key={product.productId} className="group border-emerald-50 hover:bg-emerald-50/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-[11px] font-bold text-emerald-700">
                              #{index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{product.name}</p>
                              <p className="text-[10px] text-slate-400">
                                ID: {product.productId.slice(0, 8)}…
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn(productBadge({ level }))}>{statusLabel}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-bold text-emerald-900">{formatNumber(qty)}</span>
                          <span className="ml-1 text-[10px] text-slate-400">units</span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>View Product</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-emerald-100" />
          <div className="space-y-1.5">
            <div className="h-4 w-36 animate-pulse rounded bg-emerald-100" />
            <div className="h-3 w-24 animate-pulse rounded bg-emerald-50" />
          </div>
        </div>
        <div className="h-8 w-24 animate-pulse rounded-lg bg-emerald-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-emerald-50" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-xl bg-emerald-50" />
        <div className="h-64 animate-pulse rounded-xl bg-emerald-50 lg:col-span-2" />
      </div>
    </div>
  );
}
