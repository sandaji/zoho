import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  userId?: string;
  branchId?: string;
  role?: string;
  businessAction?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

export const asyncContext = new AsyncLocalStorage<RequestContext>();

export const getRequestContext = (): RequestContext => {
  return asyncContext.getStore() || {};
};

/**
 * Set the business action and metadata for the current request context
 */
export const setBusinessAction = (action: string, metadata?: any) => {
  const store = asyncContext.getStore();
  if (store) {
    store.businessAction = action;
    if (metadata) {
      store.metadata = { ...(store.metadata || {}), ...metadata };
    }
  }
};
