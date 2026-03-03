"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Package, Plus, Minus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { warehouseService } from "@/lib/warehouse.service";

export default function InventoryPage() {
  const { token } = useAuth();
  const [inventory, setInventory] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [adjustmentDialog, setAdjustmentDialog] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({
    warehouseId: "",
    productId: "",
    quantity: 0,
    reason: "",
  });

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to load inventory");
      
      const data = await response.json();
      setInventory(data.data || []);

      // Load warehouses
      const warehouseRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/warehouse`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (warehouseRes.ok) {
        const whData = await warehouseRes.json();
        setWarehouses(whData.data || []);
      }
    } catch (error) {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustment = async () => {
    try {
      if (!adjustmentData.reason.trim()) {
        toast.error("Please provide a reason for adjustment");
        return;
      }

      await warehouseService.adjustStock(adjustmentData, token!);
      toast.success("Stock adjusted successfully");
      setAdjustmentDialog(false);
      setAdjustmentData({ warehouseId: "", productId: "", quantity: 0, reason: "" });
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to adjust stock");
    }
  };

  const filteredInventory = inventory.filter((item) => {
    const matchesWarehouse = selectedWarehouse === "all" || item.warehouseId === selectedWarehouse;
    const matchesSearch = item.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.product?.sku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesWarehouse && matchesSearch;
  });

  const getStockStatusColor = (available: number, reorderLevel: number) => {
    if (available === 0) return "text-red-600 bg-red-100";
    if (available <= reorderLevel) return "text-orange-600 bg-orange-100";
    return "text-green-600 bg-green-100";
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-gray-600">Manage stock levels across warehouses</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Product</th>
                  <th className="text-left p-3">SKU</th>
                  <th className="text-left p-3">Warehouse</th>
                  <th className="text-right p-3">Quantity</th>
                  <th className="text-right p-3">Available</th>
                  <th className="text-right p-3">Reserved</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-center p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{item.product?.name}</td>
                    <td className="p-3 text-gray-600">{item.product?.sku}</td>
                    <td className="p-3 text-gray-600">{item.warehouse?.name}</td>
                    <td className="p-3 text-right font-semibold">{item.quantity}</td>
                    <td className="p-3 text-right">{item.available}</td>
                    <td className="p-3 text-right">{item.reserved}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStockStatusColor(item.available, item.product?.reorder_level || 10)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <Dialog open={adjustmentDialog && adjustmentData.productId === item.productId} onOpenChange={setAdjustmentDialog}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAdjustmentData({
                                warehouseId: item.warehouseId,
                                productId: item.productId,
                                quantity: 0,
                                reason: "",
                              });
                              setAdjustmentDialog(true);
                            }}
                          >
                            Adjust
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Adjust Stock</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">Adjustment</label>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => setAdjustmentData({...adjustmentData, quantity: adjustmentData.quantity - 1})}
                                >
                                  <Minus size={16} />
                                </Button>
                                <Input
                                  type="number"
                                  value={adjustmentData.quantity}
                                  onChange={(e) => setAdjustmentData({...adjustmentData, quantity: parseInt(e.target.value) || 0})}
                                  className="text-center"
                                />
                                <Button
                                  variant="outline"
                                  onClick={() => setAdjustmentData({...adjustmentData, quantity: adjustmentData.quantity + 1})}
                                >
                                  <Plus size={16} />
                                </Button>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Positive: Add stock | Negative: Remove stock
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Reason *</label>
                              <Input
                                placeholder="e.g., Damaged goods, Returns, etc."
                                value={adjustmentData.reason}
                                onChange={(e) => setAdjustmentData({...adjustmentData, reason: e.target.value})}
                              />
                            </div>
                            <Button onClick={handleAdjustment} className="w-full">
                              Confirm Adjustment
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredInventory.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Package size={48} className="mx-auto mb-4 opacity-50" />
                <p>No inventory found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
