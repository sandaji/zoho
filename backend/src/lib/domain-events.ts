/**
 * Centralized Domain Event Constants
 */

export const SALES_EVENTS = {
  /** Emitted when a new Sales Order is created */
  ORDER_CREATED: 'sales.order_created',
  /** Emitted when a Sales Order is fully or partially dispatched */
  ORDER_DISPATCHED: 'sales.order_dispatched',
  /** Emitted when an order is cancelled */
  ORDER_CANCELLED: 'sales.order_cancelled',
};

export const INVENTORY_EVENTS = {
  /** Emitted when stock levels change for a product in a warehouse */
  STOCK_UPDATED: 'inventory.stock_updated',
  /** Emitted when stock falls below reorder level */
  LOW_STOCK_ALERT: 'inventory.low_stock',
};

export const FINANCE_EVENTS = {
  /** Emitted when a new revenue-generating transaction occurs */
  REVENUE_RECOGNIZED: 'finance.revenue_recognized',
  /** Emitted when a payment is received */
  PAYMENT_RECEIVED: 'finance.payment_received',
};
