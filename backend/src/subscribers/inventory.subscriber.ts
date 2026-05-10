import { eventBus } from '../lib/events';
import { INVENTORY_EVENTS } from '../lib/domain-events';
import { logger } from '../lib/logger';

/**
 * Subscriber for Inventory domain events.
 */
export class InventorySubscriber {
  public static initialize() {
    eventBus.subscribe(INVENTORY_EVENTS.STOCK_UPDATED, this.handleStockUpdated);
    eventBus.subscribe(INVENTORY_EVENTS.LOW_STOCK_ALERT, this.handleLowStock);
  }

  /**
   * React to stock level changes
   */
  private static handleStockUpdated(data: { productId: string, warehouseId: string, quantity: number, type: 'INCREMENT' | 'DECREMENT' }) {
    logger.info(data, '📦 InventorySubscriber: Stock level updated across system');
    
    // Potential side-effects:
    // 1. Sync external marketplace stock levels
    // 2. Clear product cache on frontend
  }

  /**
   * Handle low stock warnings
   */
  private static handleLowStock(data: { productId: string, currentStock: number, reorderLevel: number }) {
    logger.warn(data, '⚠️ InventorySubscriber: LOW STOCK ALERT! Consider restocking.');
    
    // Potential side-effects:
    // 1. Create a draft Purchase Order automatically
    // 2. Notify procurement team
  }
}
