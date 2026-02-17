'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import type { CashierSession } from '@/hooks/cashier/useCashierSession';

export interface SessionStatusCardProps {
  /**
   * Current cashier session data
   */
  session: CashierSession | null;

  /**
   * Whether data is loading
   */
  isLoading?: boolean;

  /**
   * Callback when user wants to close session
   */
  onCloseClick?: () => void;

  /**
   * Callback when user wants to reconcile session
   */
  onReconcileClick?: () => void;
}

/**
 * Card component displaying current cashier session status
 *
 * Shows:
 * - Session status badge
 * - Opening balance
 * - Current sales total
 * - Expected vs actual cash
 * - Variance percentage
 * - Payment method breakdown
 * - Action buttons
 *
 * @component
 */
export function SessionStatusCard({
  session,
  isLoading = false,
  onCloseClick,
  onReconcileClick,
}: SessionStatusCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cashier Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">Loading session...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cashier Session</CardTitle>
          <CardDescription>No active session</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
            <p className="text-gray-600">
              You need to open a session before starting transactions.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * Get status badge color
   */
  const getStatusBadge = () => {
    switch (session.status) {
      case 'OPEN':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'CLOSED':
        return <Badge className="bg-blue-500">Closed</Badge>;
      case 'DISCREPANCY':
        return <Badge className="bg-yellow-500">Discrepancy</Badge>;
      case 'RECONCILED':
        return <Badge className="bg-gray-500">Reconciled</Badge>;
      default:
        return <Badge>{session.status}</Badge>;
    }
  };

  /**
   * Get variance color based on amount
   */
  const getVarianceColor = () => {
    if (!session.variance) return 'text-gray-600';
    if (Math.abs(session.variance) < 100) return 'text-green-600';
    if (Math.abs(session.variance) < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  /**
   * Format currency
   */
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
    }).format(value);
  };

  /**
   * Format time
   */
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-KE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cashier Session: {session.sessionNumber}
            </CardTitle>
            <CardDescription>
              Session opened at {formatTime(session.openedAt)}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Opening Balance Section */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border-r pr-4">
            <p className="text-sm text-gray-600 mb-1">Opening Balance</p>
            <p className="text-2xl font-bold">
              {formatCurrency(session.openingBalance)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Sales Total</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(session.totalSales)}
            </p>
          </div>
        </div>

        {/* Sales Count Section */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Transactions</p>
            <p className="text-lg font-semibold">{session.salesCount}</p>
          </div>
        </div>

        {/* Expected vs Actual Cash */}
        {session.status !== 'OPEN' && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-semibold text-sm">Reconciliation</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Expected Cash</p>
                <p className="font-semibold">{formatCurrency(session.expectedCash)}</p>
              </div>
              {session.actualCash !== undefined && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Actual Cash</p>
                  <p className="font-semibold">{formatCurrency(session.actualCash)}</p>
                </div>
              )}
            </div>

            {/* Variance Display */}
            {session.variance !== undefined && (
              <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${getVarianceColor()}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {Math.abs(session.variance) > 500 ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <TrendingUp className="h-4 w-4" />
                    )}
                    <span className="text-sm">Cash Variance</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(session.variance)}</p>
                    <p className="text-xs">
                      {session.variancePercentage?.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payment Methods Breakdown */}
        {session.paymentMethods && Object.keys(session.paymentMethods).length > 0 && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-semibold text-sm">Payment Methods</h4>
            <div className="space-y-2">
              {Object.entries(session.paymentMethods).map(([method, amount]) => (
                <div key={method} className="flex justify-between text-sm">
                  <span className="text-gray-600 capitalize">{method}</span>
                  <span className="font-semibold">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {session.notes && (
          <div className="bg-gray-50 rounded-lg p-3 border-t pt-4">
            <p className="text-xs text-gray-600 mb-1">Notes</p>
            <p className="text-sm">{session.notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        {session.status === 'OPEN' && (
          <div className="flex gap-2 border-t pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onCloseClick}
            >
              <Clock className="mr-2 h-4 w-4" />
              Close Session
            </Button>
          </div>
        )}

        {session.status === 'CLOSED' && (
          <div className="flex gap-2 border-t pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onReconcileClick}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Reconcile
            </Button>
          </div>
        )}

        {(session.status === 'DISCREPANCY' || session.status === 'RECONCILED') && (
          <div className="border-t pt-4">
            <Badge
              variant={
                session.status === 'RECONCILED' ? 'default' : 'secondary'
              }
              className="w-full justify-center py-2"
            >
              {session.status === 'RECONCILED'
                ? 'Session Reconciled'
                : 'Pending Reconciliation'}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
