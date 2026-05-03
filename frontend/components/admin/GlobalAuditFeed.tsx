"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield,
  User,
  Package,
  DollarSign,
  Settings,
  RefreshCw,
  AlertCircle,
  Eye,
  Plus,
  Trash2,
  Edit,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchAuditLogs, AuditLogsResponse } from "@/lib/admin-global-api";
import { useAdminBranch } from "@/lib/AdminBranchContext";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// ============================================================================
// COMPONENT
// ============================================================================

export function GlobalAuditFeed() {
  const { token } = useAuth();
  const { permissions } = useAdminBranch();

  const [data, setData] = useState<AuditLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check permissions
  if (!permissions.canViewAuditFeed) {
    return (
      <Card className="rounded-xl border border-red-100 bg-white shadow-sm">
        <CardContent className="py-12 text-center">
          <AlertCircle className="mx-auto mb-3 h-12 w-12 text-red-400" />
          <h3 className="text-base font-semibold text-slate-800">Access Denied</h3>
          <p className="mt-1 text-sm text-slate-500">
            You don't have permission to view audit logs.
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
      // Fetch high-value actions: voids, large purchases, price changes, etc.
      const auditData = await fetchAuditLogs(token, {
        limit: 20,
        highValue: true,
      });
      setData(auditData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Safe data access
  const safeData = data || { logs: [], total: 0, page: 1, limit: 20 };

  // Action type helpers
  const getActionIcon = (action: string) => {
    const icons = {
      CREATE: Plus,
      UPDATE: Edit,
      DELETE: Trash2,
      VOID: Trash2,
      APPROVE: Shield,
      REJECT: AlertCircle,
    };
    return icons[action as keyof typeof icons] || Settings;
  };

  const getActionColor = (action: string) => {
    const colors = {
      CREATE: "text-green-600 bg-green-100",
      UPDATE: "text-blue-600 bg-blue-100",
      DELETE: "text-red-600 bg-red-100",
      VOID: "text-red-600 bg-red-100",
      APPROVE: "text-emerald-600 bg-emerald-100",
      REJECT: "text-orange-600 bg-orange-100",
    };
    return colors[action as keyof typeof colors] || "text-slate-600 bg-slate-100";
  };

  const getEntityIcon = (entityType: string) => {
    const icons = {
      User: User,
      Product: Package,
      Sale: DollarSign,
      Purchase: DollarSign,
      Inventory: Package,
      Branch: Shield,
      Role: Shield,
      Permission: Shield,
    };
    return icons[entityType as keyof typeof icons] || Settings;
  };

  // Filter for high-value actions
  const highValueActions = ['VOID', 'DELETE', 'APPROVE', 'REJECT'];
  const filteredLogs = safeData.logs.filter(log =>
    highValueActions.includes(log.action) ||
    log.entityType === 'Sale' && log.action === 'CREATE' && log.changes?.total > 1000 ||
    log.entityType === 'Product' && log.action === 'UPDATE' && log.changes?.unit_price
  );

  if (loading && !data) {
    return (
      <Card className="rounded-xl border border-emerald-100 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-emerald-900">
            Global Audit Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-emerald-50" />
            ))}
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

  return (
    <Card className="rounded-xl border border-emerald-100 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-emerald-900">
            Global Audit Feed
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {filteredLogs.length} high-value actions
            </Badge>
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
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-96">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center">
              <Shield className="mx-auto mb-3 h-12 w-12 text-emerald-200" />
              <h3 className="text-base font-semibold text-emerald-900">No High-Value Actions</h3>
              <p className="mt-1 text-sm text-emerald-500">
                No significant audit events in the recent period.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const ActionIcon = getActionIcon(log.action);
                const EntityIcon = getEntityIcon(log.entityType);

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50/30 p-3 hover:bg-emerald-50/50 transition-colors"
                  >
                    {/* Action Badge */}
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      getActionColor(log.action)
                    )}>
                      <ActionIcon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <EntityIcon className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-semibold text-emerald-900">
                          {log.entityType} {log.action.toLowerCase()}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          #{log.entityId.slice(-8)}
                        </Badge>
                      </div>

                      <p className="text-sm text-slate-700 mb-2">
                        {log.user ? (
                          <>
                            by <span className="font-medium">{log.user.name}</span>
                            {log.user.email !== log.user.name && (
                              <span className="text-slate-500"> ({log.user.email})</span>
                            )}
                          </>
                        ) : (
                          "by system"
                        )}
                      </p>

                      {/* Changes summary for high-value updates */}
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div className="text-xs text-slate-500 bg-white rounded px-2 py-1 border">
                          {Object.entries(log.changes).slice(0, 3).map(([key, value]) => (
                            <span key={key} className="mr-2">
                              {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          ))}
                          {Object.keys(log.changes).length > 3 && (
                            <span className="text-slate-400">+{Object.keys(log.changes).length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}