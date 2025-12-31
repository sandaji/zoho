import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const asyncContext = new AsyncLocalStorage<RequestContext>();

export const getRequestContext = (): RequestContext => {
  return asyncContext.getStore() || {};
};
