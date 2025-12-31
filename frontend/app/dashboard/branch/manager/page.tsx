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

// Import new sub-components
import { DashboardHeader } from "@/components/dashboard/branch-manager/header";
import { KpiGrid } from "@/components/dashboard/branch-manager/kpi-grid";
import { SalesAnalytics } from "@/components/dashboard/branch-manager/sales-analytics";
import { InventoryTables } from "@/components/dashboard/branch-manager/inventory-tables";
import { OperationsSection } from "@/components/dashboard/branch-manager/operations-section";
import { QuickActions } from "@/components/dashboard/branch-manager/quick-actions";

export default function BranchManagerDashboard() {
  const { user, token } = useAuth();
  const { hasPermission } = useHasPermission();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("week");
  const [exporting, setExporting] = useState(false);

  // Data State
  const [metrics, setMetrics] = useState<BranchMetrics | null>(null);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);

  // Auth & Initial Load
  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    // Check permissions
    if (user && !hasPermission('hr.employee.view') && user.role !== 'admin') {
      toast.error("Unauthorized");
      router.push("/dashboard");
      return;
    }

    loadDashboardData();
    const pollInterval = setInterval(loadDashboardData, 60000); // Poll every 60 seconds
    return () => clearInterval(pollInterval);
  }, [token, user, router]);

  const loadDashboardData = async () => {
    if (!token) return;
    try {
      setLoading(true);

      // Fetch metrics and sales first
      const [metricsRes, salesRes] = await Promise.all([
        dashboardService.getBranchMetrics(token),
        dashboardService.getSalesData(token, timeRange),
      ]);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Fetch inventory data
      const [productsRes, stockRes] = await Promise.all([
        dashboardService.getTopProducts(token),
        dashboardService.getLowStockItems(token),
      ]);

      // Small delay
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Fetch operations data
      const [ordersRes, staffRes] = await Promise.all([
        dashboardService.getPendingOrders(token),
        dashboardService.getStaffPerformance(token),
      ]);

      // Check for token expiration errors
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

      // Show error messages for any failed requests
      if (!metricsRes.success) toast.error(`Metrics: ${(metricsRes as any).error}`);
      if (!salesRes.success) toast.error(`Sales: ${(salesRes as any).error}`);
      if (!productsRes.success) toast.error(`Products: ${(productsRes as any).error}`);
      if (!stockRes.success) toast.error(`Stock: ${(stockRes as any).error}`);
      if (!ordersRes.success) toast.error(`Orders: ${(ordersRes as any).error}`);
      if (!staffRes.success) toast.error(`Staff: ${(staffRes as any).error}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = async (range: string) => {
    setTimeRange(range);
    // Only refresh sales data for range change to save bandwidth
    try {
      const salesRes = await dashboardService.getSalesData(token!, range);
      setSalesData(salesRes.data || []);
    } catch (e) {
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
    } catch (e) {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (!token || !user) return null; // or loading spinner

  return (
    <div className="space-y-6">
      <DashboardHeader
        user={user}
        timeRange={timeRange}
        onTimeRangeChange={handleTimeRangeChange}
        onRefresh={loadDashboardData}
        onExport={handleExport}
        loading={loading}
        exporting={exporting}
      />

      <KpiGrid metrics={metrics} loading={loading} />

      <SalesAnalytics salesData={salesData} timeRange={timeRange} loading={loading} />

      <InventoryTables topProducts={topProducts} lowStockItems={lowStockItems} loading={loading} />

      <OperationsSection
        pendingOrders={pendingOrders}
        staffPerformance={staffPerformance}
        loading={loading}
      />

      <QuickActions />
    </div>
  );
}
