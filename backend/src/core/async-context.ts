import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  userId?: string;
  branchId?: string;
  role?: string;
  businessAction?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  /** Set by runWithoutBranchIsolation — db.ts skips branch isolation while true. */
  bypassBranchIsolation?: boolean;
}

export const asyncContext = new AsyncLocalStorage<RequestContext>();

export const getRequestContext = (): RequestContext => {
  return asyncContext.getStore() || {};
};

/**
 * Run `fn` with branch isolation switched off for the queries it makes.
 *
 * For internal, system-wide operations that must see EVERY branch even when a
 * branch user triggered them — chiefly document numbering, which counts rows to
 * choose the next number. A branch-filtered count hands two branches the same
 * number and trips the unique constraint.
 *
 * Keep the wrapped function tiny (just the count / lookup); never wrap code that
 * returns records to the user.
 */
export const runWithoutBranchIsolation = <T>(fn: () => Promise<T>): Promise<T> =>
  asyncContext.run(
    { ...(asyncContext.getStore() || {}), bypassBranchIsolation: true },
    fn,
  );

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
