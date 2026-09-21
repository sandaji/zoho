/**
 * Branch Manager Dashboard Service
 * API functions for branch metrics and operations
 *
 * Everything sales-related (KPIs, trend, top products, staff) is derived from
 * ONE endpoint — GET /sales-documents/performance — which needs only
 * `sales.order.view_all` and is branch-isolated server-side for non-admins.
 * It deliberately does NOT depend on the admin-only endpoints (/admin/stats,
 * /admin/users), which a branch manager isn't meant to have access to.
 */

export interface BranchMetrics {
  // Paid invoices in the selected window
  totalSales: number;
  totalRevenue: number;
  averageTransaction: number;
  // null = not available (permission missing / no source). Never a made-up 0.
  customerCount: number | null;
  // No conversion-rate source on the backend yet.
  conversionRate: number | null;
  // No branch inventory-value endpoint yet.
  inventoryValue: number | null;
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
  // Units SOLD in the selected window
  quantity: number;
  // Revenue from those sales
  revenue: number;
  // Current stock as % of reorder level (0 when the product isn't in the
  // stock list)
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

/** Shape of GET /sales-documents/performance → data */
interface SalesPerformance {
  summary: {
    totalRevenue: number;
    totalTax: number;
    totalDiscount: number;
    totalOrders: number;
    avgOrderValue: number;
  };
  byItem: {
    productId: string;
    sku: string;
    name: string;
    totalQty: number;
    totalRevenue: number;
    orderCount: number;
  }[];
  byDay: {
    date: string;
    revenue: number;
    orderCount: number;
    avgOrderValue: number;
  }[];
  bySalesman: {
    userId: string;
    name: string;
    salesPrefix: string | null;
    totalRevenue: number;
    orderCount: number;
    avgOrderValue: number;
  }[];
}

import { frontendEnv } from "./env";

const API_URL = `${frontendEnv.NEXT_PUBLIC_API_URL}/v1`;

// ── HTTP helpers ─────────────────────────────────────────────────────────────

class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/**
 * GET helper. On failure it throws with the SERVER's message (e.g.
 * "Permission denied: sales.order.view_all") instead of a generic
 * "Failed to fetch ..." so the UI can say what is actually wrong.
 */
async function apiGet<T = any>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    // The dashboard page looks for this text to send the user to login.
    throw new HttpError("Token expired. Please log in again.", 401);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body?.error?.message ??
      (typeof body?.error === "string" ? body.error : undefined) ??
      body?.message ??
      `Request failed (${response.status})`;
    throw new HttpError(message, response.status);
  }

  return response.json();
}

/** Uniform failure result. 403 is flagged so the UI can treat "no permission" differently from a real error. */
function failure<T>(label: string, error: unknown, empty: T) {
  const status = error instanceof HttpError ? error.status : undefined;
  // 403 just means this user lacks a permission — an expected state we show in
  // the UI, not something to dump into the console as an error.
  if (status !== 403) {
    console.error(`Error fetching ${label}:`, error);
  }
  return {
    success: false as const,
    error: error instanceof Error ? error.message : "Unknown error",
    data: empty,
    forbidden: status === 403,
  };
}

// The dashboard asks for the same data from several widgets in one load (and
// export re-asks for all of it). Share a request for a few seconds instead of
// hitting the API once per widget. Failures are never cached.
const CACHE_TTL_MS = 5000;
const recent = new Map<string, { at: number; promise: Promise<any> }>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  for (const [k, v] of recent) {
    if (now - v.at >= CACHE_TTL_MS) recent.delete(k);
  }
  const hit = recent.get(key);
  if (hit) return hit.promise;

  const promise = load();
  recent.set(key, { at: now, promise });
  promise.catch(() => recent.delete(key));
  return promise;
}

const RANGE_DAYS: Record<string, number> = { day: 1, week: 7, month: 30 };

function fetchPerformance(token: string, timeRange: string): Promise<SalesPerformance> {
  const days = RANGE_DAYS[timeRange] ?? 30;
  return cached(`performance:${token}:${days}`, async () => {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    const result = await apiGet(`/sales-documents/performance?${params}`, token);
    return result.data as SalesPerformance;
  });
}

function fetchProducts(token: string): Promise<any[]> {
  return cached(`products:${token}`, async () => {
    const data = await apiGet("/products?limit=50", token);
    return data.data?.products || data.data || [];
  });
}

// ── Service ──────────────────────────────────────────────────────────────────

export const dashboardService = {
  /**
   * KPI cards, computed from paid invoices in the selected window.
   * (This used to read /admin/stats, which returns flat entity counts with no
   * revenue — so every KPI was 0 even for an admin — and 403s for a manager.)
   */
  async getBranchMetrics(token: string, timeRange: string = "week") {
    try {
      const [perf, customerCount] = await Promise.all([
        fetchPerformance(token, timeRange),
        // Optional: without sales.customer.view this card just shows "—".
        apiGet("/customers?limit=1", token)
          .then((r) => (typeof r.total === "number" ? (r.total as number) : null))
          .catch(() => null),
      ]);

      const metrics: BranchMetrics = {
        totalSales: perf.summary.totalOrders,
        totalRevenue: perf.summary.totalRevenue,
        averageTransaction: perf.summary.avgOrderValue,
        customerCount,
        conversionRate: null,
        inventoryValue: null,
      };
      return { success: true as const, data: metrics };
    } catch (error) {
      return failure("branch metrics", error, null as BranchMetrics | null);
    }
  },

  /**
   * Daily sales/revenue trend from GET /sales-documents/performance
   * (aggregated server-side from paid invoices in the requested window).
   */
  async getSalesData(token: string, timeRange: string = "week") {
    try {
      const perf = await fetchPerformance(token, timeRange);
      const data: SalesData[] = perf.byDay.map((d) => ({
        date: d.date,
        amount: d.revenue,
        transactions: d.orderCount,
      }));
      return { success: true as const, data };
    } catch (error) {
      return failure("sales data", error, [] as SalesData[]);
    }
  },

  /**
   * Best sellers in the window, from real sales (byItem). Category and current
   * stock level are looked up from the product list when available.
   * (Previously this was just the first 5 catalogue items, with `revenue`
   * = unit_price × stock on hand — i.e. stock value labelled as revenue.)
   */
  async getTopProducts(token: string, timeRange: string = "month") {
    try {
      const [perf, products] = await Promise.all([
        fetchPerformance(token, timeRange),
        // Enrichment only — a failure here must not hide the sales data.
        fetchProducts(token).catch(() => [] as any[]),
      ]);
      const productById = new Map(products.map((p: any) => [p.id, p] as const));

      const data: TopProduct[] = perf.byItem.slice(0, 5).map((item) => {
        const product = productById.get(item.productId);
        return {
          id: item.productId,
          name: item.name,
          category: product?.category || "Uncategorized",
          quantity: item.totalQty,
          revenue: item.totalRevenue,
          stockLevel: product
            ? Math.min(
                100,
                Math.floor(((product.quantity || 0) / (product.reorder_level || 10)) * 100),
              )
            : 0,
        };
      });
      return { success: true as const, data };
    } catch (error) {
      return failure("top products", error, [] as TopProduct[]);
    }
  },

  /**
   * Low stock items, from the authenticated products endpoint.
   */
  async getLowStockItems(token: string) {
    try {
      const products = await fetchProducts(token);

      const lowStockItems: LowStockItem[] = products
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

      return { success: true as const, data: lowStockItems };
    } catch (error) {
      return failure("low stock items", error, [] as LowStockItem[]);
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
      const data = await apiGet("/deliveries?status=pending&limit=10", token);

      const orders: PendingOrder[] = (data.data || []).slice(0, 4).map((delivery: any) => ({
        id: delivery.id,
        customer: delivery.destination || "Customer",
        amount: null,
        items: null,
        status: (delivery.status?.toLowerCase() || "pending") as "pending" | "processing" | "ready",
        timeElapsed: Math.floor(
          (Date.now() - new Date(delivery.createdAt).getTime()) / (1000 * 60),
        ),
      }));

      return { success: true as const, data: orders };
    } catch (error) {
      return failure("pending orders", error, [] as PendingOrder[]);
    }
  },

  /**
   * Top salespeople in the window, from the bySalesman aggregation. This no
   * longer needs /admin/users (admin.user.view). Staff with no sales in the
   * window don't appear. conversionRate is null — the backend doesn't track
   * visits/leads.
   */
  async getStaffPerformance(token: string, timeRange: string = "month") {
    try {
      const perf = await fetchPerformance(token, timeRange);

      const staff: StaffPerformance[] = perf.bySalesman.slice(0, 4).map((s) => ({
        id: s.userId,
        name: s.name,
        role: s.salesPrefix ? `Prefix ${s.salesPrefix}` : "Sales staff",
        sales: s.totalRevenue,
        transactions: s.orderCount,
        conversionRate: null,
      }));

      return { success: true as const, data: staff };
    } catch (error) {
      return failure("staff performance", error, [] as StaffPerformance[]);
    }
  },

  /**
   * Export dashboard data as CSV
   */
  async exportDashboard(token: string, format: "csv" | "pdf" = "csv", timeRange: string = "week") {
    // Fetch all data (the shared cache means this is a couple of requests, not six)
    const [metrics, sales, products, stock, orders, staff] = await Promise.all([
      this.getBranchMetrics(token, timeRange),
      this.getSalesData(token, timeRange),
      this.getTopProducts(token, timeRange),
      this.getLowStockItems(token),
      this.getPendingOrders(token),
      this.getStaffPerformance(token, timeRange),
    ]);

    const payload = {
      metrics: metrics.data,
      sales: sales.data,
      products: products.data,
      stock: stock.data,
      orders: orders.data,
      staff: staff.data,
    };

    return format === "csv" ? this.generateCSV(payload) : this.generatePDF(payload);
  },

  /**
   * Generate CSV export
   */
  generateCSV(data: any): Blob {
    const cell = (v: number | null | undefined) => (v == null ? "N/A" : v);

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
    csv += `${cell(data.metrics?.totalRevenue)},${cell(data.metrics?.totalSales)},${cell(data.metrics?.averageTransaction)},${cell(data.metrics?.customerCount)},${conversionRateLabel},${cell(data.metrics?.inventoryValue)}\n\n`;

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
