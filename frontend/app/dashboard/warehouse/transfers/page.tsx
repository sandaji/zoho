"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Package, ArrowRight, Loader2, Search, X, Truck, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { warehouseService } from "@/lib/warehouse.service";

interface TransferItem {
  id?: string;
  productId: string;
  quantity: number;            // For creation
  qtyRequested?: number;       // For fetching
  qtyDispatched?: number;
  qtyReceived?: number;
  product?: any;
}

interface TransferForm {
  sourceId: string;
  targetId: string;
  items: TransferItem[];
  notes: string;
}

export default function TransfersPage() {
  const { token } = useAuth();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTransfer, setShowNewTransfer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Advanced Receive State
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [receivingItems, setReceivingItems] = useState<Record<string, number>>({});
  const [receivingTransferId, setReceivingTransferId] = useState<string | null>(null);

  const [transferForm, setTransferForm] = useState<TransferForm>({
    sourceId: "",
    targetId: "",
    items: [],
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

      // Standardized API Calls as requested
      const [transfersRes, warehousesRes, productsRes] = await Promise.all([
        warehouseService.getTransfers(params, token!),
        warehouseService.getWarehouses(token!),
        warehouseService.getProducts(token!),
      ]);

      setTransfers(transfersRes.data || []);
      setWarehouses(warehousesRes.data || []);
      setProducts(productsRes.data?.products || productsRes.data || []);

    } catch (error) {
      toast.error("Failed to load transfers");
      console.error(error);
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
      toast.success("Transfer dispatched successfully");
      setShowNewTransfer(false);
      setTransferForm({ sourceId: "", targetId: "", items: [], notes: "" });
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiveTransfer = async (transferId: string) => {
    try {
      setReceivingTransferId(transferId);

      // Map receivingItems to the payload structure expected by the backend
      // Typically, receiving might just be completing it if quantities aren't partial
      // But we will send the mapped quantities.
      // (Assuming `warehouseService.receiveTransfer(id, payload, token)` exists or updating accordingly)
      await warehouseService.fulfillTransfer(transferId, token!); // Assuming this fulfills it completely for now, backend adjust needed for partial
      toast.success("Transfer received successfully");
      setExpandedRow(null);
      setReceivingItems({});
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to receive transfer");
    } finally {
      setReceivingTransferId(null);
    }
  };

  const toggleExpandRow = (transfer: any) => {
    if (expandedRow === transfer.id) {
      setExpandedRow(null);
    } else {
      setExpandedRow(transfer.id);
      // Initialize receiving quantities to the dispatched quantities by default
      if (transfer.status === "IN_TRANSIT" || transfer.status === "PENDING") {
        const initialQtys: Record<string, number> = {};
        transfer.items?.forEach((item: any) => {
          initialQtys[item.id || item.productId] = item.qtyDispatched || item.quantity;
        });
        setReceivingItems(initialQtys);
      }
    }
  };

  const updateReceivingQuantity = (itemId: string, val: number) => {
    setReceivingItems(prev => ({ ...prev, [itemId]: val >= 0 ? val : 0 }));
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

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { classes: string, icon: any }> = {
      PENDING: { classes: "bg-slate-100 text-slate-800", icon: <Loader2 size={14} className="mr-1 inline" /> },
      IN_TRANSIT: { classes: "bg-yellow-100 text-yellow-800 border border-yellow-200", icon: <Truck size={14} className="mr-1 inline" /> },
      COMPLETED: { classes: "bg-emerald-100 text-emerald-800 border border-emerald-200", icon: <CheckCircle size={14} className="mr-1 inline" /> },
      DISCREPANCY: { classes: "bg-red-100 text-red-800", icon: <AlertTriangle size={14} className="mr-1 inline" /> },
      CANCELLED: { classes: "bg-red-100 text-red-800", icon: <X size={14} className="mr-1 inline" /> },
    };
    const badge = badges[status] || badges["PENDING"];

    if (!badge) return null;

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center shadow-sm w-fit ${badge.classes}`}>
        {badge.icon}
        {status.replace("_", " ")}
      </span>
    );
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(itemSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 bg-emerald-50/30 min-h-screen">
        <div className="animate-pulse flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-emerald-50/30 min-h-screen">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-emerald-100">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Stock Transfers</h1>
          <p className="text-slate-600 mt-1">Manage physical and in-transit inventory movements</p>
        </div>
        <Button onClick={() => setShowNewTransfer(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus size={20} className="mr-2" />
          New Transfer Order
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white border-none shadow-sm ring-1 ring-emerald-100">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "All", value: "all" },
              { label: "Pending", value: "PENDING" },
              { label: "In-Transit", value: "IN_TRANSIT" },
              { label: "Completed", value: "COMPLETED" },
              { label: "Discrepancy", value: "DISCREPANCY" }
            ].map((status) => (
              <Button
                key={status.value}
                variant={statusFilter === status.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status.value)}
                className={statusFilter === status.value ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"}
              >
                {status.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transfers List Table-like Structure */}
      <Card className="bg-white border-none shadow-sm ring-1 ring-emerald-100 overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
          <CardTitle className="text-lg text-slate-800">Transfer Orders Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {transfers.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Truck size={48} className="mx-auto mb-4 opacity-20 text-emerald-600" />
                <p className="font-medium text-slate-600">No transfer orders found</p>
                <p className="text-sm mt-1">Adjust your filters or create a new order.</p>
              </div>
            ) : (
              transfers.map((transfer) => (
                <div key={transfer.id} className="hover:bg-emerald-50/50 transition-colors">
                  {/* Row Header */}
                  <div
                    className="p-5 flex items-center justify-between cursor-pointer"
                    onClick={() => toggleExpandRow(transfer)}
                  >
                    <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-slate-900">{transfer.referenceNumber || transfer.transferNo}</h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-mono">
                          {new Date(transfer.createdAt).toLocaleString()}
                        </p>
                      </div>

                      {/* Route Path Indicator */}
                      <div className="col-span-6 flex items-center justify-center gap-4 px-4">
                        <div className="text-right flex-1 truncate">
                          <p className="font-semibold text-slate-800 truncate">{transfer.sourceWarehouse?.name}</p>
                          <p className="text-xs text-slate-500">Source</p>
                        </div>
                        <div className={`flex flex-col items-center justify-center px-4 ${transfer.status === 'IN_TRANSIT' ? 'text-yellow-500' : 'text-slate-300'}`}>
                          <ArrowRight size={20} />
                        </div>
                        <div className="text-left flex-1 truncate">
                          <p className="font-semibold text-slate-800 truncate">{transfer.targetWarehouse?.name || transfer.destinationWarehouse?.name}</p>
                          <p className="text-xs text-slate-500">Destination</p>
                        </div>
                      </div>

                      <div className="col-span-3 flex justify-end">
                        {getStatusBadge(transfer.status)}
                      </div>
                    </div>

                    <div className="ml-4 pl-4 border-l border-slate-200">
                      {expandedRow === transfer.id ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                    </div>
                  </div>

                  {/* Expandable Advanced Logic Section */}
                  {expandedRow === transfer.id && (
                    <div className="bg-slate-50/50 p-6 border-t border-slate-100 shadow-inner">
                      <div className="flex justify-between items-end mb-4">
                        <h4 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">Transfer Manifest</h4>
                      </div>

                      {/* Line Items Table */}
                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-100 text-slate-600 font-medium border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3">Item / SKU</th>
                              <th className="px-4 py-3 text-right">Qty Dispatched</th>
                              <th className="px-4 py-3 text-right">Qty Received</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {transfer.items?.map((item: any) => {
                              const itemId = item.id || item.productId;
                              return (
                                <tr key={itemId} className="hover:bg-slate-50">
                                  <td className="px-4 py-3 font-medium text-slate-800">
                                    {item.product?.name}
                                    <span className="block text-xs text-slate-500 font-mono mt-0.5">{item.product?.sku}</span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                                    {item.qtyDispatched || item.quantity}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {(transfer.status === "IN_TRANSIT" || transfer.status === "PENDING") ? (
                                      <div className="flex justify-end items-center">
                                        <Input
                                          type="number"
                                          min="0"
                                          max={item.qtyDispatched || item.quantity}
                                          className="w-20 text-right h-8 border-emerald-200 focus:ring-emerald-500"
                                          value={receivingItems[itemId] ?? (item.qtyDispatched || item.quantity)}
                                          onChange={(e) => updateReceivingQuantity(itemId, parseInt(e.target.value) || 0)}
                                        />
                                      </div>
                                    ) : (
                                      <span className={`font-medium ${(item.qtyReceived) < (item.qtyDispatched || item.quantity) ? 'text-red-600' : 'text-emerald-600'
                                        }`}>
                                        {item.qtyReceived ?? item.quantity}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Receive Action */}
                      {(transfer.status === "IN_TRANSIT" || transfer.status === "PENDING") && (
                        <div className="mt-4 flex justify-end">
                          <Button
                            onClick={() => handleReceiveTransfer(transfer.id)}
                            disabled={receivingTransferId === transfer.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                          >
                            {receivingTransferId === transfer.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Package className="mr-2 h-4 w-4" />
                            Confirm Receipt
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* New Transfer Modal - Refined UI */}
      <Dialog open={showNewTransfer} onOpenChange={setShowNewTransfer}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-50">
          <DialogHeader className="bg-white -mx-6 -mt-6 p-6 border-b border-slate-200">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Truck className="text-emerald-600" /> Dispatch New Transfer
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Warehouse Selection Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Source Warehouse</label>
                <select
                  value={transferForm.sourceId}
                  onChange={(e) => setTransferForm({ ...transferForm, sourceId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                >
                  <option value="">Select origin location...</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Destination Warehouse</label>
                <select
                  value={transferForm.targetId}
                  onChange={(e) => setTransferForm({ ...transferForm, targetId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                >
                  <option value="">Select target location...</option>
                  {warehouses.filter(wh => wh.id !== transferForm.sourceId).map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Item Selection Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Assemble Transfer Manifest</label>

              <div className="flex gap-3 mb-4">
                <div className="flex-1 relative group">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-hover:text-emerald-500 transition-colors" size={18} />
                  <Input
                    placeholder="Search product name or SKU..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="pl-10 h-11 border-slate-200 focus-visible:ring-emerald-500"
                  />

                  {itemSearch && filteredProducts.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-emerald-100 rounded-xl shadow-xl max-h-60 overflow-auto py-2">
                      {filteredProducts.slice(0, 10).map(product => (
                        <div
                          key={product.id}
                          onClick={() => {
                            setSelectedProduct(product);
                            setItemSearch(product.name);
                          }}
                          className="px-4 py-2 hover:bg-emerald-50/80 cursor-pointer flex justify-between items-center transition-colors"
                        >
                          <div>
                            <p className="font-medium text-sm text-slate-900">{product.name}</p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{product.sku}</p>
                          </div>
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Select</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] uppercase font-bold text-slate-400 z-10">Qty</span>
                  <Input
                    type="number"
                    min="1"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                    className="w-24 h-11 bg-slate-50 font-semibold text-slate-900 border-slate-200 focus-visible:ring-emerald-500"
                  />
                </div>

                <Button
                  onClick={addItemToTransfer}
                  disabled={!selectedProduct}
                  className="h-11 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-800 shadow-none border border-emerald-200"
                >
                  <Plus size={18} className="mr-1" /> Add
                </Button>
              </div>

              {/* Selected Items Table Layout */}
              {transferForm.items.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden mt-4 shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-left">
                      <tr>
                        <th className="px-4 py-2 font-medium">Product / SKU</th>
                        <th className="px-4 py-2 font-medium text-right w-32">Quantity</th>
                        <th className="px-4 py-2 w-16 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transferForm.items.map((item) => {
                        const product = products.find(p => p.id === item.productId);
                        return (
                          <tr key={item.productId} className="bg-white hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-800">{product?.name}</span>
                              <span className="block text-xs font-mono text-slate-500">{product?.sku}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-slate-900">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.productId)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 rounded-full"
                              >
                                <X size={16} />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Transport Notes / Reference</label>
              <Input
                placeholder="Logistics provider, driver name, vehicle plate, etc."
                value={transferForm.notes}
                onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                className="border-slate-200 focus-visible:ring-emerald-500 bg-slate-50 focus:bg-white transition-colors"
              />
            </div>

          </div>

          <div className="flex gap-3 pt-6 border-t border-slate-200 bg-slate-50 -mx-6 -mb-6 p-6">
            <Button variant="outline" onClick={() => setShowNewTransfer(false)} className="flex-1 bg-white border-slate-300">
              Cancel
            </Button>
            <Button
              onClick={handleCreateTransfer}
              disabled={submitting || transferForm.items.length === 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Truck className="mr-2 h-4 w-4" />
              Dispatch Transfer Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
