"use client";
import { useEffect, useState } from "react";
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

export default function BranchManagerDashboard() {
  const { user, token } = useAuth();
  const { hasPermission } = useHasPermission();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("week");
  const [exporting, setExporting] = useState(false);

  // ── Data state (unchanged) ─────────────────────────────────────────────────
  const [metrics, setMetrics] = useState<BranchMetrics | null>(null);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);

  // ── Auth & initial load (unchanged) ────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    if (user && !hasPermission("hr.employee.view") && user.role !== "admin") {
      toast.error("Unauthorized");
      router.push("/dashboard");
      return;
    }

    loadDashboardData();
    const pollInterval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(pollInterval);
  }, [token, user, router]);

  // ── Data fetching (unchanged) ───────────────────────────────────────────────
  const loadDashboardData = async () => {
    if (!token) return;
    try {
      setLoading(true);

      const [metricsRes, salesRes] = await Promise.all([
        dashboardService.getBranchMetrics(token),
        dashboardService.getSalesData(token, timeRange),
      ]);
      await new Promise((resolve) => setTimeout(resolve, 200));

      const [productsRes, stockRes] = await Promise.all([
        dashboardService.getTopProducts(token),
        dashboardService.getLowStockItems(token),
      ]);
      await new Promise((resolve) => setTimeout(resolve, 200));

      const [ordersRes, staffRes] = await Promise.all([
        dashboardService.getPendingOrders(token),
        dashboardService.getStaffPerformance(token),
      ]);

      const responses = [metricsRes, salesRes, productsRes, stockRes, ordersRes, staffRes];
      const hasTokenExpired = responses.some(
        (res: any) => !res.success && res.error?.includes("Token expired")
      );
      if (hasTokenExpired) {
        toast.error("Your session has expired. Please log in again.");
        router.push("/login");
        return;
      }

      setMetrics(metricsRes.data || null);
      setSalesData(salesRes.data || []);
      setTopProducts(productsRes.data || []);
      setLowStockItems(stockRes.data || []);
      setPendingOrders(ordersRes.data || []);
      setStaffPerformance(staffRes.data || []);

      if (!metricsRes.success) toast.error(`Metrics: ${(metricsRes as any).error}`);
      if (!salesRes.success)   toast.error(`Sales: ${(salesRes as any).error}`);
      if (!productsRes.success) toast.error(`Products: ${(productsRes as any).error}`);
      if (!stockRes.success)   toast.error(`Stock: ${(stockRes as any).error}`);
      if (!ordersRes.success)  toast.error(`Orders: ${(ordersRes as any).error}`);
      if (!staffRes.success)   toast.error(`Staff: ${(staffRes as any).error}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = async (range: string) => {
    setTimeRange(range);
    try {
      const salesRes = await dashboardService.getSalesData(token!, range);
      setSalesData(salesRes.data || []);
    } catch {
      toast.error("Could not update range");
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
          onRefresh={loadDashboardData}
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
