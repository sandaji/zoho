// frontend/lib/admin-api.ts
import {
  SalesStatus,
  DeliveryStatus,
  TransactionType,
  PayrollStatus,
  PaymentMethod,
} from "./types";
import { API_BASE_URL, API_ENDPOINTS, getApiUrl } from "./api-config";
import { getAuthHeadersWithToken } from "./api-utils";
import { UserRole } from "./auth-context";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Branch {
  id: string;
  code: string;
  name: string;
  city: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location: string;
  capacity: number;
  branchId: string;
  branch: {
    name: string;
    code: string;
  };
  _count: {
    inventory: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  branchId: string | null;
  branch: {
    name: string;
    code: string;
  } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category: string | null;
  unit_price: number;
  cost_price: number;
  tax_rate: number;
  quantity: number;
  reorder_level: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalesItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
}

export interface Sales {
  id: string;
  invoice_no: string;
  status: SalesStatus;
  payment_method: PaymentMethod;
  branchId: string;
  branch: {
    name: string;
  };
  userId: string;
  user: {
    name: string;
  };
  subtotal: number;
  discount: number;
  tax: number;
  grand_total: number;
  amount_paid: number;
  createdAt: string;
  items?: SalesItem[];
}

export interface Delivery {
  id: string;
  delivery_no: string;
  status: DeliveryStatus;
  salesDocumentId?: string;
  sales?: {
    invoice_no: string;
    grand_total: number;
  };
  stockTransferId?: string;
  stockTransfer?: {
    documentId: string;
  };
  driverId: string;
  driver: {
    name: string;
    email: string;
  };
  truckId: string;
  truck: {
    registration: string;
    model: string;
  };
  destination: string;
  createdAt: string;
  podSignature?: string;
  podPhotoUrl?: string;
  otp?: string;
  notes?: string;
}

export interface Truck {
  id: string;
  registration: string;
  model: string;
  capacity: number;
  isActive: boolean;
}

export interface StockTransfer {
  id: string;
  documentId: string;
  status:
    | "DRAFT"
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "PICKING"
    | "VERIFIED"
    | "DISPATCHED"
    | "PARTIALLY_RECEIVED"
    | "RECEIVED"
    | "CANCELLED"
    | "DISCREPANCY";
  sourceWarehouseId: string;
  sourceWarehouse: { name: string };
  destinationWarehouseId: string;
  destinationWarehouse: { name: string };
  items: StockTransferItem[];
  notes: string | null;
  truckId: string | null;
  truck: { id: string; registration: string; model: string } | null;
  driverId: string | null;
  driver: { id: string; name: string; phone: string | null } | null;
  dispatchMode: "RIDER" | "TRUCK" | null;
  vehicleRegistration: string | null;
  dispatchedAt: string | null;
  approvedById: string | null;
  approvedBy: { id: string; name: string } | null;
  approvedAt: string | null;
  pickedById: string | null;
  pickedBy: { id: string; name: string } | null;
  pickedAt: string | null;
  pickingCompletedAt: string | null;
  verifiedById: string | null;
  verifiedBy: { id: string; name: string } | null;
  verifiedAt: string | null;
  receivedAt: string | null;
  createdById: string;
  createdBy: { id: string; name: string };
  receivedBy: { name: string } | null;
  createdAt: string;
  updatedAt: string;
  availableActions?: Array<{ action: string; label: string }>;
}

export interface StockTransferItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  requested_qty: number;
  picked_qty: number | null;
  dispatched_qty: number | null;
  received_qty: number | null;
  damaged_qty: number | null;
  unitCost: number | null;
}

export interface RequestStockTransferPayload {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  items: {
    productId: string;
    requested_qty: number;
  }[];
  notes?: string;
}

export interface ApproveStockTransferPayload {
  notes?: string;
}

export interface StartPickingPayload {
  notes?: string;
}

export interface CompletePickingPayload {
  items: {
    productId: string;
    picked_qty: number;
  }[];
  notes?: string;
}

export interface VerifyTransferPayload {
  notes?: string;
}

export interface DispatchStockTransferPayload {
  items: {
    productId: string;
    dispatched_qty: number;
  }[];
  dispatchMode: "RIDER" | "TRUCK";
  driverId: string;
  truckId?: string;
  vehicleRegistration?: string;
}

export interface ReceiveStockTransferPayload {
  items: {
    productId: string;
    received_qty: number;
    damaged_qty: number;
  }[];
  notes?: string;
}

export interface CreateDeliveryPayload {
  salesDocumentId?: string;
  stockTransferId?: string;
  driverId: string;
  truckId: string;
  destination: string;
  notes?: string;
}

export interface UpdateDeliveryStatusPayload {
  status: DeliveryStatus;
  podSignature?: string;
  podPhotoUrl?: string;
  otp?: string;
  notes?: string;
}

export interface FinanceTransaction {
  id: string;
  type: TransactionType;
  reference_no: string;
  description: string;
  amount: number;
  payment_method: string | null;
  createdAt: string;
}

export interface Payroll {
  id: string;
  payroll_no: string;
  status: PayrollStatus;
  userId: string;
  user: {
    name: string;
    email: string;
  };
  net_salary: number;
  createdAt: string;
}

export interface DailySummary {
  total_sales: number;
  total_revenue: number;
  total_tax: number;
  total_discount: number;
  top_products: {
    productId: string;
    name: string;
    quantity: number;
  }[];
}

export interface MonthlyReport {
  month: number;
  year: number;
  total_revenue: number;
  total_expenses: number;
  total_payroll: number;
  net_profit: number;
  transactions_by_type: Array<{
    type: string;
    amount: number;
    percentage: number;
  }>;
  expenses_by_category: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

export const fetchBranches = async (token: string): Promise<Branch[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/admin/branches`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch branches");
  }
  const { data } = await response.json();
  return data.branches || [];
};

export const fetchWarehouses = async (token: string): Promise<Warehouse[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/admin/warehouses`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch warehouses");
  }
  const { data } = await response.json();
  return data;
};

export const fetchVendors = async (token: string): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/purchasing/vendors`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch vendors");
  }
  const { data } = await response.json();
  return data.vendors || [];
};

export const fetchUsers = async (token: string): Promise<User[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/admin/users`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  const { data } = await response.json();
  return data;
};

export const fetchProducts = async (token: string): Promise<Product[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/admin/products`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }
  const { data } = await response.json();
  return data;
};

export const fetchSales = async (token: string): Promise<Sales[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/pos/sales`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch sales");
  }
  const result = await response.json();
  return result.data;
};

export const fetchDeliveries = async (token: string): Promise<Delivery[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/deliveries`, {
    // Corrected endpoint
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch deliveries");
  }
  const { data } = await response.json();
  return data;
};

export const createDelivery = async (
  token: string,
  payload: CreateDeliveryPayload
): Promise<Delivery> => {
  const response = await fetch(`${API_BASE_URL}/v1/deliveries`, {
    method: "POST",
    headers: getAuthHeadersWithToken(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to create delivery");
  }
  const { data } = await response.json();
  return data;
};

export const updateDeliveryStatus = async (
  token: string,
  deliveryId: string,
  payload: UpdateDeliveryStatusPayload
): Promise<Delivery> => {
  const response = await fetch(`${API_BASE_URL}/v1/deliveries/${deliveryId}/status`, {
    method: "PATCH",
    headers: getAuthHeadersWithToken(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to update delivery status");
  }
  const { data } = await response.json();
  return data;
};

export const fetchTrucks = async (token: string): Promise<Truck[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/trucks`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch trucks");
  }
  const { data } = await response.json();
  return data;
};

export const fetchStockTransfers = async (token: string): Promise<StockTransfer[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/inventory/transfers`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch stock transfers");
  }
  const payload = await response.json();
  const data = Array.isArray(payload?.data) ? payload.data : [];
  return data.map((transfer: any) => ({
    ...transfer,
    status: transfer.status?.toUpperCase?.() ?? transfer.status,
  }));
};

export const requestStockTransfer = async (
  token: string,
  payload: RequestStockTransferPayload
): Promise<StockTransfer> => {
  const response = await fetch(`${API_BASE_URL}/v1/inventory/transfers/request`, {
    method: "POST",
    headers: getAuthHeadersWithToken(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to request stock transfer");
  }
  const { data } = await response.json();
  return data;
};

export const approveStockTransfer = async (
  token: string,
  transferId: string,
  payload: ApproveStockTransferPayload
): Promise<StockTransfer> => {
  const response = await fetch(`${API_BASE_URL}/v1/inventory/transfers/${transferId}/approve`, {
    method: "POST",
    headers: getAuthHeadersWithToken(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to approve stock transfer");
  }
  const { data } = await response.json();
  return data;
};

export const startPickingStockTransfer = async (
  token: string,
  transferId: string,
  payload: StartPickingPayload
): Promise<StockTransfer> => {
  const response = await fetch(`${API_BASE_URL}/v1/inventory/transfers/${transferId}/start-picking`, {
    method: "POST",
    headers: getAuthHeadersWithToken(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to start picking");
  }
  const { data } = await response.json();
  return data;
};

export const completePickingStockTransfer = async (
  token: string,
  transferId: string,
  payload: CompletePickingPayload
): Promise<StockTransfer> => {
  const response = await fetch(`${API_BASE_URL}/v1/inventory/transfers/${transferId}/complete-picking`, {
    method: "POST",
    headers: getAuthHeadersWithToken(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to complete picking");
  }
  const { data } = await response.json();
  return data;
};

export const verifyStockTransfer = async (
  token: string,
  transferId: string,
  payload: VerifyTransferPayload
): Promise<StockTransfer> => {
  const response = await fetch(`${API_BASE_URL}/v1/inventory/transfers/${transferId}/verify`, {
    method: "POST",
    headers: getAuthHeadersWithToken(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to verify stock transfer");
  }
  const { data } = await response.json();
  return data;
};

export const dispatchStockTransfer = async (
  token: string,
  transferId: string,
  payload: DispatchStockTransferPayload
): Promise<StockTransfer> => {
  const response = await fetch(`${API_BASE_URL}/v1/inventory/transfers/${transferId}/dispatch`, {
    method: "POST",
    headers: getAuthHeadersWithToken(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to dispatch stock transfer");
  }
  const { data } = await response.json();
  return data;
};

export const receiveStockTransfer = async (
  token: string,
  transferId: string,
  payload: ReceiveStockTransferPayload
): Promise<StockTransfer> => {
  const response = await fetch(`${API_BASE_URL}/v1/inventory/transfers/${transferId}/receive`, {
    method: "POST",
    headers: getAuthHeadersWithToken(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to receive stock transfer");
  }
  const { data } = await response.json();
  return data;
};

export interface RaiseTransferIssuePayload {
  category: "quantity_variance" | "damage" | "lost_in_transit" | "wrong_item" | "other";
  description: string;
}

export interface ResolveTransferIssuePayload {
  status: "RESOLVED" | "DISMISSED";
  resolution: string;
}

export const raiseTransferIssue = async (
  token: string,
  transferId: string,
  payload: RaiseTransferIssuePayload
): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/v1/inventory/transfers/${transferId}/issues`, {
    method: "POST",
    headers: getAuthHeadersWithToken(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to raise transfer issue");
  }
  const { data } = await response.json();
  return data;
};

export const resolveTransferIssue = async (
  token: string,
  issueId: string,
  payload: ResolveTransferIssuePayload
): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/v1/inventory/transfers/issues/${issueId}/resolve`, {
    method: "POST",
    headers: getAuthHeadersWithToken(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to resolve transfer issue");
  }
  const { data } = await response.json();
  return data;
};

export const fetchStockTransferDetail = async (
  token: string,
  transferId: string
): Promise<StockTransfer> => {
  const response = await fetch(`${API_BASE_URL}/v1/inventory/transfers/${transferId}`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch details for transfer ${transferId}`);
  }
  const { data } = await response.json();
  return data;
};

export const fetchTransferAuditLogs = async (
  token: string,
  transferId: string
): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/inventory/transfers/${transferId}/audit-logs`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch transfer audit logs");
  }
  const { data } = await response.json();
  return data;
};

export const fetchTransferAnalytics = async (
  token: string
): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/v1/inventory/transfers/analytics`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch transfer analytics");
  }
  const { data } = await response.json();
  return data;
};

export const fetchNotifications = async (
  token: string,
): Promise<{ notifications: any[]; unreadCount: number }> => {
  const response = await fetch(`${API_BASE_URL}/v1/notifications`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }
  const { data } = await response.json();
  return data;
};

export const markNotificationRead = async (
  token: string,
  notificationId: string,
): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/v1/notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to mark notification as read");
  }
  return response.json();
};

export const markAllNotificationsRead = async (
  token: string,
): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/v1/notifications/read-all`, {
    method: "POST",
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to mark all notifications as read");
  }
  return response.json();
};

export const fetchFinanceTransactions = async (token: string): Promise<FinanceTransaction[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/admin/finance/transactions`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch finance transactions");
  }
  const { data } = await response.json();
  return data;
};

export const fetchPayroll = async (token: string): Promise<Payroll[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/admin/payroll`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch payroll");
  }
  const { data } = await response.json();
  return data;
};

export const createProduct = async (token: string, payload: ProductPayload): Promise<Product> => {
  const response = await fetch(`${API_BASE_URL}/v1/products`, {
    method: "POST",
    headers: getAuthHeadersWithToken(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to create product");
  }
  const { data } = await response.json();
  return data;
};

export const fetchDailySummary = async (token: string): Promise<DailySummary> => {
  const response = await fetch(getApiUrl(API_ENDPOINTS.POS_DAILY_SUMMARY), {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    const errorDetails = await response.text().catch(() => "No error details");
    console.error(`Daily summary request failed with status ${response.status}:`, errorDetails);
    throw new Error(`Failed to fetch daily summary (${response.status}): ${errorDetails}`);
  }
  const { data } = await response.json();
  return data;
};

export const getFinancialReport = async (
  token: string,
  month: number,
  year: number
): Promise<MonthlyReport> => {
  const response = await fetch(`${API_BASE_URL}/v1/finance/report?month=${month}&year=${year}`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch financial report");
  }
  const { data } = await response.json();
  return data;
};

export const getRevenueAnalytics = async (token: string, range: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/v1/finance/analytics/revenue?range=${range}`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch revenue analytics");
  }
  const { data } = await response.json();
  return data;
};

export const listFinanceTransactions = async (token: string): Promise<FinanceTransaction[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/finance/transactions`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to list finance transactions");
  }
  const { data } = await response.json();
  return data;
};

export const listPayroll = async (token: string): Promise<Payroll[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/hr/payroll`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to list payroll");
  }
  const { data } = await response.json();
  return data;
};

export const runPayroll = async (token: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/v1/payroll/run`, {
    method: "POST",
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to run payroll");
  }
  const { data } = await response.json();
  return data;
};

export const updatePayrollStatus = async (
  token: string,
  id: string,
  status: string
): Promise<Payroll> => {
  const response = await fetch(`${API_BASE_URL}/v1/payroll/${id}/status`, {
    method: "PATCH",
    headers: getAuthHeadersWithToken(token),
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to update payroll status");
  }
  const { data } = await response.json();
  return data;
};

export interface ProductPayload {
  sku: string;
  upc: string | null;
  barcode: string | null;
  name: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  product_type: "physical" | "digital" | "service";
  cost_price: number;
  unit_price: number;
  tax_rate: number;
  quantity: number;
  reorder_level: number;
  reorder_quantity: number;
  unit_of_measurement: string;
  weight: number | null;
  weight_unit: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  dimension_unit: string | null;
  image_url: string | null;
  vendorId: string;
  branchId: string;
  supplier_part_number: string | null;
  lead_time_days: number | null;
  warehouseId?: string;
  status: "active" | "inactive" | "discontinued";
}

export interface UpdateUserPayload {
  name?: string;
  phone?: string;
  role?: string;
  branchId?: string | null;
  isActive?: boolean;
}

export const updateUser = async (
  token: string,
  userId: string,
  payload: UpdateUserPayload
): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/v1/hr/users/${userId}`, {
    method: "PATCH",
    headers: getAuthHeadersWithToken(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to update user");
  }
  const { data } = await response.json();
  return data;
};

// ============================================================================
// SYSTEM ACCESS MANAGEMENT
// ============================================================================

export const getEligibleEmployees = async (token: string): Promise<User[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/admin/eligible-employees`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch eligible employees");
  }
  const { data } = await response.json();
  return data;
};

export const grantSystemAccess = async (
  token: string,
  userId: string,
  payload: { role: string; password?: string }
): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/v1/admin/users/${userId}/grant-access`, {
    method: "PUT",
    headers: getAuthHeadersWithToken(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to grant system access");
  }
  const { data } = await response.json();
  return data;
};

// ============================================================================
// UPDATE PRODUCT
// ============================================================================

export type UpdateProductPayload = Partial<Omit<ProductPayload, "image_url">> & {
  image_url?: string | null;
};

export const updateProduct = async (
  token: string,
  productId: string,
  payload: UpdateProductPayload
): Promise<Product> => {
  const response = await fetch(`${API_BASE_URL}/v1/products/${productId}`, {
    method: "PATCH",
    headers: getAuthHeadersWithToken(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to update product");
  }
  const { data } = await response.json();
  return data;
};

// ============================================================================
// CREDIT NOTES
// ============================================================================

export interface CreditNote {
  id: string;
  documentId: string;
  type: string;
  status: SalesStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes: string | null;
  createdAt: string;
  createdBy: {
    name: string;
  };
  approvedBy?: {
    name: string;
  } | null;
}

export const fetchCreditNotes = async (token: string): Promise<CreditNote[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/sales-documents/documents?type=CREDIT_NOTE`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch credit notes");
  }
  const { data } = await response.json();
  return data || [];
};

export const approveCreditNote = async (token: string, id: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/v1/sales-documents/documents/${id}/approve`, {
    method: "POST",
    headers: getAuthHeadersWithToken(token),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to approve credit note");
  }
  const { data } = await response.json();
  return data;
};

export const createCreditNote = async (
  token: string,
  invoiceId: string,
  payload: {
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      discount: number;
    }>;
    reason: string;
  }
): Promise<any> => {
  const response = await fetch(
    `${API_BASE_URL}/v1/sales-documents/invoices/${invoiceId}/credit-notes`,
    {
      method: "POST",
      headers: getAuthHeadersWithToken(token),
      body: JSON.stringify(payload),
    }
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to create credit note");
  }
  const { data } = await response.json();
  return data;
};
