"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Search, Eye, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  paymentVoucherService,
  VOUCHER_STATUS_COLORS,
  type PaymentVoucher,
  type VoucherStatus,
} from "@/lib/payment-voucher.service";
import { toast } from "sonner";

export default function PaymentVouchersPage() {
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VoucherStatus | "ALL">("ALL");

  const perms = user?.permissions ?? [];
  const canCreate = perms.includes("finance.voucher.create");
  const seesAll =
    perms.includes("finance.voucher.view_all") ||
    perms.includes("finance.voucher.pay") ||
    perms.some((p) => p.startsWith("finance.voucher.approve_"));

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await paymentVoucherService.list();
        setVouchers(data.vouchers || []);
      } catch (error) {
        console.error("Failed to fetch payment vouchers:", error);
        toast.error("Failed to load payment vouchers");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () =>
      vouchers.filter((v) => {
        const q = search.toLowerCase();
        const matchesSearch =
          v.voucherNumber.toLowerCase().includes(q) || v.payeeName.toLowerCase().includes(q);
        return matchesSearch && (statusFilter === "ALL" || v.status === statusFilter);
      }),
    [vouchers, search, statusFilter],
  );

  const cols = seesAll ? 7 : 6;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Payment Vouchers</h1>
          <p className="text-slate-500">
            {seesAll
              ? "Money going out of the business — raised, approved and paid here"
              : "Payments you have raised and where they are in approval"}
          </p>
        </div>
        {canCreate && (
          <Link href="/dashboard/finance/vouchers/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              New Voucher
            </Button>
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by voucher number or payee..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as VoucherStatus | "ALL")}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SUBMITTED">Awaiting approval</SelectItem>
              <SelectItem value="APPROVED">Approved — to pay</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Voucher #</TableHead>
              <TableHead>Payee</TableHead>
              <TableHead>Category</TableHead>
              {seesAll && <TableHead>Raised by</TableHead>}
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={cols} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mx-auto" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={cols} className="h-24 text-center text-slate-500">
                  No payment vouchers found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((v) => (
                <TableRow key={v.id} className="hover:bg-emerald-50/50">
                  <TableCell>
                    <Link
                      href={`/dashboard/finance/vouchers/${v.id}`}
                      className="font-medium text-emerald-600 hover:underline"
                    >
                      {v.voucherNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-700">{v.payeeName}</TableCell>
                  <TableCell className="text-slate-700">{v.category}</TableCell>
                  {seesAll && (
                    <TableCell className="text-slate-700">
                      {v.requestedBy?.name || v.requestedBy?.email || "-"}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-semibold text-slate-900">
                    KES {v.amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge className={VOUCHER_STATUS_COLORS[v.status]}>{v.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/finance/vouchers/${v.id}`}>
                      <Button variant="ghost" size="sm" className="hover:text-emerald-600">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
