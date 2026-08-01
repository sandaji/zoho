"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Package, ArrowRight, Loader2, Search, X, Truck, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, FileCheck, ThumbsUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { warehouseService } from "@/lib/warehouse.service";
import { RequestStockTransferPayload, ApproveStockTransferPayload, DispatchStockTransferPayload, ReceiveStockTransferPayload } from "@/lib/admin-api";

interface TransferItem {
  id?: string;
  productId: string;
  requested_qty: number;
  dispatched_qty?: number;
  received_qty?: number;
  damaged_qty?: number;
  product?: any;
}

interface TransferForm {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  items: Array<{ productId: string; requested_qty: number; }>;
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

  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  
  // State for modals
  const [activeTransfer, setActiveTransfer] = useState<any | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  const [transferForm, setTransferForm] = useState<TransferForm>({
    sourceWarehouseId: "",
    destinationWarehouseId: "",
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

      const [transfersRes, warehousesRes, productsRes] = await Promise.all([
        warehouseService.getTransfers(params, token!),
        warehouseService.getWarehouses(token!),
        warehouseService.getProducts(token!),
      ]);

      setTransfers(transfersRes.data || []);
      setWarehouses(warehousesRes.data || []);
      setProducts(productsRes.data?.products || productsRes.data || []);

    } catch (error) {
      toast.error("Failed to load transfers. The backend might be unavailable.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestTransfer = async () => {
    try {
      if (!transferForm.sourceWarehouseId || !transferForm.destinationWarehouseId) {
        toast.error("Please select source and destination warehouses");
        return;
      }
      if (transferForm.items.length === 0) {
        toast.error("Please add at least one item");
        return;
      }

      setSubmitting(true);
      await warehouseService.requestTransfer(transferForm, token!);
      toast.success("Transfer request submitted successfully");
      setShowNewTransfer(false);
      setTransferForm({ sourceWarehouseId: "", destinationWarehouseId: "", items: [], notes: "" });
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create transfer request");
    } finally {
      setSubmitting(false);
    }
  };
  
  const openModal = (transfer: any, modal: 'approve' | 'dispatch' | 'receive') => {
      setActiveTransfer(transfer);
      if (modal === 'approve') setShowApproveModal(true);
      if (modal === 'dispatch') setShowDispatchModal(true);
      if (modal === 'receive') setShowReceiveModal(true);
  }

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
      items: [...transferForm.items, { productId: selectedProduct.id, requested_qty: itemQuantity }],
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
      DRAFT: { classes: "bg-slate-100 text-slate-800", icon: <Loader2 size={14} className="mr-1 inline" /> },
      PENDING_APPROVAL: { classes: "bg-yellow-100 text-yellow-800", icon: <Loader2 size={14} className="mr-1 inline" /> },
      APPROVED: { classes: "bg-blue-100 text-blue-800", icon: <ThumbsUp size={14} className="mr-1 inline" /> },
      DISPATCHED: { classes: "bg-cyan-100 text-cyan-800 border border-cyan-200", icon: <Truck size={14} className="mr-1 inline" /> },
      PARTIALLY_RECEIVED: { classes: "bg-purple-100 text-purple-800", icon: <Package size={14} className="mr-1 inline" /> },
      RECEIVED: { classes: "bg-emerald-100 text-emerald-800 border border-emerald-200", icon: <CheckCircle size={14} className="mr-1 inline" /> },
      CANCELLED: { classes: "bg-red-100 text-red-800", icon: <X size={14} className="mr-1 inline" /> },
      DISCREPANCY: { classes: "bg-red-100 text-red-800", icon: <AlertTriangle size={14} className="mr-1 inline" /> },
    };
    const badge = badges[status] || badges["DRAFT"];

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
          New Transfer Request
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white border-none shadow-sm ring-1 ring-emerald-100">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "All", value: "all" },
              { label: "Pending Approval", value: "PENDING_APPROVAL" },
              { label: "Approved", value: "APPROVED" },
              { label: "Dispatched", value: "DISPATCHED" },
              { label: "Received", value: "RECEIVED" },
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
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-3">
                            <h3 className="font-bold text-slate-900">{transfer.documentId}</h3>
                            <p className="text-xs text-slate-500 mt-1 font-mono">
                            {new Date(transfer.createdAt).toLocaleString()}
                            </p>
                        </div>
                        <div className="col-span-4 flex items-center justify-center gap-4 px-4">
                            <div className="text-right flex-1 truncate">
                                <p className="font-semibold text-slate-800 truncate">{transfer.sourceWarehouse?.name}</p>
                            </div>
                            <ArrowRight size={20} className="text-slate-300" />
                            <div className="text-left flex-1 truncate">
                                <p className="font-semibold text-slate-800 truncate">{transfer.destinationWarehouse?.name}</p>
                            </div>
                        </div>
                        <div className="col-span-2">{getStatusBadge(transfer.status)}</div>
                        <div className="col-span-3 flex justify-end gap-2">
                            {transfer.status === 'PENDING_APPROVAL' && <Button size="sm" onClick={() => openModal(transfer, 'approve')}>Approve</Button>}
                            {transfer.status === 'APPROVED' && <Button size="sm" onClick={() => openModal(transfer, 'dispatch')}>Dispatch</Button>}
                            {transfer.status === 'DISPATCHED' && <Button size="sm" onClick={() => openModal(transfer, 'receive')}>Receive</Button>}
                        </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals for each stage */}
      {activeTransfer && (
          <>
            <ApproveModal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} transfer={activeTransfer} onSuccess={loadData} />
            <DispatchModal isOpen={showDispatchModal} onClose={() => setShowDispatchModal(false)} transfer={activeTransfer} onSuccess={loadData} />
            <ReceiveModal isOpen={showReceiveModal} onClose={() => setShowReceiveModal(false)} transfer={activeTransfer} onSuccess={loadData} />
          </>
      )}

      {/* New Transfer Modal */}
      <Dialog open={showNewTransfer} onOpenChange={setShowNewTransfer}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-50">
          <DialogHeader className="bg-white -mx-6 -mt-6 p-6 border-b border-slate-200">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Truck className="text-emerald-600" /> Request New Stock Transfer
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Source Warehouse</label>
                <select
                  value={transferForm.sourceWarehouseId}
                  onChange={(e) => setTransferForm({ ...transferForm, sourceWarehouseId: e.target.value })}
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
                  value={transferForm.destinationWarehouseId}
                  onChange={(e) => setTransferForm({ ...transferForm, destinationWarehouseId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                >
                  <option value="">Select target location...</option>
                  {warehouses.filter(wh => wh.id !== transferForm.sourceWarehouseId).map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Transfer Items</label>
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
                    <Input
                        type="number"
                        min="1"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                        className="w-24 h-11 bg-slate-50 font-semibold text-slate-900 border-slate-200 focus-visible:ring-emerald-500"
                    />
                    <Button
                        onClick={addItemToTransfer}
                        disabled={!selectedProduct}
                        className="h-11 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-800 shadow-none border border-emerald-200"
                    >
                        <Plus size={18} className="mr-1" /> Add
                    </Button>
                </div>
                 {transferForm.items.length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden mt-4 shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-left">
                        <tr>
                            <th className="px-4 py-2 font-medium">Product</th>
                            <th className="px-4 py-2 font-medium text-right">Quantity</th>
                            <th className="px-4 py-2 w-16 text-center"></th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {transferForm.items.map((item) => {
                            const product = products.find(p => p.id === item.productId);
                            return (
                            <tr key={item.productId} className="bg-white hover:bg-slate-50">
                                <td className="px-4 py-3">{product?.name}</td>
                                <td className="px-4 py-3 text-right">{item.requested_qty}</td>
                                <td className="px-4 py-3 text-center">
                                    <Button variant="ghost" size="sm" onClick={() => removeItem(item.productId)}><X size={16} /></Button>
                                </td>
                            </tr>
                            );
                        })}
                        </tbody>
                    </table>
                    </div>
                 )}
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
                <Input
                    placeholder="Optional notes for this transfer"
                    value={transferForm.notes}
                    onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                />
            </div>
          </div>
          <div className="flex gap-3 pt-6 border-t border-slate-200 bg-slate-50 -mx-6 -mb-6 p-6">
            <Button variant="outline" onClick={() => setShowNewTransfer(false)} className="flex-1 bg-white border-slate-300">
              Cancel
            </Button>
            <Button
              onClick={handleRequestTransfer}
              disabled={submitting || transferForm.items.length === 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Request Transfer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Modal Components
function ApproveModal({isOpen, onClose, transfer, onSuccess}: any) {
    const { token } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [notes, setNotes] = useState('');

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            await warehouseService.approveTransfer(transfer.id, { notes }, token!);
            toast.success("Transfer approved");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to approve transfer");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader><DialogTitle>Approve Transfer {transfer.documentId}</DialogTitle></DialogHeader>
                <div className="py-4">
                    <p>Are you sure you want to approve this transfer? This will reserve the stock at the source warehouse.</p>
                    <Input className="mt-4" placeholder="Optional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Approve
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function DispatchModal({isOpen, onClose, transfer, onSuccess}: any) {
    const { token } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState<any>({ items: [], driverId: '', truckId: '' });

    useEffect(() => {
        if (transfer) {
            setForm({
                items: transfer.items.map((i: any) => ({ productId: i.productId, dispatched_qty: i.requested_qty })),
                driverId: '',
                truckId: '',
            })
        }
    }, [transfer]);
    
    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            await warehouseService.dispatchTransfer(transfer.id, form, token!);
            toast.success("Transfer dispatched");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to dispatch transfer");
        } finally {
            setSubmitting(false);
        }
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader><DialogTitle>Dispatch Transfer {transfer.documentId}</DialogTitle></DialogHeader>
                {/* Simplified for now, a real UI would list items and allow quantity changes */}
                <p>Dispatching {transfer.items.length} item(s). You can add driver and truck info.</p>
                 <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Dispatch
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function ReceiveModal({isOpen, onClose, transfer, onSuccess}: any) {
    const { token } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState<any>({ items: [], notes: '' });

     useEffect(() => {
        if (transfer) {
            setForm({
                items: transfer.items.map((i: any) => ({ productId: i.productId, received_qty: i.dispatched_qty, damaged_qty: 0 })),
                notes: '',
            })
        }
    }, [transfer]);

    const handleItemChange = (productId: string, field: 'received_qty' | 'damaged_qty', value: number) => {
        setForm((prev: any) => ({
            ...prev,
            items: prev.items.map((i: any) => i.productId === productId ? {...i, [field]: value} : i)
        }))
    }

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            await warehouseService.receiveTransfer(transfer.id, form, token!);
            toast.success("Transfer received");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to receive transfer");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Receive Transfer {transfer.documentId}</DialogTitle></DialogHeader>
                <div>
                     {form.items.map((item: any) => (
                         <div key={item.productId} className="grid grid-cols-3 gap-2 items-center">
                            <p>{item.productId}</p>
                            <Input type="number" value={item.received_qty} onChange={e => handleItemChange(item.productId, 'received_qty', +e.target.value)} />
                             <Input type="number" value={item.damaged_qty} onChange={e => handleItemChange(item.productId, 'damaged_qty', +e.target.value)} />
                         </div>
                     ))}
                </div>
                 <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Receive
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
