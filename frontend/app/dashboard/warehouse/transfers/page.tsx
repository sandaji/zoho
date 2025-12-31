"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Package, ArrowRight, Loader2, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { warehouseService } from "@/lib/warehouse.service";

export default function TransfersPage() {
  const { token } = useAuth();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTransfer, setShowNewTransfer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [transferForm, setTransferForm] = useState({
    sourceId: "",
    targetId: "",
    items: [] as Array<{ productId: string; quantity: number }>,
    notes: "",
  });

  const [itemSearch, setItemSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [itemQuantity, setItemQuantity] = useState(1);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 50 };
      if (statusFilter !== "all") params.status = statusFilter;

      const [transfersRes, warehousesRes, productsRes] = await Promise.all([
        warehouseService.getTransfers(params, token!),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/warehouse`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/products?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setTransfers(transfersRes.data || []);
      
      if (warehousesRes.ok) {
        const whData = await warehousesRes.json();
        setWarehouses(whData.data || []);
      }

      if (productsRes.ok) {
        const prodData = await productsRes.json();
        setProducts(prodData.data?.products || prodData.data || []);
      }
    } catch (error) {
      toast.error("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransfer = async () => {
    try {
      if (!transferForm.sourceId || !transferForm.targetId) {
        toast.error("Please select source and target warehouses");
        return;
      }

      if (transferForm.items.length === 0) {
        toast.error("Please add at least one item");
        return;
      }

      setSubmitting(true);
      await warehouseService.createTransfer(transferForm, token!);
      toast.success("Transfer created successfully");
      setShowNewTransfer(false);
      setTransferForm({ sourceId: "", targetId: "", items: [], notes: "" });
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiveTransfer = async (id: string) => {
    try {
      await warehouseService.fulfillTransfer(id, token!);
      toast.success("Transfer received successfully");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to receive transfer");
    }
  };

  const addItemToTransfer = () => {
    if (!selectedProduct || itemQuantity <= 0) {
      toast.error("Please select a product and quantity");
      return;
    }

    const exists = transferForm.items.find(i => i.productId === selectedProduct.id);
    if (exists) {
      toast.error("Product already added");
      return;
    }

    setTransferForm({
      ...transferForm,
      items: [...transferForm.items, { productId: selectedProduct.id, quantity: itemQuantity }],
    });
    
    setSelectedProduct(null);
    setItemQuantity(1);
    setItemSearch("");
  };

  const removeItem = (productId: string) => {
    setTransferForm({
      ...transferForm,
      items: transferForm.items.filter(i => i.productId !== productId),
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      IN_TRANSIT: "bg-blue-100 text-blue-800",
      COMPLETED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(itemSearch.toLowerCase())
  );

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock Transfers</h1>
          <p className="text-gray-600">Transfer inventory between warehouses</p>
        </div>
        <Button onClick={() => setShowNewTransfer(true)}>
          <Plus size={20} className="mr-2" />
          New Transfer
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            {["all", "PENDING", "IN_TRANSIT", "COMPLETED", "CANCELLED"].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {status === "all" ? "All" : status.replace("_", " ")}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transfers List */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transfers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package size={48} className="mx-auto mb-4 opacity-50" />
                <p>No transfers found</p>
              </div>
            ) : (
              transfers.map((transfer) => (
                <div key={transfer.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{transfer.transferNo}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transfer.status)}`}>
                          {transfer.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(transfer.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {(transfer.status === "PENDING" || transfer.status === "IN_TRANSIT") && (
                      <Button
                        onClick={() => handleReceiveTransfer(transfer.id)}
                        size="sm"
                      >
                        Receive Transfer
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-500">From</p>
                      <p className="font-medium">{transfer.sourceWarehouse?.name}</p>
                      <p className="text-xs text-gray-600">{transfer.sourceWarehouse?.branch?.name}</p>
                    </div>
                    <ArrowRight className="text-gray-400" />
                    <div className="flex-1 bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-500">To</p>
                      <p className="font-medium">{transfer.targetWarehouse?.name}</p>
                      <p className="text-xs text-gray-600">{transfer.targetWarehouse?.branch?.name}</p>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-2">Items ({transfer.items?.length || 0})</p>
                    <div className="space-y-1">
                      {transfer.items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.product?.name}</span>
                          <span className="font-medium">{item.quantity} units</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* New Transfer Dialog */}
      <Dialog open={showNewTransfer} onOpenChange={setShowNewTransfer}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Source Warehouse *</label>
                <select
                  value={transferForm.sourceId}
                  onChange={(e) => setTransferForm({...transferForm, sourceId: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select source</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Target Warehouse *</label>
                <select
                  value={transferForm.targetId}
                  onChange={(e) => setTransferForm({...transferForm, targetId: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select target</option>
                  {warehouses.filter(wh => wh.id !== transferForm.sourceId).map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Add Items</label>
              <div className="flex gap-2 mb-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    placeholder="Search products..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="pl-9"
                  />
                  {itemSearch && filteredProducts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                      {filteredProducts.slice(0, 10).map(product => (
                        <div
                          key={product.id}
                          onClick={() => {
                            setSelectedProduct(product);
                            setItemSearch(product.name);
                          }}
                          className="p-2 hover:bg-gray-100 cursor-pointer"
                        >
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Input
                  type="number"
                  min="1"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                  className="w-24"
                  placeholder="Qty"
                />
                <Button onClick={addItemToTransfer} disabled={!selectedProduct}>
                  <Plus size={16} />
                </Button>
              </div>

              <div className="space-y-2">
                {transferForm.items.map((item) => {
                  const product = products.find(p => p.id === item.productId);
                  return (
                    <div key={item.productId} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                      <span className="text-sm">{product?.name} (SKU: {product?.sku})</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.quantity} units</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.productId)}
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes (optional)</label>
              <Input
                placeholder="Add any notes..."
                value={transferForm.notes}
                onChange={(e) => setTransferForm({...transferForm, notes: e.target.value})}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowNewTransfer(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCreateTransfer} disabled={submitting} className="flex-1">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Transfer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
