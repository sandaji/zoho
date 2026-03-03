"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { warehouseService } from "@/lib/warehouse.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, ArrowRight, PackagePlus, ArrowRightLeft, Layers, Truck, ClipboardList } from "lucide-react";
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
      INBOUND: "text-emerald-700 bg-emerald-100",
      OUTBOUND: "text-slate-700 bg-slate-100",
      TRANSFER_IN: "text-emerald-700 bg-emerald-100",
      TRANSFER_OUT: "text-yellow-700 bg-yellow-100",
      IN_TRANSIT: "text-yellow-700 bg-yellow-100",
      ADJUSTMENT: "text-orange-700 bg-orange-100",
    };
    return colors[type] || "text-slate-600 bg-slate-100";
  };

  if (loading) {
    return (
      <div className="p-6 bg-emerald-50/30 min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-emerald-100 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-emerald-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-emerald-50/30 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Warehouse Management</h1>
          <p className="text-slate-600 mt-1">Monitor multi-branch inventory and stock movements</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/warehouse/transfers"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Manage Transfers
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Units on Hand</CardTitle>
            <Package className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats?.totalUnitsOnHand || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Available in active bins</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Units In-Transit</CardTitle>
            <Truck className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.unitsInTransit || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Pending arrival</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pending GRN</CardTitle>
            <ClipboardList className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats?.pendingGRN || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Awaiting put-away</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Stock Alerts (OOS)</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.stockAlerts || stats?.outOfStockCount || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Critical discrepancies/OOS</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Movements */}
      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Stock Movements</CardTitle>
          <Link
            href="/dashboard/inventory"
            className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            View Ledger <ArrowRight size={16} />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {movements.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No recent movements</p>
            ) : (
              movements.map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between p-4 border border-emerald-100 rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getMovementTypeColor(movement.type)}`}>
                      {movement.type.replace("_", " ")}
                    </span>
                    <div>
                      <p className="font-medium text-slate-900">{movement.product?.name}</p>
                      <p className="text-sm text-slate-500">
                        {movement.warehouse?.name} • SKU: {movement.product?.sku}
                        {movement.bin?.code && ` • Bin: ${movement.bin.code}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{movement.quantity > 0 ? "+" : ""}{movement.quantity} units</p>
                    <p className="text-xs text-slate-500">
                      {new Date(movement.createdAt).toLocaleString()}
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
        <Link href="/dashboard/warehouse/receipts">
          <Card className="bg-white hover:shadow-md transition-shadow cursor-pointer border-emerald-100 hover:border-emerald-300">
            <CardContent className="pt-6">
              <PackagePlus className="h-8 w-8 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-lg text-slate-900 mb-2">Receive Goods (GRN)</h3>
              <p className="text-sm text-slate-600">Process incoming deliveries to staging</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/warehouse/transfers/new">
          <Card className="bg-white hover:shadow-md transition-shadow cursor-pointer border-emerald-100 hover:border-emerald-300">
            <CardContent className="pt-6">
              <ArrowRightLeft className="h-8 w-8 text-yellow-600 mb-3" />
              <h3 className="font-semibold text-lg text-slate-900 mb-2">Transfer Stock</h3>
              <p className="text-sm text-slate-600">Initiate inter-branch or zone transfers</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/warehouse/bins">
          <Card className="bg-white hover:shadow-md transition-shadow cursor-pointer border-emerald-100 hover:border-emerald-300">
            <CardContent className="pt-6">
              <Layers className="h-8 w-8 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-lg text-slate-900 mb-2">Bin Management & Put-away</h3>
              <p className="text-sm text-slate-600">Move items from inbound to final storage</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
