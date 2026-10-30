"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Send, Banknote, Undo2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  paymentVoucherService,
  VOUCHER_STATUS_COLORS,
  PAYMENT_METHODS,
  type PaymentVoucher,
} from "@/lib/payment-voucher.service";
import { toast } from "sonner";

const who = (p?: { name?: string | null; email: string } | null) => p?.name || p?.email || "-";
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString() : "-");

export default function PaymentVoucherDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const id = params.id as string;

  const [voucher, setVoucher] = useState<PaymentVoucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const perms = user?.permissions || [];

  const load = async () => {
    try {
      setLoading(true);
      setVoucher(await paymentVoucherService.getById(id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load voucher");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    try {
      setActing(true);
      await fn();
      toast.success(okMsg);
      setRejectOpen(false);
      setReason("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
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
  if (!voucher) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-slate-500">Payment voucher not found.</p>
      </div>
    );
  }

  const isOwner = voucher.requestedById === user?.id;
  const tier =
    voucher.amount < 10000 ? "standard" : voucher.amount < 100000 ? "high_value" : "executive";
  const canApprove =
    perms.includes(`finance.voucher.approve_${tier}`) ||
    perms.includes("finance.voucher.approve_executive");
  const canPay = perms.includes("finance.voucher.pay");
  const methodLabel =
    PAYMENT_METHODS.find((m) => m.value === voucher.paymentMethod)?.label ?? voucher.paymentMethod;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/finance/vouchers">
              <Button variant="ghost" size="sm" className="hover:text-emerald-600">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{voucher.voucherNumber}</h1>
              <Badge className={VOUCHER_STATUS_COLORS[voucher.status]}>{voucher.status}</Badge>
            </div>
          </div>

          <div className="flex gap-3 items-center flex-wrap">
            {voucher.status === "DRAFT" && isOwner && (
              <Button
                disabled={acting}
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() =>
                  run(() => paymentVoucherService.updateStatus(id, "SUBMITTED"), "Submitted for approval")
                }
              >
                <Send className="h-4 w-4 mr-2" />
                Submit for Approval
              </Button>
            )}
            {voucher.status === "SUBMITTED" && !isOwner && canApprove && (
              <>
                <Button
                  disabled={acting}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() =>
                    run(() => paymentVoucherService.updateStatus(id, "APPROVED"), "Voucher approved")
                  }
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  disabled={acting}
                  onClick={() => setRejectOpen(true)}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            {voucher.status === "SUBMITTED" && isOwner && canApprove && (
              <p className="text-xs text-slate-500">
                You can't approve your own voucher — segregation of duties.
              </p>
            )}
            {voucher.status === "APPROVED" && canPay && !isOwner && (
              <Button
                disabled={acting}
                className="bg-slate-900 hover:bg-slate-800"
                onClick={() => {
                  if (
                    window.confirm(
                      `Pay KES ${voucher.amount.toLocaleString()} to ${voucher.payeeName} via ${methodLabel}? This posts to the ledger.`,
                    )
                  )
                    run(() => paymentVoucherService.pay(id), "Payment recorded and posted");
                }}
              >
                <Banknote className="h-4 w-4 mr-2" />
                Pay Now
              </Button>
            )}
            {voucher.status === "APPROVED" && canPay && isOwner && (
              <p className="text-xs text-slate-500">
                You raised this voucher, so someone else must pay it.
              </p>
            )}
            {voucher.status === "REJECTED" && isOwner && (
              <Button
                variant="outline"
                disabled={acting}
                onClick={() => run(() => paymentVoucherService.updateStatus(id, "DRAFT"), "Returned to draft")}
              >
                <Undo2 className="h-4 w-4 mr-2" />
                Reopen as Draft
              </Button>
            )}
            {(voucher.status === "DRAFT" ||
              voucher.status === "SUBMITTED" ||
              voucher.status === "APPROVED" ||
              voucher.status === "REJECTED") &&
              (isOwner || canPay) && (
                <Button
                  variant="ghost"
                  disabled={acting}
                  className="text-slate-500 hover:text-red-600"
                  onClick={() => {
                    if (window.confirm("Cancel this voucher?"))
                      run(() => paymentVoucherService.updateStatus(id, "CANCELLED"), "Voucher cancelled");
                  }}
                >
                  Cancel
                </Button>
              )}
          </div>
        </div>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Payment</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-slate-500">Payee</p>
              <p className="font-medium text-slate-900">{voucher.payeeName}</p>
            </div>
            <div>
              <p className="text-slate-500">Amount</p>
              <p className="text-lg font-bold text-slate-900">
                KES {voucher.amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Category</p>
              <p className="font-medium text-slate-900">{voucher.category}</p>
            </div>
            <div>
              <p className="text-slate-500">Charged to</p>
              <p className="font-medium text-slate-900">
                {voucher.expenseAccount
                  ? `${voucher.expenseAccount.account_code} — ${voucher.expenseAccount.account_name}`
                  : "General operating expenses"}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Paid from</p>
              <p className="font-medium text-slate-900">{methodLabel}</p>
            </div>
            <div>
              <p className="text-slate-500">Payment date</p>
              <p className="font-medium text-slate-900">
                {new Date(voucher.paymentDate).toLocaleDateString()}
              </p>
            </div>
            {voucher.referenceNo && (
              <div>
                <p className="text-slate-500">Reference</p>
                <p className="font-medium text-slate-900">{voucher.referenceNo}</p>
              </div>
            )}
            <div className="md:col-span-2">
              <p className="text-slate-500">Description</p>
              <p className="text-slate-700">{voucher.description}</p>
            </div>
            {voucher.status === "REJECTED" && voucher.rejectedReason && (
              <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 font-medium">Rejection reason</p>
                <p className="text-red-600">{voucher.rejectedReason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Trail</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Raised by</p>
              <p className="font-medium text-slate-900">{who(voucher.requestedBy)}</p>
              <p className="text-xs text-slate-400">{fmt(voucher.createdAt)}</p>
            </div>
            <div>
              <p className="text-slate-500">Approved / reviewed by</p>
              <p className="font-medium text-slate-900">{who(voucher.approvedBy)}</p>
              <p className="text-xs text-slate-400">{fmt(voucher.approvedAt)}</p>
            </div>
            <div>
              <p className="text-slate-500">Paid by</p>
              <p className="font-medium text-slate-900">{who(voucher.paidBy)}</p>
              <p className="text-xs text-slate-400">{fmt(voucher.paidAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment Voucher</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="block text-sm font-medium text-slate-700">Rejection Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
              disabled={acting || !reason.trim()}
              className="bg-red-600 hover:bg-red-700"
              onClick={() =>
                run(() => paymentVoucherService.updateStatus(id, "REJECTED", reason), "Voucher rejected")
              }
            >
              {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
