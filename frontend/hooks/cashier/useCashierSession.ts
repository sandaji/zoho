'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

/**
 * Cashier Session Data Structure
 */
export interface CashierSession {
  id: string;
  sessionNumber: string;
  userId: string;
  branchId: string;
  status: 'OPEN' | 'CLOSED' | 'DISCREPANCY' | 'RECONCILED';
  openingBalance: number;
  actualCash?: number;
  expectedCash: number;
  variance?: number;
  variancePercentage?: number;
  totalSales: number;
  salesCount: number;
  paymentMethods: Record<string, number>;
  openedAt: string;
  closedAt?: string;
  reconciliedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook response type
 */
export interface CashierSessionHookState {
  session: CashierSession | null;
  isLoading: boolean;
  error: string | null;
  openSession: (openingBalance: number, notes?: string) => Promise<CashierSession>;
  closeSession: (actualCash: number, notes?: string) => Promise<CashierSession>;
  reconcileSession: (notes?: string) => Promise<CashierSession>;
  refetch: () => Promise<void>;
}

/**
 * Hook for managing cashier sessions
 *
 * Handles:
 * - Fetching current active session
 * - Opening new sessions
 * - Closing sessions
 * - Reconciling sessions
 * - Error states and loading states
 *
 * @returns {CashierSessionHookState} Session state and methods
 */
export function useCashierSession(): CashierSessionHookState {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [session, setSession] = useState<CashierSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch current session from API
   */
  const refetch = useCallback(async () => {
    // Wait for auth to initialize
    if (authLoading) return;

    // If no token, redirect to login implies we can't fetch.
    if (!token) {
      setIsLoading(false);
      // Safe to redirect as the original code enforced it on 401
      router.push('/auth/login');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/cashier/sessions/current', {
        method: 'GET',
        headers,
      });

      if (response.status === 401) {
        // Unauthorized - redirect to login
        router.push('/auth/login');
        return;
      }

      if (!response.ok) {
        // No active session or error
        if (response.status === 404) {
          setSession(null);
        } else {
          const data = await response.json();
          setError(data.message || 'Failed to fetch session');
        }
        return;
      }

      const data = await response.json();
      setSession(data.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch session'
      );
    } finally {
      setIsLoading(false);
    }
  }, [router, token, authLoading]);

  /**
   * Open a new cashier session
   */
  const openSession = useCallback(
    async (openingBalance: number, notes?: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/cashier/sessions/open', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            openingBalance,
            notes,
          }),
        });

        if (response.status === 401) {
          router.push('/auth/login');
          throw new Error('Unauthorized');
        }

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to open session');
        }

        const data = await response.json();
        setSession(data.data);
        return data.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to open session';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [router, token]
  );

  /**
   * Close current session and calculate variance
   */
  const closeSession = useCallback(
    async (actualCash: number, notes?: string) => {
      try {
        if (!session) {
          throw new Error('No active session');
        }

        setIsLoading(true);
        setError(null);

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(
          `/api/cashier/sessions/${session.id}/close`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              actualCash,
              notes,
            }),
          }
        );

        if (response.status === 401) {
          router.push('/auth/login');
          throw new Error('Unauthorized');
        }

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to close session');
        }

        const data = await response.json();
        setSession(data.data);
        return data.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to close session';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [session, router, token]
  );

  /**
   * Reconcile session (manager only)
   */
  const reconcileSession = useCallback(
    async (notes?: string) => {
      try {
        if (!session) {
          throw new Error('No active session');
        }

        setIsLoading(true);
        setError(null);

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(
          `/api/cashier/sessions/${session.id}/reconcile`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              notes,
            }),
          }
        );

        if (response.status === 401) {
          router.push('/auth/login');
          throw new Error('Unauthorized');
        }

        if (response.status === 403) {
          throw new Error('Permission denied - manager only');
        }

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to reconcile session');
        }

        const data = await response.json();
        setSession(data.data);
        return data.data;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to reconcile session';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [session, router, token]
  );

  /**
   * Fetch session on mount
   */
  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    session,
    isLoading,
    error,
    openSession,
    closeSession,
    reconcileSession,
    refetch,
  };
}
