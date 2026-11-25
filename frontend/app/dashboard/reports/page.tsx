"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Building2,
  Download,
  FileText,
  Loader2,
  Package,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { authFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useHasPermission } from "@/hooks/use-permissions";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/api-config";
import { getAuthHeadersWithToken } from "@/lib/api-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type DatePreset = "month" | "last30" | "quarter" | "year" | "custom";
type GroupBy = "day" | "week" | "month";

interface ReportBranch {
  id: string;
  code: string;
  name: string;
}

interface ReportTrendPoint {
  period: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  orderCount: number;
}

interface ReportOrder {
  id: string;
  soNumber: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  cogs: number;
  revenue: number;
  profitAmount: number;
  profitMargin: number;
  dispatchedAt: string;
}

interface FinancialReport {
  filters: {
    startDate: string;
    endDate: string;
    branchId: string | null;
    groupBy: GroupBy;
  };
  inventoryValue: {
    totalValue: number;
    totalBatches: number;
    totalQuantity: number;
  };
  monthlyRevenue: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    grossProfitMargin: number;
    orderCount: number;
  };
  trend: ReportTrendPoint[];
  highMarginOrders: ReportOrder[];
  generatedAt: string;
}

const currencyFormat = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 2,
});

function formatCurrency(value: number): string {
  return currencyFormat.format(Number.isFinite(value) ? value : 0);
}

function formatCompactCurrency(value: number): string {
  return "KES " + new Intl.NumberFormat("en-KE", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatPercentage(value: number): string {
  return new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0) + "%";
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function getRangeForPreset(preset: DatePreset, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);

  if (preset === "month") {
    start.setDate(1);
  } else if (preset === "last30") {
    start.setDate(start.getDate() - 29);
  } else if (preset === "quarter") {
    start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
  } else if (preset === "year") {
    start.setMonth(0, 1);
  }

  return { startDate: formatLocalDate(start), endDate: formatLocalDate(end) };
}

function chooseGroupBy(startDate: string, endDate: string): GroupBy {
  const days = Math.floor(
    (Date.parse(endDate + "T00:00:00Z") - Date.parse(startDate + "T00:00:00Z")) /
      86_400_000
  ) + 1;
  if (days <= 45) return "day";
  if (days <= 180) return "week";
  return "month";
}

function csvCell(value: string | number): string {
  return '"' + String(value).replace(/"/g, '""') + '"';
}

function downloadReportCsv(report: FinancialReport) {
  const rows: Array<Array<string | number>> = [
    ["Report", "Period", "Revenue (KES)", "COGS (KES)", "Gross Profit (KES)", "Orders"],
    [
      "Summary",
      report.filters.startDate + " to " + report.filters.endDate,
      report.monthlyRevenue.revenue,
      report.monthlyRevenue.cogs,
      report.monthlyRevenue.grossProfit,
      report.monthlyRevenue.orderCount,
    ],
    [],
    ["Trend", "Revenue (KES)", "COGS (KES)", "Gross Profit (KES)", "Orders"],
    ...report.trend.map((point) => [
      point.period,
      point.revenue,
      point.cogs,
      point.grossProfit,
      point.orderCount,
    ]),
    [],
    ["Top orders by margin", "Customer", "Revenue (KES)", "COGS (KES)", "Profit (KES)", "Margin"],
    ...report.highMarginOrders.map((order) => [
      order.soNumber,
      order.customerName,
      order.revenue,
      order.cogs,
      order.profitAmount,
      order.profitMargin,
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    "swiftpos-reports-" + report.filters.startDate + "-to-" + report.filters.endDate + ".csv";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ReportsPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const { hasAnyPermission } = useHasPermission();
  const canViewReports = hasAnyPermission([
    "finance.reports.view",
    "finance.report.aging",
    "admin.user.manage",
  ]);
  const canSelectBranch = hasAnyPermission(["admin.branch.manage"]) && !user?.branchId;

  const initialRange = getRangeForPreset("month");
  const [preset, setPreset] = useState<DatePreset>("month");
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [branchId, setBranchId] = useState("all");
  const [branches, setBranches] = useState<ReportBranch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!token || !canSelectBranch) {
      setBranches([]);
      setBranchId("all");
      return;
    }

    const controller = new AbortController();
    setBranchesLoading(true);

    authFetch(API_BASE_URL + API_ENDPOINTS.BRANCHES, {
      headers: getAuthHeadersWithToken(token),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load branches");
        const payload = await response.json();
        const rows = payload?.data?.branches ?? payload?.data ?? [];
        if (Array.isArray(rows)) {
          setBranches(rows.map((branch: ReportBranch) => ({
            id: branch.id,
            code: branch.code,
            name: branch.name,
          })));
        }
      })
      .catch((loadError) => {
        if (loadError instanceof Error && loadError.name !== "AbortError") {
          console.warn("Could not load report branch options:", loadError);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setBranchesLoading(false);
      });

    return () => controller.abort();
  }, [canSelectBranch, token]);

  const groupBy = chooseGroupBy(startDate, endDate);

  useEffect(() => {
    if (authLoading) return;
    if (!token || !canViewReports) {
      setLoading(false);
      return;
    }

    if (!startDate || !endDate) {
      setError("Choose both a start date and an end date.");
      setLoading(false);
      setReport(null);
      return;
    }

    if (startDate > endDate) {
      setError("The end date must be on or after the start date.");
      setLoading(false);
      setReport(null);
      return;
    }

    const selectedDays = Math.floor(
      (Date.parse(endDate + "T00:00:00Z") - Date.parse(startDate + "T00:00:00Z")) /
        86_400_000
    ) + 1;
    if (selectedDays > 366) {
      setError("Choose a date range of 366 days or fewer.");
      setLoading(false);
      setReport(null);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      startDate,
      endDate,
      groupBy,
    });
    if (branchId !== "all") params.set("branchId", branchId);

    setLoading(true);
    setError(null);
    setReport(null);

    authFetch(API_BASE_URL + API_ENDPOINTS.REPORT_FINANCIALS + "?" + params.toString(), {
      headers: getAuthHeadersWithToken(token),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            payload?.error?.message ??
              payload?.message ??
              "Could not load reports for these filters."
          );
        }
        if (!payload?.success || !payload?.data) {
          throw new Error("The report response was incomplete.");
        }
        setReport(payload.data as FinancialReport);
      })
      .catch((loadError) => {
        if (loadError instanceof Error && loadError.name !== "AbortError") {
          setError(loadError.message);
          setReport(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [
    authLoading,
    branchId,
    canViewReports,
    endDate,
    groupBy,
    refreshKey,
    startDate,
    token,
  ]);

  function applyPreset(nextPreset: DatePreset) {
    setPreset(nextPreset);
    if (nextPreset === "custom") return;
    const range = getRangeForPreset(nextPreset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }

  if (authLoading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!canViewReports) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Reports access required</CardTitle>
            <CardDescription>
              Your account does not have permission to view financial reports.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const summary = report?.monthlyRevenue;
  const selectedBranchName =
    branches.find((branch) => branch.id === branchId)?.name ?? "All branches";

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Reports</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Financial overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review dispatched sales, cost of goods, profit, and current stock value.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            onClick={() => report && downloadReportCsv(report)}
            disabled={!report || loading}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="w-full sm:w-44">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Period
            </label>
            <Select value={preset} onValueChange={(value) => applyPreset(value as DatePreset)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This month</SelectItem>
                <SelectItem value="last30">Last 30 days</SelectItem>
                <SelectItem value="quarter">This quarter</SelectItem>
                <SelectItem value="year">Year to date</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-44">
            <label htmlFor="report-start-date" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Start date
            </label>
            <Input
              id="report-start-date"
              type="date"
              value={startDate}
              max={endDate}
              onChange={(event) => {
                setPreset("custom");
                setStartDate(event.target.value);
              }}
            />
          </div>
          <div className="w-full sm:w-44">
            <label htmlFor="report-end-date" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              End date
            </label>
            <Input
              id="report-end-date"
              type="date"
              value={endDate}
              max={formatLocalDate(new Date())}
              onChange={(event) => {
                setPreset("custom");
                setEndDate(event.target.value);
              }}
            />
          </div>
          {canSelectBranch && (
            <div className="w-full sm:w-56">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Branch
              </label>
              <Select value={branchId} onValueChange={setBranchId} disabled={branchesLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={branchesLoading ? "Loading branches…" : "All branches"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.code} · {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2 pb-2 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span>
              {canSelectBranch ? selectedBranchName : "Branch visibility follows your access"}
            </span>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {loading && !report ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Revenue"
              value={formatCurrency(summary?.revenue ?? 0)}
              detail={report.filters.startDate + " – " + report.filters.endDate}
            />
            <MetricCard
              label="Cost of goods"
              value={formatCurrency(summary?.cogs ?? 0)}
              detail="Based on dispatched stock"
            />
            <MetricCard
              label="Gross profit"
              value={formatCurrency(summary?.grossProfit ?? 0)}
              detail={(summary?.orderCount ?? 0) + " dispatched orders"}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <MetricCard
              label="Gross margin"
              value={formatPercentage(summary?.grossProfitMargin ?? 0)}
              detail="Gross profit ÷ revenue"
            />
            <MetricCard
              label="Current inventory"
              value={formatCurrency(report.inventoryValue.totalValue)}
              detail={
                report.inventoryValue.totalQuantity.toLocaleString("en-KE") +
                " units · " +
                report.inventoryValue.totalBatches.toLocaleString("en-KE") +
                " batches"
              }
              icon={<Package className="h-4 w-4" />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue, cost, and profit trend</CardTitle>
              <CardDescription>
                Grouped by {report.filters.groupBy} for the selected date range.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.trend.every((point) => point.revenue === 0 && point.cogs === 0) ? (
                <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                  No dispatched sales were found for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={report.trend} margin={{ top: 8, right: 12, bottom: 4, left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="period"
                      tickFormatter={(value: string) =>
                        new Date(value + "T00:00:00Z").toLocaleDateString("en-KE", {
                          month: "short",
                          day: report.filters.groupBy === "month" ? undefined : "numeric",
                          timeZone: "UTC",
                        })
                      }
                      minTickGap={24}
                    />
                    <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} />
                    <Tooltip
                      labelFormatter={(label) =>
                        new Date(String(label) + "T00:00:00Z").toLocaleDateString("en-KE", {
                          year: "numeric",
                          month: "short",
                          day: report.filters.groupBy === "month" ? undefined : "numeric",
                          timeZone: "UTC",
                        })
                      }
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#1060D0" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cogs" name="Cost of goods" fill="#D09020" radius={[4, 4, 0, 0]} />
                    <Line
                      dataKey="grossProfit"
                      name="Gross profit"
                      type="monotone"
                      stroke="#168050"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top orders by gross margin</CardTitle>
              <CardDescription>
                Highest-margin orders dispatched during the selected period.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.highMarginOrders.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No dispatched orders were found for this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.highMarginOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.soNumber}</TableCell>
                          <TableCell>{order.customerName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(order.revenue)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(order.cogs)}</TableCell>
                          <TableCell className="text-right font-medium text-emerald-700 dark:text-emerald-300">
                            {formatCurrency(order.profitAmount)}
                          </TableCell>
                          <TableCell className="text-right">{formatPercentage(order.profitMargin)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {hasAnyPermission(["finance.gl.view"]) && (
            <section aria-labelledby="detailed-reports-title">
              <div className="mb-3">
                <h2 id="detailed-reports-title" className="text-lg font-semibold">
                  Detailed financial reports
                </h2>
                <p className="text-sm text-muted-foreground">
                  Open a statement for a more detailed breakdown.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <ReportLink href="/dashboard/finance/reports/pnl" label="Profit and loss" />
                <ReportLink href="/dashboard/finance/reports/balance-sheet" label="Balance sheet" />
                <ReportLink href="/dashboard/finance/reports/cash-flow" label="Cash flow" />
              </div>
            </section>
          )}

          <p className="text-right text-xs text-muted-foreground">
            Generated{" "}
            {new Date(report.generatedAt).toLocaleString("en-KE", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </>
      ) : (
        !error && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Choose a date range to load report data.
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardDescription>{label}</CardDescription>
        {icon ?? <FileText className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <p className="text-xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function ReportLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="group">
      <Card className="transition-colors group-hover:border-primary/50">
        <CardContent className="flex items-center gap-3 p-4">
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-medium">{label}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
