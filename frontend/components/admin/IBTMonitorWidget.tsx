"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Truck,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchIBTMonitor, IBTMonitorData, IBTTransfer } from "@/lib/admin-global-api";
import { useAdminBranch } from "@/lib/AdminBranchContext";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// ============================================================================
// COMPONENT
// ============================================================================

export function IBTMonitorWidget() {
  const { token } = useAuth();
  const { permissions } = useAdminBranch();

  const [data, setData] = useState<IBTMonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check permissions
  if (!permissions.canViewIBT) {
    return (
      <Card className="rounded-xl border border-red-100 bg-white shadow-sm">
        <CardContent className="py-12 text-center">
          <AlertCircle className="mx-auto mb-3 h-12 w-12 text-red-400" />
          <h3 className="text-base font-semibold text-slate-800">Access Denied</h3>
          <p className="mt-1 text-sm text-slate-500">
            You don't have permission to view IBT data.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Load data
  const loadData = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const ibtData = await fetchIBTMonitor(token);
      setData(ibtData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load IBT data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Safe data access
  const safeData = data || {
    summary: { pending: 0, in_transit: 0, pending_receipt: 0, discrepancy: 0 },
    transfers: [],
  };

  // Status helpers
  const getStatusBadge = (status: IBTTransfer['status']) => {
    const variants = {
      PENDING: { variant: "secondary" as const, icon: Clock, label: "Pending" },
      IN_TRANSIT: { variant: "default" as const, icon: Truck, label: "In Transit" },
      PENDING_RECEIPT: { variant: "outline" as const, icon: Package, label: "Pending Receipt" },
      COMPLETED: { variant: "default" as const, icon: CheckCircle, label: "Completed" },
      CANCELLED: { variant: "destructive" as const, icon: AlertTriangle, label: "Cancelled" },
      DISCREPANCY: { variant: "destructive" as const, icon: AlertTriangle, label: "Discrepancy" },
    };

    const config = variants[status] || variants.PENDING;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading && !data) {
    return (
      <Card className="rounded-xl border border-emerald-100 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-emerald-900">
            Inter-Branch Transfers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-emerald-50" />
              ))}
            </div>
            <div className="h-48 animate-pulse rounded-lg bg-emerald-50" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card className="rounded-xl border border-red-100 bg-white shadow-sm">
        <CardContent className="py-12 text-center">
          <AlertCircle className="mx-auto mb-3 h-12 w-12 text-red-400" />
          <h3 className="text-base font-semibold text-slate-800">Failed to Load Data</h3>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <Button onClick={loadData} variant="outline" className="mt-4 border-emerald-200 text-emerald-700">
            <RefreshCw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totalActiveTransfers = safeData.summary.pending + safeData.summary.in_transit + safeData.summary.pending_receipt;

  return (
    <Card className="rounded-xl border border-emerald-100 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-emerald-900">
            Inter-Branch Transfers
          </CardTitle>
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            disabled={loading}
            className="gap-2 border-emerald-200 text-emerald-700"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-900">{safeData.summary.pending}</p>
                <p className="text-xs text-yellow-700">Pending</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">{safeData.summary.in_transit}</p>
                <p className="text-xs text-blue-700">In Transit</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-900">{safeData.summary.pending_receipt}</p>
                <p className="text-xs text-purple-700">Pending Receipt</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-900">{safeData.summary.discrepancy}</p>
                <p className="text-xs text-red-700">Discrepancies</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Transfers Table */}
        {totalActiveTransfers > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-emerald-900 mb-3">
              Active Transfers ({totalActiveTransfers})
            </h4>
            <div className="rounded-lg border border-emerald-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-emerald-100 bg-emerald-50/50">
                    <TableHead className="text-emerald-700">Transfer</TableHead>
                    <TableHead className="text-emerald-700">From → To</TableHead>
                    <TableHead className="text-emerald-700">Items</TableHead>
                    <TableHead className="text-emerald-700">Status</TableHead>
                    <TableHead className="text-emerald-700">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safeData.transfers
                    .filter(t => ['PENDING', 'IN_TRANSIT', 'PENDING_RECEIPT', 'DISCREPANCY'].includes(t.status))
                    .slice(0, 10)
                    .map((transfer) => (
                      <TableRow key={transfer.id} className="border-emerald-50 hover:bg-emerald-50/50">
                        <TableCell>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              #{transfer.id.slice(-8)}
                            </p>
                            <p className="text-xs text-slate-500">
                              by {transfer.createdBy.name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="text-xs">
                              <span className="font-medium text-slate-700">
                                {transfer.sourceWarehouse.branch.code}
                              </span>
                              <span className="text-slate-500"> → </span>
                              <span className="font-medium text-slate-700">
                                {transfer.targetWarehouse.branch.code}
                              </span>
                            </div>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {transfer.sourceWarehouse.name} → {transfer.targetWarehouse.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-800">
                            {transfer.items.length} item{transfer.items.length !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-slate-500">
                            {transfer.items.slice(0, 2).map(item => item.product.name).join(', ')}
                            {transfer.items.length > 2 && ` +${transfer.items.length - 2} more`}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transfer.status)}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-slate-600">
                            {formatDistanceToNow(new Date(transfer.createdAt), { addSuffix: true })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {totalActiveTransfers === 0 && (
          <div className="py-12 text-center">
            <Truck className="mx-auto mb-3 h-12 w-12 text-emerald-200" />
            <h3 className="text-base font-semibold text-emerald-900">No Active Transfers</h3>
            <p className="mt-1 text-sm text-emerald-500">
              All inter-branch transfers are currently completed.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}