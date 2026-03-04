/**
 * Purchasing Service
 * Handles all purchasing-related API calls (purchase orders, vendors, etc.)
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface GetOrdersResponse {
  success: boolean;
  data: {
    orders: Array<{
      id: string;
      poNumber: string;
      vendor: {
        id: string;
        name: string;
      };
      destinationWarehouse: {
        id: string;
        name: string;
        code?: string;
      };
      total: number;
      status: "DRAFT" | "SUBMITTED" | "APPROVED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CLOSED" | "CANCELLED";
      createdAt: string;
      items: Array<{
        id: string;
        productId: string;
        quantity: number;
        unitPrice: number;
      }>;
    }>;
  };
}

class PurchasingService {
  /**
   * Fetch all vendors
   * @param token - Authentication token
   * @returns Vendors data
   */
  async getVendors(token: string) {
    const response = await fetch(`${API_URL}/v1/purchasing/vendors`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch vendors: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || { vendors: [] };
  }

  /**
   * Fetch all purchase orders for the authenticated user
   * @param token - Authentication token
   * @returns Orders data
   */
  async getOrders(token: string): Promise<GetOrdersResponse["data"]> {
    const response = await fetch(`${API_URL}/v1/purchasing/orders`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch purchase orders: ${response.statusText}`);
    }

    const data: GetOrdersResponse = await response.json();
    return data.data;
  }

  /**
   * Fetch a single purchase order by ID
   * @param token - Authentication token
   * @param orderId - Purchase order ID
   * @returns Order data
   */
  async getOrderById(token: string, orderId: string) {
    const response = await fetch(`${API_URL}/v1/purchasing/orders/${orderId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch purchase order: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a new purchase order
   * @param token - Authentication token
   * @param orderData - Purchase order data
   * @returns Created order
   */
  async createOrder(token: string, orderData: any) {
    const response = await fetch(`${API_URL}/v1/purchasing/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create purchase order: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update an existing purchase order
   * @param token - Authentication token
   * @param orderId - Purchase order ID
   * @param orderData - Updated order data
   * @returns Updated order
   */
  async updateOrder(token: string, orderId: string, orderData: any) {
    const response = await fetch(`${API_URL}/v1/purchasing/orders/${orderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update purchase order: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Delete a purchase order
   * @param token - Authentication token
   * @param orderId - Purchase order ID
   */
  async deleteOrder(token: string, orderId: string) {
    const response = await fetch(`${API_URL}/v1/purchasing/orders/${orderId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete purchase order: ${response.statusText}`);
    }

    return response.json();
  }
}

export const purchasingService = new PurchasingService();
