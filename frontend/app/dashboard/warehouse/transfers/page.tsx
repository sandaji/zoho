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
import { RequestStockTransferPayload, ApproveStockTransferPayload, DispatchStockTransferPayload, ReceiveStockTransferPayload, fetchUsers, fetchTrucks, User, Truck } from "@/lib/admin-api";

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
  const [users, setUsers] = useState<User[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTransfer, setShowNewTransfer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  
  // State for modals
  const [activeTransfer, setActiveTransfer] = useState<any | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showStartPickingModal, setShowStartPickingModal] = useState(false);
  const [showCompletePickingModal, setShowCompletePickingModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
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

      const [transfersRes, warehousesRes, productsRes, usersRes, trucksRes] = await Promise.all([
        warehouseService.getTransfers(params, token!),
        warehouseService.getWarehouses(token!),
        warehouseService.getProducts(token!),
        fetchUsers(token!).catch(() => []),
        fetchTrucks(token!).catch(() => []),
      ]);

      setTransfers(transfersRes.data || []);
      setWarehouses(warehousesRes.data || []);
      setProducts(productsRes.data?.products || productsRes.data || []);
      setUsers(usersRes || []);
      setTrucks(trucksRes || []);

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
  
  const openModal = (transfer: any, modal: 'approve' | 'start_picking' | 'complete_picking' | 'verify' | 'dispatch' | 'receive') => {
      setActiveTransfer(transfer);
      if (modal === 'approve') setShowApproveModal(true);
      if (modal === 'start_picking') setShowStartPickingModal(true);
      if (modal === 'complete_picking') setShowCompletePickingModal(true);
      if (modal === 'verify') setShowVerifyModal(true);
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
      PICKING: { classes: "bg-indigo-100 text-indigo-800 border border-indigo-200", icon: <Package size={14} className="mr-1 inline" /> },
      VERIFIED: { classes: "bg-teal-100 text-teal-800 border border-teal-200", icon: <FileCheck size={14} className="mr-1 inline" /> },
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

  // Maps an action code (from the backend's availableActions, computed in
  // modules/inventory/transfer-actions.ts from status + the user's actual
  // permissions) to the modal it opens. The frontend never decides *whether*
  // an action is legal — only what UI to show once the backend says it is.
  const ACTION_TO_MODAL: Record<string, 'approve' | 'start_picking' | 'complete_picking' | 'verify' | 'dispatch' | 'receive'> = {
    approve: 'approve',
    start_picking: 'start_picking',
    complete_picking: 'complete_picking',
    verify: 'verify',
    dispatch: 'dispatch',
    receive: 'receive',
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
              { label: "Picking", value: "PICKING" },
              { label: "Verified", value: "VERIFIED" },
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
              transfers.map((transfer) => {
                const isExpanded = expandedRow === transfer.id;
                const actions: Array<{ action: string; label: string }> = transfer.availableActions || [];
                return (
                <div key={transfer.id} className="hover:bg-emerald-50/50 transition-colors">
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-3">
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : transfer.id)}
                              className="flex items-center gap-1.5 font-bold text-slate-900 hover:text-emerald-700 transition-colors"
                            >
                              {isExpanded ? <ChevronUp size={16} className="shrink-0" /> : <ChevronDown size={16} className="shrink-0" />}
                              {transfer.documentId}
                            </button>
                            <p className="text-xs text-slate-500 mt-1 font-mono pl-[22px]">
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
                            {actions.map((a) => (
                              <Button key={a.action} size="sm" onClick={() => openModal(transfer, ACTION_TO_MODAL[a.action] || 'approve')}>
                                {a.label}
                              </Button>
                            ))}
                        </div>
                    </div>
                  </div>
                  {isExpanded && <TransferTimeline transfer={transfer} />}
                </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals for each stage */}
      {activeTransfer && (
          <>
            <ApproveModal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} transfer={activeTransfer} onSuccess={loadData} />
            <StartPickingModal isOpen={showStartPickingModal} onClose={() => setShowStartPickingModal(false)} transfer={activeTransfer} onSuccess={loadData} />
            <CompletePickingModal isOpen={showCompletePickingModal} onClose={() => setShowCompletePickingModal(false)} transfer={activeTransfer} onSuccess={loadData} />
            <VerifyModal isOpen={showVerifyModal} onClose={() => setShowVerifyModal(false)} transfer={activeTransfer} onSuccess={loadData} />
            <DispatchModal isOpen={showDispatchModal} onClose={() => setShowDispatchModal(false)} transfer={activeTransfer} onSuccess={loadData} users={users} trucks={trucks} />
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
            const result = await warehouseService.approveTransfer(transfer.id, { notes }, token!);
            if (result?.warning) {
                toast.warning(result.warning);
            }
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

function StartPickingModal({isOpen, onClose, transfer, onSuccess}: any) {
    const { token } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [notes, setNotes] = useState('');

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            await warehouseService.startPicking(transfer.id, { notes }, token!);
            toast.success("Picking started");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to start picking");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader><DialogTitle>Start Picking {transfer.documentId}</DialogTitle></DialogHeader>
                <div className="py-4">
                    <p className="text-sm text-slate-600">This claims the pick task for this transfer. Nothing leaves the warehouse yet — you'll record what was actually pulled once picking is done.</p>
                    <Input className="mt-4" placeholder="Optional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Start Picking
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function CompletePickingModal({isOpen, onClose, transfer, onSuccess}: any) {
    const { token } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState<any>({ items: [], notes: '' });

    useEffect(() => {
        if (transfer) {
            setForm({
                items: transfer.items.map((i: any) => ({
                  productId: i.productId,
                  productName: i.product?.name || i.productId,
                  requested_qty: i.requested_qty,
                  picked_qty: i.picked_qty ?? i.requested_qty,
                })),
                notes: '',
            })
        }
    }, [transfer]);

    const handleQtyChange = (productId: string, value: number) => {
        setForm((prev: any) => ({
            ...prev,
            items: prev.items.map((i: any) =>
                i.productId === productId
                    ? { ...i, picked_qty: Math.max(0, Math.min(value, i.requested_qty)) }
                    : i
            ),
        }));
    };

    const hasShortPick = form.items.some((i: any) => i.picked_qty < i.requested_qty);

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            await warehouseService.completePicking(transfer.id, {
                items: form.items.map((i: any) => ({ productId: i.productId, picked_qty: i.picked_qty })),
                notes: form.notes,
            }, token!);
            toast.success("Picking completed — ready for verification");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to complete picking");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Complete Picking — {transfer.documentId}</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Picked Quantities {hasShortPick && <span className="text-amber-600 font-normal">(short pick — verifier will see this)</span>}
                        </label>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-left">
                                    <tr>
                                        <th className="px-4 py-2 font-medium">Product</th>
                                        <th className="px-4 py-2 font-medium text-right">Requested</th>
                                        <th className="px-4 py-2 font-medium text-right w-28">Picked</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {form.items.map((item: any) => (
                                        <tr key={item.productId} className="bg-white">
                                            <td className="px-4 py-2">{item.productName}</td>
                                            <td className="px-4 py-2 text-right text-slate-500">{item.requested_qty}</td>
                                            <td className="px-4 py-2 text-right">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={item.requested_qty}
                                                    value={item.picked_qty}
                                                    onChange={(e) => handleQtyChange(item.productId, parseInt(e.target.value) || 0)}
                                                    className="h-8 text-right"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <Input placeholder="Optional notes..." value={form.notes} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Mark Ready for Verification
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function VerifyModal({isOpen, onClose, transfer, onSuccess}: any) {
    const { token } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [notes, setNotes] = useState('');

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            const result = await warehouseService.verifyTransfer(transfer.id, { notes }, token!);
            if (result?.warning) {
                toast.warning(result.warning);
            }
            toast.success("Transfer verified — ready to dispatch");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to verify transfer");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Verify Picked Items — {transfer.documentId}</DialogTitle></DialogHeader>
                <div className="py-2">
                    <p className="text-sm text-slate-600 mb-3">Confirm the picked quantities below match what's physically staged before this moves on to dispatch.</p>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-left">
                                <tr>
                                    <th className="px-4 py-2 font-medium">Product</th>
                                    <th className="px-4 py-2 font-medium text-right">Requested</th>
                                    <th className="px-4 py-2 font-medium text-right">Picked</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(transfer.items || []).map((item: any) => {
                                    const short = (item.picked_qty ?? 0) < item.requested_qty;
                                    return (
                                        <tr key={item.productId} className="bg-white">
                                            <td className="px-4 py-2">{item.product?.name || item.productId}</td>
                                            <td className="px-4 py-2 text-right text-slate-500">{item.requested_qty}</td>
                                            <td className={`px-4 py-2 text-right font-medium ${short ? "text-amber-600" : "text-slate-700"}`}>{item.picked_qty ?? 0}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <Input className="mt-4" placeholder="Optional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Verify
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function DispatchModal({isOpen, onClose, transfer, onSuccess, users, trucks}: any) {
    const { token } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState<any>({ items: [], dispatchMode: 'TRUCK', driverId: '', truckId: '', vehicleRegistration: '' });

    useEffect(() => {
        if (transfer) {
            setForm({
                items: transfer.items.map((i: any) => ({
                  productId: i.productId,
                  productName: i.product?.name || i.productId,
                  requested_qty: i.requested_qty,
                  dispatched_qty: i.requested_qty,
                })),
                dispatchMode: 'TRUCK',
                driverId: '',
                truckId: '',
                vehicleRegistration: '',
            })
        }
    }, [transfer]);

    const handleItemQtyChange = (productId: string, value: number) => {
        setForm((prev: any) => ({
            ...prev,
            items: prev.items.map((i: any) =>
                i.productId === productId
                    ? { ...i, dispatched_qty: Math.max(0, Math.min(value, i.requested_qty)) }
                    : i
            ),
        }));
    };

    const handleTruckSelect = (truckId: string) => {
        const truck = (trucks || []).find((t: any) => t.id === truckId);
        setForm((prev: any) => ({
            ...prev,
            truckId,
            vehicleRegistration: truck ? truck.registration : prev.vehicleRegistration,
        }));
    };

    const handleSubmit = async () => {
        if (!form.driverId) {
            toast.error("Please select a driver");
            return;
        }
        if (!form.truckId && !form.vehicleRegistration) {
            toast.error(form.dispatchMode === 'RIDER' ? "Please enter the rider's vehicle registration" : "Please select a truck or enter a vehicle registration");
            return;
        }
        if (form.items.every((i: any) => i.dispatched_qty <= 0)) {
            toast.error("At least one item must have a dispatched quantity greater than zero");
            return;
        }
        try {
            setSubmitting(true);
            const payload: DispatchStockTransferPayload = {
                items: form.items
                  .filter((i: any) => i.dispatched_qty > 0)
                  .map((i: any) => ({ productId: i.productId, dispatched_qty: i.dispatched_qty })),
                dispatchMode: form.dispatchMode,
                driverId: form.driverId,
                truckId: form.dispatchMode === 'TRUCK' ? (form.truckId || undefined) : undefined,
                vehicleRegistration: form.vehicleRegistration || undefined,
            };
            await warehouseService.dispatchTransfer(transfer.id, payload, token!);
            toast.success("Transfer dispatched");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to dispatch transfer");
        } finally {
            setSubmitting(false);
        }
    }

    const isPartial = form.items.some((i: any) => i.dispatched_qty < i.requested_qty);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Dispatch Transfer {transfer.documentId}</DialogTitle></DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Dispatch mode toggle */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Dispatch Mode</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setForm((p: any) => ({ ...p, dispatchMode: 'TRUCK', truckId: '' }))}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${form.dispatchMode === 'TRUCK' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                            >
                                <Truck size={16} /> Truck
                            </button>
                            <button
                                type="button"
                                onClick={() => setForm((p: any) => ({ ...p, dispatchMode: 'RIDER', truckId: '', vehicleRegistration: '' }))}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${form.dispatchMode === 'RIDER' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                            >
                                <Package size={16} /> Rider
                            </button>
                        </div>
                    </div>

                    {/* Driver select */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Driver</label>
                        <select
                            value={form.driverId}
                            onChange={(e) => setForm((p: any) => ({ ...p, driverId: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                            <option value="">Select driver...</option>
                            {(users || []).filter((u: any) => u.isActive !== false).map((u: any) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Truck select (TRUCK mode only) */}
                    {form.dispatchMode === 'TRUCK' && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Truck</label>
                            <select
                                value={form.truckId}
                                onChange={(e) => handleTruckSelect(e.target.value)}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="">Select truck (or enter registration below)...</option>
                                {(trucks || []).filter((t: any) => t.isActive !== false).map((t: any) => (
                                    <option key={t.id} value={t.id}>{t.registration} — {t.model}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Vehicle registration */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Vehicle Registration {form.dispatchMode === 'RIDER' && <span className="text-red-500">*</span>}
                        </label>
                        <Input
                            placeholder={form.dispatchMode === 'RIDER' ? "e.g. KMEA 123B (motorbike plate)" : "Auto-filled from selected truck, or enter manually"}
                            value={form.vehicleRegistration}
                            onChange={(e) => setForm((p: any) => ({ ...p, vehicleRegistration: e.target.value }))}
                        />
                    </div>

                    {/* Items with editable dispatched quantity */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Items to Dispatch {isPartial && <span className="text-amber-600 font-normal">(partial dispatch)</span>}
                        </label>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-left">
                                    <tr>
                                        <th className="px-4 py-2 font-medium">Product</th>
                                        <th className="px-4 py-2 font-medium text-right">Requested</th>
                                        <th className="px-4 py-2 font-medium text-right w-28">Dispatching</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {form.items.map((item: any) => (
                                        <tr key={item.productId} className="bg-white">
                                            <td className="px-4 py-2">{item.productName}</td>
                                            <td className="px-4 py-2 text-right text-slate-500">{item.requested_qty}</td>
                                            <td className="px-4 py-2 text-right">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={item.requested_qty}
                                                    value={item.dispatched_qty}
                                                    onChange={(e) => handleItemQtyChange(item.productId, parseInt(e.target.value) || 0)}
                                                    className="h-8 text-right"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
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

// Roadmap/timeline view for a single transfer — who requested it, who
// approved it, how/by whom it was dispatched, and who received it. All of
// this data already exists on the transfer object returned by the backend
// (createdBy, approvedBy, driver/truck/dispatchMode/vehicleRegistration,
// receivedBy) — this just renders it instead of leaving it invisible.
function TransferTimeline({ transfer }: { transfer: any }) {
  const steps = [
    {
      key: "requested",
      label: "Requested",
      done: true,
      actor: transfer.createdBy?.name,
      at: transfer.createdAt,
      detail: null as string | null,
    },
    {
      key: "approved",
      label: "Approved",
      done: !!transfer.approvedAt,
      actor: transfer.approvedBy?.name,
      at: transfer.approvedAt,
      detail: null as string | null,
    },
    {
      key: "picking",
      label: transfer.pickingCompletedAt ? "Picked" : "Picking",
      done: !!transfer.pickingCompletedAt,
      actor: transfer.pickedBy?.name,
      at: transfer.pickingCompletedAt,
      detail: null as string | null,
    },
    {
      key: "verified",
      label: "Verified",
      done: !!transfer.verifiedAt,
      actor: transfer.verifiedBy?.name,
      at: transfer.verifiedAt,
      detail: null as string | null,
    },
    {
      key: "dispatched",
      label: "Dispatched",
      done: !!transfer.dispatchedAt,
      actor: transfer.driver?.name,
      at: transfer.dispatchedAt,
      detail: transfer.dispatchedAt
        ? `${transfer.dispatchMode === "RIDER" ? "Rider" : "Truck"}${transfer.vehicleRegistration ? ` • ${transfer.vehicleRegistration}` : ""}${transfer.truck?.model ? ` (${transfer.truck.model})` : ""}`
        : null,
    },
    {
      key: "received",
      label: transfer.status === "PARTIALLY_RECEIVED" ? "Partially Received" : "Received",
      done: !!transfer.receivedAt,
      actor: transfer.receivedBy?.name,
      at: transfer.receivedAt,
      detail: transfer.status === "DISCREPANCY" ? "Discrepancy flagged — dispatched vs. received quantities didn't match" : null,
    },
  ];

  return (
    <div className="px-5 pb-5 pt-1 bg-slate-50/70 border-t border-slate-100">
      <div className="grid grid-cols-6 gap-4 mb-5 mt-4">
        {steps.map((step, idx) => (
          <div key={step.key} className="relative">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${step.done ? "bg-emerald-500" : "bg-slate-300"}`} />
              <p className={`text-xs font-semibold ${step.done ? "text-slate-800" : "text-slate-400"}`}>{step.label}</p>
            </div>
            {step.done ? (
              <div className="pl-[18px]">
                {step.actor && <p className="text-sm text-slate-700">{step.actor}</p>}
                {step.at && <p className="text-xs text-slate-500 font-mono">{new Date(step.at).toLocaleString()}</p>}
                {step.detail && <p className="text-xs text-slate-500 mt-0.5">{step.detail}</p>}
              </div>
            ) : (
              <p className="pl-[18px] text-xs text-slate-400">Pending</p>
            )}
            {idx < steps.length - 1 && (
              <div className="hidden md:block absolute top-1 left-full w-4 h-px bg-slate-200 -translate-x-2" />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Product</th>
              <th className="px-4 py-2 font-medium text-right">Requested</th>
              <th className="px-4 py-2 font-medium text-right">Dispatched</th>
              <th className="px-4 py-2 font-medium text-right">Received</th>
              <th className="px-4 py-2 font-medium text-right">Damaged</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(transfer.items || []).map((item: any) => (
              <tr key={item.id || item.productId} className="bg-white">
                <td className="px-4 py-2">{item.product?.name || item.productId}</td>
                <td className="px-4 py-2 text-right">{item.requested_qty}</td>
                <td className="px-4 py-2 text-right text-slate-500">{item.dispatched_qty ?? "—"}</td>
                <td className="px-4 py-2 text-right text-slate-500">{item.received_qty ?? "—"}</td>
                <td className="px-4 py-2 text-right text-slate-500">{item.damaged_qty ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {transfer.notes && (
        <p className="text-xs text-slate-500 mt-3"><span className="font-semibold">Notes:</span> {transfer.notes}</p>
      )}
    </div>
  );
}
