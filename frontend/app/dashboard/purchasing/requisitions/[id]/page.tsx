"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Send, ArrowRightLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { requisitionService, type Requisition } from "@/lib/requisition.service";
import { purchasingService } from "@/lib/purchasing.service";
import { warehouseService } from "@/lib/warehouse.service";
import { VendorProductCombobox, type POProduct } from "@/components/purchasing/po-line-items";
import { toast } from "sonner";

const STATUS_COLOR_MAP: Record<Requisition["status"], string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  REJECTED: "bg-red-100 text-red-800",
  CONVERTED: "bg-slate-100 text-slate-800",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export default function RequisitionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const id = params.id as string;

  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [convertOpen, setConvertOpen] = useState(false);
  const [vendors, setVendors] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [convertVendorId, setConvertVendorId] = useState("");
  const [convertProductIds, setConvertProductIds] = useState<Record<string, string>>({});
  const [convertLineTypes, setConvertLineTypes] = useState<Record<string, "STOCKED" | "NON_STOCK">>({});
  const [convertProductNames, setConvertProductNames] = useState<Record<string, string>>({});
  const [convertUnitPrices, setConvertUnitPrices] = useState<Record<string, number>>({});
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [convertWarehouseId, setConvertWarehouseId] = useState("");

  const permissions = user?.permissions || [];
  // One manager approval, whatever the amount — the amount-tiered sign-off
  // happens later, on the LPO (after Finance has acknowledged it).
  const canApprove = permissions.some((p) => p.startsWith("purchasing.requisition.approve_"));
  const canConvert = permissions.includes("purchasing.requisition.convert");

  const fetchRequisition = async () => {
    try {
      setLoading(true);
      const data = await requisitionService.getById(id);
      setRequisition(data);
    } catch (error) {
      console.error("Failed to fetch requisition:", error);
      toast.error("Failed to load requisition");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchRequisition();
  }, [id]);

  const handleStatusChange = async (status: string, reason?: string) => {
    try {
      setActing(true);
      await requisitionService.updateStatus(id, status, reason);
      toast.success(`Requisition ${status.toLowerCase()}`);
      setRejectOpen(false);
      setRejectionReason("");
      fetchRequisition();
    } catch (error) {
      console.error("Failed to update requisition:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update requisition");
    } finally {
      setActing(false);
    }
  };

  const openConvertDialog = async () => {
    setConvertOpen(true);
    if (!token) return;
    if (vendors.length === 0) {
      try {
        const data = await purchasingService.getVendors(token);
        setVendors(data.vendors || data || []);
      } catch (error) {
        console.error("Failed to fetch vendors:", error);
      }
    }
    if (warehouses.length === 0) {
      try {
        const data = await warehouseService.getWarehouses(token);
        setWarehouses(data.data || []);
      } catch (error) {
        console.error("Failed to fetch warehouses:", error);
      }
    }
  };

  // Products belong to one vendor, so changing vendor clears the picks.
  const handleConvertVendorChange = (vendorId: string) => {
    if (vendorId === convertVendorId) return;
    setConvertVendorId(vendorId);
    setConvertProductIds({});
    setConvertLineTypes({});
    setConvertProductNames({});
    setConvertUnitPrices({});
  };

  const handlePickProduct = (lineId: string, product: POProduct) => {
    setConvertProductIds((prev) => ({ ...prev, [lineId]: product.id }));
    setConvertProductNames((prev) => ({
      ...prev,
      [lineId]: `${product.name} (${product.sku})`,
    }));
    // Default the price to the product's cost price; still editable.
    setConvertUnitPrices((prev) => ({ ...prev, [lineId]: Number(product.cost_price) || 0 }));
  };

  const handleConvert = async () => {
    if (!requisition) return;
    if (!convertVendorId) {
      toast.error("Select a vendor");
      return;
    }
    const items = requisition.items.map((item) => ({
      requisitionItemId: item.id!,
      productId: convertLineTypes[item.id!] === "STOCKED" ? convertProductIds[item.id!] : undefined,
      lineType: convertLineTypes[item.id!] ?? "NON_STOCK",
      unitPrice: convertUnitPrices[item.id!] ?? item.estimatedUnitCost,
    }));
    if (items.some((i) => i.lineType === "STOCKED" && !i.productId)) {
      toast.error("Choose a catalog product for each line marked as stocked");
      return;
    }
    try {
      setActing(true);
      const po = (await requisitionService.convertToPurchaseOrder(id, {
        vendorId: convertVendorId,
        warehouseId: convertWarehouseId || undefined,
        items,
      })) as { id?: string };
      toast.success("Purchase Order created as a draft — review it, then submit it to Finance");
      router.push(
        po?.id ? `/dashboard/purchasing/orders/${po.id}` : "/dashboard/purchasing/orders",
      );
    } catch (error) {
      console.error("Failed to convert requisition:", error);
      toast.error(error instanceof Error ? error.message : "Failed to convert requisition");
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!requisition) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <p className="text-slate-500">Requisition not found.</p>
      </div>
    );
  }

  const isOwner = requisition.requestedById === user?.id;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/purchasing/requisitions">
              <Button variant="ghost" size="sm" className="hover:text-emerald-600">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{requisition.requisitionNumber}</h1>
              <Badge className={STATUS_COLOR_MAP[requisition.status]}>
                {requisition.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>

          <div className="flex gap-3">
            {requisition.status === "DRAFT" && isOwner && (
              <Button
                onClick={() => handleStatusChange("SUBMITTED")}
                disabled={acting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Send className="h-4 w-4 mr-2" />
                Submit for Approval
              </Button>
            )}
            {requisition.status === "SUBMITTED" && canApprove && !isOwner && (
              <>
                <Button
                  onClick={() => handleStatusChange("APPROVED")}
                  disabled={acting}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRejectOpen(true)}
                  disabled={acting}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            {requisition.status === "SUBMITTED" && requisition.requestedById === user?.id && canApprove && (
              <p className="text-xs text-slate-500 self-center">
                You can't approve your own requisition — segregation of duties.
              </p>
            )}
            {requisition.status === "APPROVED" && canConvert && (
              <Button onClick={openConvertDialog} disabled={acting} className="bg-emerald-600 hover:bg-emerald-700">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Convert to Purchase Order
              </Button>
            )}
          </div>
        </div>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-slate-500">Requested By</p>
              <p className="font-medium text-slate-900">
                {requisition.requestedBy?.name || requisition.requestedBy?.email}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Department</p>
              <p className="font-medium text-slate-900">{requisition.department?.name || "-"}</p>
            </div>
            <div>
              <p className="text-slate-500">Project Code</p>
              <p className="font-medium text-slate-900">{requisition.projectCode || "-"}</p>
            </div>
            {requisition.notes && (
              <div className="md:col-span-3">
                <p className="text-slate-500">Notes</p>
                <p className="text-slate-700">{requisition.notes}</p>
              </div>
            )}
            {requisition.status === "REJECTED" && requisition.rejectedReason && (
              <div className="md:col-span-3 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 font-medium">Rejection reason</p>
                <p className="text-red-600">{requisition.rejectedReason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Est. Unit Cost</TableHead>
                  <TableHead className="text-right">Est. Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requisition.items.map((item, idx) => (
                  <TableRow key={item.id || idx}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      KES {item.estimatedUnitCost.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      KES {(item.estimatedSubtotal ?? item.quantity * item.estimatedUnitCost).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end mt-4 text-lg font-bold text-slate-900">
              Estimated Total: KES {requisition.estimatedTotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Requisition</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="block text-sm font-medium text-slate-700">Rejection Reason</label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              rows={3}
              placeholder="Explain what needs to change..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={acting}>
              Cancel
            </Button>
            <Button
              onClick={() => handleStatusChange("REJECTED", rejectionReason)}
              disabled={acting || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {acting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Convert to Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Vendor</label>
              <Select value={convertVendorId} onValueChange={handleConvertVendorChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} ({v.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Destination Warehouse (needed for stocked items)
              </label>
              <Select value={convertWarehouseId} onValueChange={setConvertWarehouseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">
                Choose whether each line will enter inventory or be purchased for internal use.
              </p>
              {requisition.items.map((item) => (
                <div key={item.id} className="grid grid-cols-1 gap-3 items-center border border-slate-200 rounded-lg p-3 sm:grid-cols-4">
                  <div className="text-sm text-slate-700">{item.description}</div>
                  <Select value={convertLineTypes[item.id!] ?? "NON_STOCK"} onValueChange={(value: "STOCKED" | "NON_STOCK") => setConvertLineTypes((prev) => ({ ...prev, [item.id!]: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NON_STOCK">Internal use</SelectItem>
                      <SelectItem value="STOCKED">Add to inventory</SelectItem>
                    </SelectContent>
                  </Select>
                  {(convertLineTypes[item.id!] ?? "NON_STOCK") === "STOCKED" ? <VendorProductCombobox
                    token={token!}
                    vendorId={convertVendorId}
                    placeholder="Search vendor products..."
                    selectedLabel={convertProductNames[item.id!]}
                    excludeIds={Object.entries(convertProductIds)
                      .filter(([lineId]) => lineId !== item.id)
                      .map(([, productId]) => productId)}
                    onPick={(p) => handlePickProduct(item.id!, p)}
                  /> : <div className="text-xs text-muted-foreground">No catalog product needed</div>}
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Unit price"
                    value={convertUnitPrices[item.id!] ?? item.estimatedUnitCost}
                    onChange={(e) =>
                      setConvertUnitPrices((prev) => ({
                        ...prev,
                        [item.id!]: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(false)} disabled={acting}>
              Cancel
            </Button>
            <Button onClick={handleConvert} disabled={acting} className="bg-emerald-600 hover:bg-emerald-700">
              {acting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Purchase Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
