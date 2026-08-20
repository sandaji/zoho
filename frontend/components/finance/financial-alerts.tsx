"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, AlertTriangle, Info, ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchFinancialAlerts } from "@/app/dashboard/finance/lib/api";
import type { FinancialAlert, AlertSeverity } from "@/app/dashboard/finance/types";

const AlertIconMap: Record<AlertSeverity, React.ReactNode> = {
  critical: <AlertCircle className="h-5 w-5 text-destructive" />,
  warning:  <AlertTriangle className="h-5 w-5 text-warning" />,
  info:     <Info className="h-5 w-5 text-info" />,
};

const AlertColorMap: Record<AlertSeverity, string> = {
  critical: "bg-destructive/10 border-destructive/30",
  warning:  "bg-warning-muted border-warning-border",
  info:     "bg-info-muted border-info-border",
};

const AlertBadgeMap: Record<AlertSeverity, "destructive" | "warning" | "info"> = {
  critical: "destructive",
  warning:  "warning",
  info:     "info",
};

interface FinancialAlertsProps {
  maxAlerts?: number;
  onViewAll?: () => void;
}

export const FinancialAlerts = ({ maxAlerts = 4, onViewAll }: FinancialAlertsProps) => {
  const [alerts, setAlerts] = useState<FinancialAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAlerts = async () => {
    try {
      setError(null);
      const response = await fetchFinancialAlerts();
      if (response.success && response.data?.alerts) {
        setAlerts(response.data.alerts.slice(0, maxAlerts));
      } else {
        setError(response.error?.message || "Failed to load alerts");
      }
    } catch (err) {
      console.error("Error loading alerts:", err);
      setError("An error occurred while loading alerts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [maxAlerts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Alerts &amp; Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle>Alerts &amp; Notifications</CardTitle>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No alerts at this moment</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Your finances look good!</p>
          </div>
        ) : (
          <>
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  AlertColorMap[alert.severity]
                )}
              >
                <div className="flex gap-3">
                  <div className="shrink-0 mt-0.5">{AlertIconMap[alert.severity]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-foreground">{alert.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                      </div>
                      <Badge variant={AlertBadgeMap[alert.severity]} className="shrink-0">
                        {alert.severity}
                      </Badge>
                    </div>
                    {alert.actionUrl && alert.actionLabel && (
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-2 h-auto p-0 text-xs"
                        onClick={() => (window.location.href = alert.actionUrl!)}
                      >
                        {alert.actionLabel}
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {alerts.length > 0 && (
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={onViewAll}>
                View All Alerts
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
