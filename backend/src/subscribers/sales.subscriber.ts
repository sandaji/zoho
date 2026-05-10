import { eventBus } from '../lib/events';
import { SALES_EVENTS, FINANCE_EVENTS } from '../lib/domain-events';
import { logger } from '../lib/logger';

/**
 * Subscriber for Sales domain events.
 * Handles side-effects that don't belong in the primary transaction flow.
 */
export class SalesSubscriber {
  public static initialize() {
    eventBus.subscribe(SALES_EVENTS.ORDER_CREATED, this.handleOrderCreated);
    eventBus.subscribe(SALES_EVENTS.ORDER_DISPATCHED, this.handleOrderDispatched);
  }

  /**
   * React to a new sales order being created
   */
  private static handleOrderCreated(order: any) {
    logger.info({ 
      orderId: order.id, 
      soNumber: order.soNumber,
      amount: order.totalAmount 
    }, '🏦 SalesSubscriber: New Sales Order logged for processing');
    
    // Potential side-effects:
    // 1. Send confirmation email to customer
    // 2. Notify warehouse manager of new DRAFT order
  }

  /**
   * React to a dispatch note being created
   */
  private static handleOrderDispatched(dispatch: any) {
    logger.info({ 
      dnId: dispatch.id, 
      dnNumber: dispatch.dnNumber 
    }, '💰 SalesSubscriber: Goods dispatched, triggering revenue recognition');

    // Emit finance event to decouple from SalesService
    eventBus.publish(FINANCE_EVENTS.REVENUE_RECOGNIZED, {
      entityId: dispatch.id,
      entityType: 'DISPATCH_NOTE',
      amount: dispatch.items?.reduce((sum: number, item: any) => sum + Number(item.totalCogs), 0) || 0,
      timestamp: new Date()
    });
  }
}
