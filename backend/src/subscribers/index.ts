import { SalesSubscriber } from './sales.subscriber';
import { InventorySubscriber } from './inventory.subscriber';
import { logger } from '../lib/logger';

/**
 * Initialize all domain event subscribers.
 * This should be called once during application startup.
 */
export function initializeSubscribers() {
  try {
    logger.info('🔗 Initializing Domain Event Subscribers...');
    
    SalesSubscriber.initialize();
    InventorySubscriber.initialize();
    
    logger.info('✅ Domain Event Subscribers ready');
  } catch (err) {
    logger.error({ err }, 'Failed to initialize Domain Event Subscribers');
  }
}
