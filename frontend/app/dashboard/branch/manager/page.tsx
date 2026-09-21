"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useHasPermission } from "@/hooks/use-permissions";
import { toast } from "sonner";
import {
  dashboardService,
  BranchMetrics,
  SalesData,
  TopProduct,
  LowStockItem,
  PendingOrder,
  StaffPerformance,
} from "@/lib/dashboard.service";

// ── Sub-components (all data hooks 100% preserved) ──────────────────────────
import { DashboardHeader } from "@/components/dashboard/branch-manager/header";
import { KpiGrid } from "@/components/dashboard/branch-manager/kpi-grid";
import { SalesAnalytics } from "@/components/dashboard/branch-manager/sales-analytics";
import { PosFeed } from "@/components/dashboard/branch-manager/pos-feed";
import { AlertsTabs } from "@/components/dashboard/branch-manager/alerts-tabs";

// The login page lives at /auth/login (there is no /login route).
const LOGIN_PATH = "/auth/login";

export default function BranchManagerDashboard() {
  const { user, token } = useAuth();
  const { hasPermission } = useHasPermission();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("week");
  const [exporting, setExporting] = useState(false);

  // The 60s poll below is created once per login, so its closure would keep
  // using the FIRST timeRange forever. Read the current one through a ref.
  const timeRangeRef = useRef(timeRange);
  timeRangeRef.current = timeRange;

  // ── Data state ─────────────────────────────────────────────────────────────
  const [metrics, setMetrics] = useState<BranchMetrics | null>(null);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);

  // ── Auth & initial load ────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      router.push(LOGIN_PATH);
      return;
    }
    if (user && !hasPermission("hr.employee.view") && user.role !== "admin") {
      toast.error("Unauthorized");
      router.push("/dashboard");
      return;
    }

    // First load reports problems; the background poll stays quiet.
    loadDashboardData({ notify: true });
    const pollInterval = setInterval(() => loadDashboardData({ notify: false }), 60000);
    return () => clearInterval(pollInterval);
  }, [token, user, router]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  /**
   * @param notify  true for the first load and manual refresh: show the loading
   *                state and report failures. false for the background poll,
   *                which must not flash skeletons or toast every minute.
   */
  const loadDashboardData = async ({ notify }: { notify: boolean } = { notify: false }) => {
    if (!token) return;
    const range = timeRangeRef.current;
    try {
      if (notify) setLoading(true);

      const [metricsRes, salesRes] = await Promise.all([
        dashboardService.getBranchMetrics(token, range),
        dashboardService.getSalesData(token, range),
      ]);
      await new Promise((resolve) => setTimeout(resolve, 200));

      const [productsRes, stockRes] = await Promise.all([
        dashboardService.getTopProducts(token, range),
        dashboardService.getLowStockItems(token),
      ]);
      await new Promise((resolve) => setTimeout(resolve, 200));

      const [ordersRes, staffRes] = await Promise.all([
        dashboardService.getPendingOrders(token),
        dashboardService.getStaffPerformance(token, range),
      ]);

      const responses = [metricsRes, salesRes, productsRes, stockRes, ordersRes, staffRes];
      const hasTokenExpired = responses.some(
        (res: any) => !res.success && res.error?.includes("Token expired")
      );
      if (hasTokenExpired) {
        toast.error("Your session has expired. Please log in again.");
        router.push(LOGIN_PATH);
        return;
      }

      // Only overwrite a widget when its request worked, so one failed
      // background refresh can't blank out data that was already showing.
      if (metricsRes.success) setMetrics(metricsRes.data);
      if (salesRes.success) setSalesData(salesRes.data);
      if (productsRes.success) setTopProducts(productsRes.data);
      if (stockRes.success) setLowStockItems(stockRes.data);
      if (ordersRes.success) setPendingOrders(ordersRes.data);
      if (staffRes.success) setStaffPerformance(staffRes.data);

      if (notify) {
        const failures = [
          { label: "Sales & KPIs", res: metricsRes },
          { label: "Sales trend", res: salesRes },
          { label: "Top products", res: productsRes },
          { label: "Stock alerts", res: stockRes },
          { label: "Pending deliveries", res: ordersRes },
          { label: "Staff", res: staffRes },
        ].filter(({ res }) => !res.success) as { label: string; res: any }[];

        if (failures.length > 0) {
          // One toast, with the server's own reason (e.g. "Permission denied:
          // sales.order.view_all"), instead of up to six generic ones. The
          // sales-based widgets share one request, so de-duplicate identical
          // reasons.
          const reasons = Array.from(
            new Set(failures.map(({ label, res }) => `${label}: ${res.error}`))
          );
          toast.error("Some dashboard data couldn't be loaded", {
            description: reasons.join("\n"),
          });
        }
      }
    } catch (error) {
      console.error(error);
      if (notify) toast.error("Failed to load dashboard data");
    } finally {
      if (notify) setLoading(false);
    }
  };

  const handleTimeRangeChange = async (range: string) => {
    setTimeRange(range);
    if (!token) return;

    const [metricsRes, salesRes, productsRes, staffRes] = await Promise.all([
      dashboardService.getBranchMetrics(token, range),
      dashboardService.getSalesData(token, range),
      dashboardService.getTopProducts(token, range),
      dashboardService.getStaffPerformance(token, range),
    ]);

    if (metricsRes.success) setMetrics(metricsRes.data);
    if (salesRes.success) setSalesData(salesRes.data);
    if (productsRes.success) setTopProducts(productsRes.data);
    if (staffRes.success) setStaffPerformance(staffRes.data);

    if (!salesRes.success) {
      toast.error("Could not update range", { description: salesRes.error });
    }
  };

  const handleExport = async (format: "csv" | "pdf") => {
    if (!token) return;
    try {
      setExporting(true);
      const blob = await dashboardService.exportDashboard(token, format, timeRange);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `report.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported as ${format}`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (!token || !user) return null;

  return (
    <div className="min-h-screen bg-emerald-50/30 p-5">
      <div className="mx-auto max-w-screen-2xl space-y-5">
        {/* ── Row 1: Global Context Bar ──────────────────────────────────── */}
        <DashboardHeader
          user={user}
          timeRange={timeRange}
          onTimeRangeChange={handleTimeRangeChange}
          onRefresh={() => loadDashboardData({ notify: true })}
          onExport={handleExport}
          loading={loading}
          exporting={exporting}
        />

        {/* ── Row 2: Flash KPI Cards ─────────────────────────────────────── */}
        <KpiGrid metrics={metrics} loading={loading} />

        {/* ── Row 3: Trend Visualizations (8/4 split) ────────────────────── */}
        <SalesAnalytics salesData={salesData} timeRange={timeRange} loading={loading} />

        {/* ── Row 4: Actionable Feeds (6/6 split) ───────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-2">
          <PosFeed orders={pendingOrders} loading={loading} />
          <AlertsTabs
            lowStockItems={lowStockItems}
            topProducts={topProducts}
            staffPerformance={staffPerformance}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
