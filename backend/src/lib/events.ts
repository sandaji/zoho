import { EventEmitter } from 'events';
import { logger } from './logger';

/**
 * Lightweight Domain Event Bus for service decoupling.
 * Uses Node.js EventEmitter for synchronous, in-process event handling.
 */
class DomainEventBus extends EventEmitter {
  private static instance: DomainEventBus;

  private constructor() {
    super();
    // Maximum listeners to avoid memory leak warnings
    this.setMaxListeners(20);
    
    this.on('error', (err) => {
      logger.error({ err }, 'Unhandled error in DomainEventBus');
    });
  }

  public static getInstance(): DomainEventBus {
    if (!DomainEventBus.instance) {
      DomainEventBus.instance = new DomainEventBus();
    }
    return DomainEventBus.instance;
  }

  /**
   * Publish a domain event to all subscribers
   */
  public publish(event: string, data: any): void {
    try {
      logger.debug({ event, data }, '📣 Domain Event Published');
      this.emit(event, data);
    } catch (err) {
      logger.error({ err, event }, 'Failed to publish domain event');
    }
  }

  /**
   * Subscribe to a domain event
   */
  public subscribe(event: string, handler: (data: any) => void): void {
    this.on(event, handler);
    logger.debug({ event }, '🔌 New subscriber registered for event');
  }
}

export const eventBus = DomainEventBus.getInstance();
