"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";

interface LowStockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minStockLevel: number;
  reorderQuantity: number;
  warehouseId: string;
  warehouseName: string;
  status: "critical" | "warning" | "normal";
}

export function LowStockAlerts() {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const { showToast } = useToast();

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const params = showCriticalOnly ? "?critical=true" : "";
      const response = await apiClient.request<LowStockAlert[]>(
        `/v1/inventory/alerts${params}`,
        "GET"
      );

      if (response.success && response.data) {
        setAlerts(response.data);
      } else {
        showToast("Error", response.error?.message || "Failed to fetch alerts", "error");
      }
    } catch (error) {
      showToast("Error", "Failed to fetch alerts", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateReorder = async (productId: string, warehouseId: string) => {
    try {
      const response = await apiClient.request("/v1/inventory/alerts/reorder", "POST", {
        productId,
        warehouseId,
      });

      if (response.success) {
        showToast("Success", "Reorder created successfully", "success");
        fetchAlerts();
      } else {
        showToast("Error", response.error?.message || "Failed to create reorder", "error");
      }
    } catch (error) {
      showToast("Error", "Failed to create reorder", "error");
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [showCriticalOnly]);

  const getStatusBadgeVariant = (status: string): "destructive" | "warning" | "secondary" => {
    switch (status) {
      case "critical": return "destructive";
      case "warning":  return "warning";
      default:         return "secondary";
    }
  };

  const criticalCount = alerts.filter((a) => a.status === "critical").length;
  const warningCount = alerts.filter((a) => a.status === "warning").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>
              {criticalCount} critical, {warningCount} warnings
            </CardDescription>
          </div>
          <Button
            variant={showCriticalOnly ? "default" : "outline"}
            onClick={() => setShowCriticalOnly(!showCriticalOnly)}
            size="sm"
          >
            {showCriticalOnly ? "Show All" : "Critical Only"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm">No stock alerts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={`${alert.productId}-${alert.warehouseId}`}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h4 className="font-medium text-sm text-foreground">{alert.productName}</h4>
                    <Badge variant={getStatusBadgeVariant(alert.status)}>
                      {alert.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>
                      Stock: <span className="font-semibold text-foreground">{alert.currentStock}</span>{" "}
                      / Min: <span className="font-semibold text-foreground">{alert.minStockLevel}</span>
                    </p>
                    <p>Warehouse: {alert.warehouseName}</p>
                    <p>Reorder Qty: {alert.reorderQuantity}</p>
                  </div>
                </div>
                <div className="ml-4">
                  <Button
                    onClick={() => handleCreateReorder(alert.productId, alert.warehouseId)}
                    size="sm"
                  >
                    Create Reorder
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
