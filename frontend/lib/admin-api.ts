// frontend/lib/admin-api.ts
import { SalesStatus, DeliveryStatus, TransactionType, PayrollStatus, PaymentMethod } from "./types";
import { API_BASE_URL, API_ENDPOINTS, getApiUrl } from "./api-config";
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
  grand_total: number;
  createdAt: string;
}

export interface Delivery {
  id: string;
  delivery_no: string;
  status: DeliveryStatus;
  salesId: string;
  sales: {
    invoice_no: string;
    grand_total: number;
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

const getAuthHeaders = (token: string) => {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
};

export const fetchBranches = async (token: string): Promise<Branch[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/admin/branches`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch branches");
  }
  const { data } = await response.json();
  return data.branches || [];
};

export const fetchWarehouses = async (token: string): Promise<Warehouse[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/admin/warehouses`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch warehouses");
  }
  const { data } = await response.json();
  return data;
};

export const fetchVendors = async (token: string): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/purchasing/vendors`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch vendors");
  }
  const { data } = await response.json();
  return data.vendors || [];
};

export const fetchUsers = async (token: string): Promise<User[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/admin/users`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  const { data } = await response.json();
  return data;
};

export const fetchProducts = async (token: string): Promise<Product[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/admin/products`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }
  const { data } = await response.json();
  return data;
};

export const fetchSales = async (token: string): Promise<Sales[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/pos/sales`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch sales");
  }
  // The sales endpoint has a different response structure
  const result = await response.json();
  return result.data;
};

export const fetchDeliveries = async (token: string): Promise<Delivery[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/admin/deliveries`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch deliveries");
  }
  const { data } = await response.json();
  return data;
};

export const fetchFinanceTransactions = async (token: string): Promise<FinanceTransaction[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/admin/finance/transactions`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch finance transactions");
  }
  const { data } = await response.json();
  return data;
};

export const fetchPayroll = async (token: string): Promise<Payroll[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/admin/payroll`, {
    headers: getAuthHeaders(token),
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
    headers: getAuthHeaders(token),
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

    headers: getAuthHeaders(token),

  });

  if (!response.ok) {
    const errorDetails = await response.text().catch(() => "No error details");
    console.error(`Daily summary request failed with status ${response.status}:`, errorDetails);

    throw new Error(`Failed to fetch daily summary (${response.status}): ${errorDetails}`);

  }

  const { data } = await response.json();

  return data;

}

export const getFinancialReport = async (token: string, month: number, year: number): Promise<MonthlyReport> => {
  const response = await fetch(`${API_BASE_URL}/v1/finance/report?month=${month}&year=${year}`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch financial report");
  }
  const { data } = await response.json();
  return data;
};

export const getRevenueAnalytics = async (token: string, range: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/v1/finance/analytics/revenue?range=${range}`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch revenue analytics");
  }
  const { data } = await response.json();
  return data;
};

export const listFinanceTransactions = async (token: string): Promise<FinanceTransaction[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/finance/transactions`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error("Failed to list finance transactions");
  }
  const { data } = await response.json();
  return data;
};

export const listPayroll = async (token: string): Promise<Payroll[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/hr/payroll`, {
    headers: getAuthHeaders(token),
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
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to run payroll");
  }
  const { data } = await response.json();
  return data;
};

export const updatePayrollStatus = async (token: string, id: string, status: string): Promise<Payroll> => {
  const response = await fetch(`${API_BASE_URL}/v1/payroll/${id}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
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

  role?: UserRole;

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

    headers: getAuthHeaders(token),

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
    headers: getAuthHeaders(token),
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
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to grant system access");
  }

  const { data } = await response.json();
  return data;
};
