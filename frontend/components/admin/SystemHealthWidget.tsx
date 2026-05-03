"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Users,
  Package,
  Truck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Server,
  Database,
  Wifi,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchSystemHealth, SystemHealthData } from "@/lib/admin-global-api";
import { useAdminBranch } from "@/lib/AdminBranchContext";
import { cn } from "@/lib/utils";

// ============================================================================
// COMPONENT
// ============================================================================

export function SystemHealthWidget() {
  const { token } = useAuth();
  const { permissions } = useAdminBranch();

  const [data, setData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check permissions
  if (!permissions.canViewSystemHealth) {
    return (
      <Card className="rounded-xl border border-red-100 bg-white shadow-sm">
        <CardContent className="py-12 text-center">
          <AlertCircle className="mx-auto mb-3 h-12 w-12 text-red-400" />
          <h3 className="text-base font-semibold text-slate-800">Access Denied</h3>
          <p className="mt-1 text-sm text-slate-500">
            You don't have permission to view system health.
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
      const healthData = await fetchSystemHealth(token);
      setData(healthData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load system health");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Safe data access
  const safeData = data || {
    health_score: 0,
    open_sessions: 0,
    pending_deliveries: 0,
    low_stock_items: 0,
    pending_approvals: 0,
    active_users: 0,
    active_branches: 0,
    api_status: "unknown",
    checked_at: new Date().toISOString(),
  };

  // Health score helpers
  const getHealthColor = (score: number) => {
    if (score >= 80) return { color: "emerald", label: "Healthy" };
    if (score >= 60) return { color: "yellow", label: "Warning" };
    return { color: "red", label: "Critical" };
  };

  const getHealthIcon = (score: number) => {
    if (score >= 80) return CheckCircle;
    if (score >= 60) return AlertTriangle;
    return XCircle;
  };

  const healthConfig = getHealthColor(safeData.health_score);
  const HealthIcon = getHealthIcon(safeData.health_score);

  // Status indicators
  const indicators = [
    {
      label: "API Status",
      value: safeData.api_status === "operational" ? "Online" : "Issues",
      icon: Wifi,
      color: safeData.api_status === "operational" ? "emerald" : "red",
      status: safeData.api_status,
    },
    {
      label: "Active Users",
      value: safeData.active_users.toString(),
      icon: Users,
      color: "blue",
    },
    {
      label: "Active Branches",
      value: safeData.active_branches.toString(),
      icon: Server,
      color: "purple",
    },
    {
      label: "Open Sessions",
      value: safeData.open_sessions.toString(),
      icon: Activity,
      color:
        safeData.open_sessions > 10 ? "red" : safeData.open_sessions > 5 ? "yellow" : "emerald",
    },
    {
      label: "Pending Deliveries",
      value: safeData.pending_deliveries.toString(),
      icon: Truck,
      color:
        safeData.pending_deliveries > 10
          ? "red"
          : safeData.pending_deliveries > 5
            ? "yellow"
            : "emerald",
    },
    {
      label: "Low Stock Items",
      value: safeData.low_stock_items.toString(),
      icon: Package,
      color:
        safeData.low_stock_items > 20
          ? "red"
          : safeData.low_stock_items > 10
            ? "yellow"
            : "emerald",
    },
  ];

  if (loading && !data) {
    return (
      <Card className="rounded-xl border border-emerald-100 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-emerald-900">System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-16 animate-pulse rounded-lg bg-emerald-50" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-emerald-50" />
              ))}
            </div>
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
          <Button
            onClick={loadData}
            variant="outline"
            className="mt-4 border-emerald-200 text-emerald-700"
          >
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
          <CardTitle className="text-lg font-bold text-emerald-900">System Health</CardTitle>
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
        {/* Overall Health Score */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-3">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full",
                healthConfig.color === "emerald"
                  ? "bg-emerald-100"
                  : healthConfig.color === "yellow"
                    ? "bg-yellow-100"
                    : "bg-red-100"
              )}
            >
              <HealthIcon
                className={cn(
                  "h-6 w-6",
                  healthConfig.color === "emerald"
                    ? "text-emerald-600"
                    : healthConfig.color === "yellow"
                      ? "text-yellow-600"
                      : "text-red-600"
                )}
              />
            </div>
            <div>
              <div className="text-3xl font-bold text-emerald-900">{safeData.health_score}%</div>
              <div className="text-sm text-emerald-600">{healthConfig.label}</div>
            </div>
          </div>

          <Progress value={safeData.health_score} className="h-2 w-full max-w-xs mx-auto" />

          <p className="text-xs text-slate-500 mt-2">
            Last checked: {new Date(safeData.checked_at).toLocaleTimeString()}
          </p>
        </div>

        {/* Status Indicators Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {indicators.map((indicator) => {
            const Icon = indicator.icon;
            return (
              <div
                key={indicator.label}
                className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      indicator.color === "emerald"
                        ? "bg-emerald-100"
                        : indicator.color === "red"
                          ? "bg-red-100"
                          : indicator.color === "yellow"
                            ? "bg-yellow-100"
                            : indicator.color === "blue"
                              ? "bg-blue-100"
                              : "bg-purple-100"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        indicator.color === "emerald"
                          ? "text-emerald-600"
                          : indicator.color === "red"
                            ? "text-red-600"
                            : indicator.color === "yellow"
                              ? "text-yellow-600"
                              : indicator.color === "blue"
                                ? "text-blue-600"
                                : "text-purple-600"
                      )}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-900">{indicator.label}</p>
                    <p className="text-xs text-emerald-600">{indicator.value}</p>
                  </div>
                </div>

                {/* Status badge for API */}
                {indicator.label === "API Status" && (
                  <Badge
                    variant={indicator.status === "operational" ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {indicator.value}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Health Insights */}
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-4">
          <h4 className="text-sm font-semibold text-emerald-900 mb-2">Health Insights</h4>
          <div className="space-y-1 text-xs text-emerald-700">
            {safeData.pending_deliveries > 10 && (
              <p>• High pending deliveries may indicate fleet or routing issues</p>
            )}
            {safeData.low_stock_items > 20 && (
              <p>• Multiple items are running low on stock across branches</p>
            )}
            {safeData.open_sessions > 10 && (
              <p>• Many open cashier sessions - consider session management</p>
            )}
            {safeData.health_score >= 80 && (
              <p>• System is operating normally with good health metrics</p>
            )}
            {safeData.health_score < 60 && (
              <p>• System health is degraded - immediate attention recommended</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
