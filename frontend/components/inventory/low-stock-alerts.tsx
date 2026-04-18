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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
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
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
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
          <div className="text-center py-8">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p>No stock alerts</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={`${alert.productId}-${alert.warehouseId}`}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-sm">{alert.productName}</h4>
                    <Badge className={getStatusColor(alert.status)}>
                      {alert.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>
                      Current Stock: <span className="font-semibold">{alert.currentStock}</span> /
                      Min: <span className="font-semibold">{alert.minStockLevel}</span>
                    </p>
                    <p>Warehouse: {alert.warehouseName}</p>
                    <p>Reorder Qty: {alert.reorderQuantity}</p>
                  </div>
                </div>
                <div className="ml-4">
                  <Button
                    onClick={() => handleCreateReorder(alert.productId, alert.warehouseId)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
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
