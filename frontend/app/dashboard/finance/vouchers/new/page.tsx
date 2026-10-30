"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import {
  paymentVoucherService,
  PAYMENT_METHODS,
  VOUCHER_CATEGORIES,
} from "@/lib/payment-voucher.service";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);

export default function NewPaymentVoucherPage() {
  const router = useRouter();
  const [payeeName, setPayeeName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [referenceNo, setReferenceNo] = useState("");
  const [paymentDate, setPaymentDate] = useState(today());
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [accounts, setAccounts] = useState<{ id: string; account_code: string; account_name: string }[]>([]);
  const [submittingAs, setSubmittingAs] = useState<"DRAFT" | "SUBMITTED" | null>(null);

  useEffect(() => {
    paymentVoucherService.expenseAccounts().then(setAccounts);
  }, []);

  const handleSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    if (!payeeName.trim() || !category || !description.trim() || amount <= 0) {
      toast.error("Payee, category, description and an amount greater than zero are required");
      return;
    }
    try {
      setSubmittingAs(status);
      const v = await paymentVoucherService.create({
        payeeName,
        category,
        description,
        amount,
        paymentMethod,
        referenceNo: referenceNo || undefined,
        paymentDate,
        expenseAccountId: expenseAccountId || undefined,
        status,
      });
      toast.success(status === "DRAFT" ? "Voucher saved as draft" : "Voucher submitted for approval");
      router.push(`/dashboard/finance/vouchers/${v.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create voucher");
    } finally {
      setSubmittingAs(null);
    }
  };

  const busy = submittingAs !== null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/finance/vouchers">
            <Button variant="ghost" size="sm" className="hover:text-emerald-600">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">New Payment Voucher</h1>
            <p className="text-slate-500">Record money going out — it is paid once approved</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => handleSubmit("DRAFT")} disabled={busy}>
            {submittingAs === "DRAFT" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSubmit("SUBMITTED")}
            disabled={busy}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {submittingAs === "SUBMITTED" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Submit for Approval
          </Button>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Payment Details</CardTitle>
          <CardDescription>Who is being paid, what for, and how</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Payee</label>
            <Input
              placeholder="e.g. Kenya Power, landlord, contractor"
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {VOUCHER_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <Input
              placeholder="What is this payment for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Amount (KES)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              className="text-right"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Payment Date</label>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Pay from</label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Reference (optional)</label>
            <Input
              placeholder="Invoice, cheque or transaction no."
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
            />
          </div>
          {accounts.length > 0 && (
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Charge to account (optional)</label>
              <Select value={expenseAccountId} onValueChange={setExpenseAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="General operating expenses (default)" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.account_code} — {a.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
