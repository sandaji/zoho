"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { warehouseService } from "@/lib/warehouse.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingDown, AlertTriangle, BarChart3, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function WarehouseDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, movementsRes] = await Promise.all([
        warehouseService.getWarehouseStats(undefined, token!),
        warehouseService.getStockMovements({ page: 1, limit: 10 }, token!),
      ]);

      setStats(statsRes.data);
      setMovements(movementsRes.data);
    } catch (error) {
      toast.error("Failed to load warehouse data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getMovementTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      INBOUND: "text-green-600 bg-green-100",
      OUTBOUND: "text-red-600 bg-red-100",
      TRANSFER_IN: "text-blue-600 bg-blue-100",
      TRANSFER_OUT: "text-orange-600 bg-orange-100",
      ADJUSTMENT: "text-purple-600 bg-purple-100",
    };
    return colors[type] || "text-gray-600 bg-gray-100";
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Warehouse Management</h1>
          <p className="text-gray-600 mt-1">Monitor inventory and stock movements</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/warehouse/transfers"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Manage Transfers
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Products</CardTitle>
            <Package className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Active products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Stock Value</CardTitle>
            <BarChart3 className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalValue?.toLocaleString() || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Units in stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Low Stock Items</CardTitle>
            <TrendingDown className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.lowStockCount || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Need reordering</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Out of Stock</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.outOfStockCount || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Movements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Stock Movements</CardTitle>
          <Link
            href="/dashboard/inventory"
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View All <ArrowRight size={16} />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {movements.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No recent movements</p>
            ) : (
              movements.map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getMovementTypeColor(movement.type)}`}>
                      {movement.type.replace("_", " ")}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{movement.product?.name}</p>
                      <p className="text-sm text-gray-500">
                        {movement.warehouse?.name} • SKU: {movement.product?.sku}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{movement.quantity} units</p>
                    <p className="text-xs text-gray-500">
                      {new Date(movement.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/inventory">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <Package className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-lg mb-2">View Inventory</h3>
              <p className="text-sm text-gray-600">Check stock levels across warehouses</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/warehouse/transfers">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <ArrowRight className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-lg mb-2">Manage Transfers</h3>
              <p className="text-sm text-gray-600">Transfer stock between locations</p>
            </CardContent>
          </Card>
        </Link>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => toast.info("Coming soon")}>
          <CardContent className="pt-6">
            <BarChart3 className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-semibold text-lg mb-2">Stock Reports</h3>
            <p className="text-sm text-gray-600">Generate detailed stock reports</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
