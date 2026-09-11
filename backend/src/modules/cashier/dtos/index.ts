/**
 * DTO (Data Transfer Objects) for Cashier Session operations
 *
 * Defines the structure of request/response payloads for API endpoints.
 * Used for type safety and documentation.
 */

export interface OpenSessionRequestDTO {
  /**
   * Opening float amount (initial cash in register)
   * @example 1000
   */
  openingBalance: number;

  /**
   * Optional notes about the session opening
   * @example "Morning shift - new till"
   */
  notes?: string;
}

export interface OpenSessionResponseDTO {
  id: string;
  sessionNo: string;
  status: 'OPEN' | 'CLOSED' | 'DISCREPANCY' | 'RECONCILED';
  openingBalance: number;
  openedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
  branch: {
    id: string;
    name: string;
  };
}

export interface CloseSessionRequestDTO {
  /**
   * Actual physical cash counted in register
   * @example 2500
   */
  actualCash: number;

  /**
   * Optional notes about closing
   * @example "Evening shift - variance 50 KES (spill)"
   */
  notes?: string;
}

export interface CloseSessionResponseDTO {
  id: string;
  sessionNo: string;
  status: 'OPEN' | 'CLOSED' | 'DISCREPANCY' | 'RECONCILED';
  closingBalance: number;
  closedAt: Date;
  expectedCash: number;
  actualCash: number;
  cashVariance: number;
  totalSalesCount: number;
  totalSalesAmount: number;
  user: {
    id: string;
    name: string;
  };
}

export interface ReconcileSessionRequestDTO {
  /**
   * Optional notes about reconciliation (e.g., variance reason)
   * @example "Spill detected - 50 KES lost"
   */
  notes?: string;
}

export interface ReconcileSessionResponseDTO {
  id: string;
  sessionNo: string;
  status: 'OPEN' | 'CLOSED' | 'DISCREPANCY' | 'RECONCILED';
  reconciledAt: Date;
  cashVariance: number;
  totalSalesAmount: number;
  expectedCash: number;
  actualCash: number;
}

export interface SessionSummaryDTO {
  sessionNo: string;
  status: 'OPEN' | 'CLOSED' | 'DISCREPANCY' | 'RECONCILED';
  openedAt: Date;
  closedAt?: Date;
  reconciledAt?: Date;

  // Financial
  openingBalance: number;
  closingBalance?: number;
  totalSalesAmount: number;
  totalSalesCount: number;

  // Payment Methods
  totalCashReceived: number;
  totalCardReceived: number;
  totalMpesaReceived: number;
  totalOtherReceived: number;

  // Discrepancies
  expectedCash?: number;
  actualCash?: number;
  cashVariance?: number;
  variancePercent?: string;
  varianceStatus?: 'EXCELLENT' | 'ACCEPTABLE' | 'NEEDS_REVIEW' | 'CRITICAL';

  // Duration
  durationMinutes?: number;

  // Totals
  totalDiscounts: number;
  totalReturns: number;
}

export interface SessionListQueryDTO {
  /**
   * Filter by session status
   */
  status?: 'OPEN' | 'CLOSED' | 'DISCREPANCY' | 'RECONCILED';

  /**
   * Filter by branch ID
   */
  branchId?: string;

  /**
   * Filter by user ID
   */
  userId?: string;

  /**
   * Filter sessions from this date (ISO string)
   */
  fromDate?: string;

  /**
   * Filter sessions until this date (ISO string)
   */
  toDate?: string;

  /**
   * Page number (1-indexed)
   */
  page?: number;

  /**
   * Results per page
   */
  pageSize?: number;
}

export interface VarianceDetailsDTO {
  sessionNo: string;
  periodStart: Date;
  periodEnd?: Date;

  // Overall Variance
  overall: {
    expected: number;
    actual: number;
    variance: number;
    variancePercent: string;
  };

  // Cash-specific
  cash: {
    expected: number;
    actual: number;
    variance: number;
    variancePercent: string;
  };

  // By Payment Method
  byPaymentMethod: Record<string, { expected: number; actual: number; variance: number }>;

  // Sales Analysis
  analysis: {
    totalSales: number;
    largestSale: number;
    smallestSale: number;
    averageSale: string;
  };

  // Variance Assessment
  assessment: string;
}

export interface CurrentSessionResponseDTO extends OpenSessionResponseDTO {
  totalSalesCount: number;
  totalSalesAmount: number;
  totalCashReceived: number;
  totalCardReceived: number;
  totalMpesaReceived: number;
  totalOtherReceived: number;
  sales: Array<{
    id: string;
    docNo: string;
    total: number;
    paymentMethod: string;
    createdAt: Date;
  }>;
}
