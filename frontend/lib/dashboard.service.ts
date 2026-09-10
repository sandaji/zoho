/**
 * Branch Manager Dashboard Service
 * API functions for branch metrics and operations
 */

export interface BranchMetrics {
  totalSales: number;
  totalRevenue: number;
  averageTransaction: number;
  customerCount: number;
  // Not currently computable from a backend endpoint — see getBranchMetrics().
  conversionRate: number | null;
  inventoryValue: number;
}

export interface SalesData {
  date: string;
  amount: number;
  transactions: number;
}

export interface TopProduct {
  id: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  stockLevel: number;
}

export interface LowStockItem {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  status: "critical" | "low" | "warning";
}

export interface PendingOrder {
  id: string;
  customer: string;
  // The `deliveries` model has no link to a sales document/order in the
  // current schema, so amount/items can't be computed — null until that
  // relation exists.
  amount: number | null;
  items: number | null;
  status: "pending" | "processing" | "ready";
  timeElapsed: number;
}

export interface StaffPerformance {
  id: string;
  name: string;
  role: string;
  sales: number;
  transactions: number;
  // Requires visit/lead data the backend doesn't track yet — null, not guessed.
  conversionRate: number | null;
}

import { frontendEnv } from "./env";

const API_URL = `${frontendEnv.NEXT_PUBLIC_API_URL}/v1`;

export const dashboardService = {
  /**
   * Get branch metrics (admin stats)
   */
  async getBranchMetrics(token: string) {
    try {
      const response = await fetch(`${API_URL}/admin/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        throw new Error("Token expired. Please log in again.");
      }
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Failed to fetch metrics");
      }
      const data = await response.json();

      return {
        success: true,
        data: {
          totalSales: data.data?.totalProducts || 0,
          totalRevenue: data.data?.totalRevenue || 0,
          averageTransaction: data.data?.averageOrderValue || 0,
          customerCount: data.data?.totalUsers || 0,
          // No conversion-rate source on the backend yet — report "not
          // available" rather than a fixed, made-up figure.
          conversionRate: null,
          inventoryValue: data.data?.totalInventoryValue || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: null,
      };
    }
  },

  /**
   * Get real daily sales/revenue trend from GET /sales-documents/performance
   * (aggregated server-side from paid invoices in the requested window).
   */
  async getSalesData(token: string, timeRange: string = "week") {
    try {
      const days = timeRange === "day" ? 1 : timeRange === "week" ? 7 : 30;
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await fetch(`${API_URL}/sales-documents/performance?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch sales performance");
      }

      const result = await response.json();
      const byDay: { date: string; revenue: number; orderCount: number }[] =
        result.data?.byDay || [];

      const data: SalesData[] = byDay.map((d) => ({
        date: d.date,
        amount: d.revenue,
        transactions: d.orderCount,
      }));

      return { success: true, data };
    } catch (error) {
      console.error("Error fetching sales data:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
      };
    }
  },

  /**
   * Get top selling products - Fixed to use correct endpoint
   */
  async getTopProducts(token: string) {
    try {
      // Use the authenticated products endpoint instead of admin-only
      const response = await fetch(`${API_URL}/products?limit=20`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();

      // Transform product data - handle both paginated and direct array responses
      const products = (data.data?.products || data.data || []).slice(0, 5).map((product: any) => ({
        id: product.id,
        name: product.name,
        category: product.category || "Uncategorized",
        quantity: product.quantity || 0,
        revenue: (product.unit_price || 0) * (product.quantity || 0),
        stockLevel: Math.min(
          100,
          Math.floor(((product.quantity || 0) / (product.reorder_level || 10)) * 100)
        ),
      }));

      return { success: true, data: products };
    } catch (error) {
      console.error("Error fetching top products:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
      };
    }
  },

  /**
   * Get low stock items - Fixed to use correct endpoint
   */
  async getLowStockItems(token: string) {
    try {
      // Use the authenticated products endpoint
      const response = await fetch(`${API_URL}/products?limit=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch low stock items");
      }

      const data = await response.json();

      // Filter and transform low stock items
      const products = data.data?.products || data.data || [];
      const lowStockItems = products
        .filter((product: any) => product.quantity <= (product.reorder_level || 10))
        .slice(0, 4)
        .map((product: any) => {
          const currentStock = product.quantity || 0;
          const minStock = product.reorder_level || 10;
          let status: "critical" | "low" | "warning" = "warning";

          if (currentStock === 0 || currentStock < minStock * 0.25) {
            status = "critical";
          } else if (currentStock < minStock * 0.5) {
            status = "low";
          }

          return {
            id: product.id,
            name: product.name,
            currentStock,
            minStock,
            status,
          };
        });

      return { success: true, data: lowStockItems };
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
      };
    }
  },

  /**
   * Get pending deliveries/orders.
   *
   * Note: `amount` and `items` are always null — the `deliveries` model has
   * no foreign key to a sales document/order in the current schema, so
   * there's no real value to compute here. Previously this filled in
   * Math.random() figures, which looked real but weren't; null + an
   * "unavailable" state in the UI is the honest option until that relation
   * is added on the backend.
   */
  async getPendingOrders(token: string) {
    try {
      const response = await fetch(`${API_URL}/deliveries?status=pending&limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch pending orders");
      }

      const data = await response.json();

      const orders: PendingOrder[] = (data.data || []).slice(0, 4).map((delivery: any) => ({
        id: delivery.id,
        customer: delivery.destination || "Customer",
        amount: null,
        items: null,
        status: (delivery.status?.toLowerCase() || "pending") as "pending" | "processing" | "ready",
        timeElapsed: Math.floor(
          (Date.now() - new Date(delivery.createdAt).getTime()) / (1000 * 60)
        ),
      }));

      return { success: true, data: orders };
    } catch (error) {
      console.error("Error fetching pending orders:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
      };
    }
  },

  /**
   * Get staff performance. Real sales figures come from
   * GET /sales-documents/performance's bySalesman aggregation; role/name
   * come from admin/users. conversionRate is null — the backend doesn't
   * track visits/leads, so there's nothing real to show there yet.
   */
  async getStaffPerformance(token: string) {
    try {
      const [usersRes, perfRes] = await Promise.all([
        fetch(`${API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/sales-documents/performance`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!usersRes.ok) {
        return { success: true, data: [] };
      }

      const usersData = await usersRes.json();
      const users: any[] = usersData.data || [];

      let bySalesman: {
        userId: string;
        totalRevenue: number;
        orderCount: number;
      }[] = [];
      if (perfRes.ok) {
        const perfData = await perfRes.json();
        bySalesman = perfData.data?.bySalesman || [];
      }
      const perfByUserId = Object.fromEntries(bySalesman.map((s) => [s.userId, s]));

      const staff: StaffPerformance[] = users.slice(0, 4).map((user: any) => {
        const perf = perfByUserId[user.id];
        return {
          id: user.id,
          name: user.name,
          role: user.role || "Staff",
          sales: perf?.totalRevenue ?? 0,
          transactions: perf?.orderCount ?? 0,
          conversionRate: null,
        };
      });

      return { success: true, data: staff };
    } catch (error) {
      console.error("Error fetching staff performance:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
      };
    }
  },

  /**
   * Export dashboard data as CSV
   */
  async exportDashboard(token: string, format: "csv" | "pdf" = "csv", timeRange: string = "week") {
    // Fetch all data
    const [metrics, sales, products, stock, orders, staff] = await Promise.all([
      this.getBranchMetrics(token),
      this.getSalesData(token, timeRange),
      this.getTopProducts(token),
      this.getLowStockItems(token),
      this.getPendingOrders(token),
      this.getStaffPerformance(token),
    ]);

    if (format === "csv") {
      return this.generateCSV({
        metrics: metrics.data,
        sales: sales.data,
        products: products.data,
        stock: stock.data,
        orders: orders.data,
        staff: staff.data,
      });
    } else {
      return this.generatePDF({
        metrics: metrics.data,
        sales: sales.data,
        products: products.data,
        stock: stock.data,
        orders: orders.data,
        staff: staff.data,
      });
    }
  },

  /**
   * Generate CSV export
   */
  generateCSV(data: any): Blob {
    let csv = "Branch Manager Dashboard Report\n";
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;

    // Metrics Section
    csv += "METRICS\n";
    csv +=
      "Total Revenue,Total Sales,Avg Transaction,Customer Count,Conversion Rate,Inventory Value\n";
    const conversionRateLabel =
      data.metrics?.conversionRate == null
        ? "N/A"
        : `${(data.metrics.conversionRate * 100).toFixed(1)}%`;
    csv += `${data.metrics?.totalRevenue || 0},${data.metrics?.totalSales || 0},${data.metrics?.averageTransaction || 0},${data.metrics?.customerCount || 0},${conversionRateLabel},${data.metrics?.inventoryValue || 0}\n\n`;

    // Top Products
    csv += "TOP PRODUCTS\n";
    csv += "Product,Category,Qty Sold,Revenue,Stock Level\n";
    (data.products || []).forEach((product: any) => {
      csv += `${product.name},${product.category},${product.quantity},${product.revenue},${product.stockLevel}%\n`;
    });
    csv += "\n";

    // Low Stock Items
    csv += "LOW STOCK ALERTS\n";
    csv += "Product,Current Stock,Min Required,Status\n";
    (data.stock || []).forEach((item: any) => {
      csv += `${item.name},${item.currentStock},${item.minStock},${item.status}\n`;
    });
    csv += "\n";

    // Staff Performance
    csv += "STAFF PERFORMANCE\n";
    csv += "Staff,Role,Sales,Transactions,Conversion Rate\n";
    (data.staff || []).forEach((member: any) => {
      const rate = member.conversionRate == null ? "N/A" : `${(member.conversionRate * 100).toFixed(1)}%`;
      csv += `${member.name},${member.role},${member.sales},${member.transactions},${rate}\n`;
    });

    return new Blob([csv], { type: "text/csv" });
  },

  /**
   * Generate PDF export (returns blob)
   */
  generatePDF(data: any): Blob {
    // For now, return CSV as fallback
    // In production, use library like jsPDF or pdfkit
    return this.generateCSV(data);
  },
};
