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
  const [convertUnitPrices, setConvertUnitPrices] = useState<Record<string, number>>({});

  const permissions = user?.permissions || [];
  const canApprove = (level: "standard" | "high_value" | "executive") =>
    permissions.includes(`purchasing.requisition.approve_${level}`) ||
    permissions.includes("purchasing.requisition.approve_executive");
  const canConvert = permissions.includes("purchasing.requisition.convert");

  const approvalLevel = requisition
    ? requisition.estimatedTotal < 10000
      ? "standard"
      : requisition.estimatedTotal < 100000
        ? "high_value"
        : "executive"
    : "standard";

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
    if (vendors.length === 0 && token) {
      try {
        const data = await purchasingService.getVendors(token);
        setVendors(data.vendors || data || []);
      } catch (error) {
        console.error("Failed to fetch vendors:", error);
      }
    }
  };

  const handleConvert = async () => {
    if (!requisition) return;
    if (!convertVendorId) {
      toast.error("Select a vendor");
      return;
    }
    const items = requisition.items.map((item) => ({
      requisitionItemId: item.id!,
      productId: convertProductIds[item.id!] || "",
      unitPrice: convertUnitPrices[item.id!] ?? item.estimatedUnitCost,
    }));
    if (items.some((i) => !i.productId)) {
      toast.error("Select a catalog product for every line item");
      return;
    }
    try {
      setActing(true);
      await requisitionService.convertToPurchaseOrder(id, { vendorId: convertVendorId, items });
      toast.success("Converted to Purchase Order");
      router.push("/dashboard/purchasing/orders");
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
            {requisition.status === "SUBMITTED" && canApprove(approvalLevel) && !isOwner && (
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
            {requisition.status === "SUBMITTED" && requisition.requestedById === user?.id && canApprove(approvalLevel) && (
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
              <Select value={convertVendorId} onValueChange={setConvertVendorId}>
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
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">
                Match each line to a catalog product from that vendor and confirm the price
              </p>
              {requisition.items.map((item) => (
                <div key={item.id} className="grid grid-cols-3 gap-3 items-center border border-slate-200 rounded-lg p-3">
                  <div className="text-sm text-slate-700">{item.description}</div>
                  <Input
                    placeholder="Product ID"
                    value={convertProductIds[item.id!] || ""}
                    onChange={(e) =>
                      setConvertProductIds((prev) => ({ ...prev, [item.id!]: e.target.value }))
                    }
                  />
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
