"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { getApiUrl } from "@/lib/api-config";
import { getAuthHeadersWithToken } from "@/lib/api-utils";
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  ArrowDownLeft,
  AlertCircle,
  TrendingDown,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTable, createColumnHelper, type SortingState } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { tableFeaturesConfig, type AppTableFeatures } from "@/lib/table/table-features";
import { cn } from "@/lib/utils";

export default function PayablesPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [payables, setPayables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "outstanding" | "partial" | "paid">("all");

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedAP, setSelectedAP] = useState<any>(null);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: "bank_transfer",
    referenceNo: "",
    notes: "",
  });

  const fetchPayables = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const headers = getAuthHeadersWithToken(token);
      const res = await fetch(getApiUrl("/v1/finance/ap/list"), { headers });
      const data = await res.json();
      if (data.status === "success") {
        setPayables(data.data);
      }
    } catch (error) {
      console.error("Error fetching payables:", error);
      toast("Failed to load payables", "error");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPayables();
  }, [fetchPayables]);

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = new Date() > new Date(dueDate);
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
            Paid
          </Badge>
        );
      case "partial":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
            Partial
          </Badge>
        );
      case "outstanding":
        return isOverdue ? (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">
            Overdue
          </Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">
            Outstanding
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleOpenPayment = (ap: any) => {
    setSelectedAP(ap);
    setPaymentData({
      amount: ap.balance,
      paymentMethod: "bank_transfer",
      referenceNo: "",
      notes: "",
    });
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedAP || !token) return;
    try {
      const res = await fetch(getApiUrl("/v1/finance/ap/payment"), {
        method: "POST",
        headers: getAuthHeadersWithToken(token),
        body: JSON.stringify({
          payableId: selectedAP.id,
          ...paymentData,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast("Payment recorded successfully", "success");
        setIsPaymentModalOpen(false);
        fetchPayables();
      } else {
        toast(data.message || "Failed to record payment", "error");
      }
    } catch {
      toast("Network error — please try again", "error");
    }
  };

  const filteredPayables = payables.filter((ap) => {
    const matchesSearch =
      ap.bill_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ap.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || ap.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPayable = payables
    .filter((ap) => ap.status !== "paid")
    .reduce((sum, ap) => sum + (ap.balance || 0), 0);

  const overdueCount = payables.filter(
    (ap) => ap.status !== "paid" && new Date() > new Date(ap.due_date)
  ).length;

  const overdueAmount = payables
    .filter((ap) => ap.status !== "paid" && new Date() > new Date(ap.due_date))
    .reduce((sum, ap) => sum + (ap.balance || 0), 0);

  const partialCount = payables.filter((ap) => ap.status === "partial").length;

  const columnHelper = useMemo(() => createColumnHelper<AppTableFeatures, any>(), []);
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor((row) => row.vendor_name, {
          id: "vendor",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Vendor Name" />,
          cell: (ctx) => (
            <div className="flex flex-col">
              <span className="font-bold text-sm text-slate-700">{ctx.getValue()}</span>
              <span className="text-[10px] text-slate-400">
                {ctx.row.original.vendor_email || "N/A"}
              </span>
            </div>
          ),
          sortFn: "text",
        }),
        columnHelper.accessor((row) => row.bill_no, {
          id: "billNo",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Bill Reference" />,
          cell: (ctx) => (
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              {ctx.getValue()}
            </span>
          ),
          sortFn: "text",
        }),
        columnHelper.accessor((row) => new Date(row.bill_date).getTime(), {
          id: "billDate",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Bill Date" />,
          cell: (ctx) => (
            <span className="text-[11px] text-slate-500">
              {format(new Date(ctx.row.original.bill_date), "MMM dd, yyyy")}
            </span>
          ),
          sortFn: "alphanumeric",
        }),
        columnHelper.accessor((row) => new Date(row.due_date).getTime(), {
          id: "dueDate",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Due Date" />,
          cell: (ctx) => {
            const ap = ctx.row.original;
            return (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                {new Date() > new Date(ap.due_date) && ap.status !== "paid" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                )}
                {format(new Date(ap.due_date), "MMM dd, yyyy")}
              </div>
            );
          },
          sortFn: "alphanumeric",
        }),
        columnHelper.accessor((row) => row.total_amount, {
          id: "total",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Total" className="w-full justify-end" />
          ),
          cell: (ctx) => (
            <div className="text-right text-xs font-semibold text-slate-600">
              KES {ctx.getValue()?.toLocaleString()}
            </div>
          ),
          sortFn: "alphanumeric",
        }),
        columnHelper.accessor((row) => row.balance, {
          id: "balance",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Balance" className="w-full justify-end" />
          ),
          cell: (ctx) => (
            <div className="text-right text-sm font-black text-slate-800">
              KES {ctx.getValue()?.toLocaleString()}
            </div>
          ),
          sortFn: "alphanumeric",
        }),
        columnHelper.accessor((row) => row.status, {
          id: "status",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Status" className="w-full justify-center" />
          ),
          cell: (ctx) => (
            <div className="text-center">{getStatusBadge(ctx.getValue(), ctx.row.original.due_date)}</div>
          ),
          sortFn: "text",
        }),
        columnHelper.display({
          id: "action",
          header: () => <div className="text-right pr-6">Action</div>,
          enableSorting: false,
          cell: (ctx) => {
            const ap = ctx.row.original;
            return (
              <div className="text-right pr-6">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 hover:bg-white hover:shadow-sm transition-all rounded-xl"
                    >
                      <MoreHorizontal className="w-4 h-4 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-xl">
                    <DropdownMenuLabel className="text-[10px] uppercase text-slate-400 tracking-widest">
                      Bill Options
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      className="gap-2.5 py-2.5 cursor-pointer text-sm font-medium"
                      onClick={() => handleOpenPayment(ap)}
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Mark as Settled
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2.5 py-2.5 cursor-pointer text-sm font-medium">
                      <Clock className="w-4 h-4 text-blue-500" />
                      View History
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-50" />
                    <DropdownMenuItem className="gap-2.5 py-2.5 cursor-pointer text-sm font-medium text-red-500">
                      <AlertCircle className="w-4 h-4" />
                      Dispute Bill
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          },
        }),
      ]),
    [columnHelper]
  );

  const table = useTable({
    features: tableFeaturesConfig,
    data: filteredPayables,
    columns,
    onSortingChange: setSorting,
    state: { sorting },
  });

  // No pagination is wanted here, so rows are read via getPrePaginatedRowModel()
  // rather than getRowModel() — see the note in lib/table/table-features.ts.
  const rows = table.getPrePaginatedRowModel().rows;

  return (
    <div className="p-6 space-y-6 bg-slate-50/30 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Accounts Payable
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage vendor bills, purchase orders, and outgoing payments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-slate-700 border-slate-200 hover:bg-slate-50 bg-white"
          >
            <Filter className="w-4 h-4 mr-2 text-slate-400" />
            Vendor List
          </Button>
          <Button className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-md">
            <Plus className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Card className="shadow-sm border-slate-100 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {loading ? (
                <Skeleton className="h-7 w-28" />
              ) : (
                `KES ${totalPayable.toLocaleString()}`
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {payables.filter((p) => p.status !== "paid").length} active bills
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-red-100 bg-red-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
              Overdue Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {loading ? <Skeleton className="h-7 w-12" /> : overdueCount}
            </div>
            <p className="text-xs text-red-400 mt-1">
              {loading ? "—" : `KES ${overdueAmount.toLocaleString()} at risk`}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-amber-100 bg-amber-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
              Partially Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {loading ? <Skeleton className="h-7 w-12" /> : partialCount}
            </div>
            <p className="text-xs text-amber-500 mt-1">Awaiting balance</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-100 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Payment Cycle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-400" />
              30 Days
            </div>
            <p className="text-xs text-slate-400 mt-1">Standard terms</p>
          </CardContent>
        </Card>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <Input
              placeholder="Search by vendor or bill number..."
              className="pl-11 h-11 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-slate-200 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            {(["all", "outstanding", "partial", "paid"] as const).map((s) => (
              <Badge
                key={s}
                variant="secondary"
                className={`cursor-pointer capitalize text-xs transition-colors ${
                  statusFilter === s
                    ? "bg-emerald-700 text-white hover:bg-emerald-800"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
                onClick={() => setStatusFilter(s)}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </Badge>
            ))}
          </div>
        </div>

        <Table>
          <TableHeader className="bg-slate-50/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "text-slate-400 font-bold text-[10px] uppercase",
                      header.column.id === "vendor" && "pl-6",
                      ["total", "balance"].includes(header.column.id) && "text-right",
                      header.column.id === "status" && "text-center",
                      header.column.id === "action" && "text-right pr-6"
                    )}
                  >
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-slate-50">
                  <TableCell className="pl-6">
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-5 w-16 mx-auto rounded-full" />
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-48 text-center py-10 border-none"
                >
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center">
                      <ArrowDownLeft className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-semibold text-sm">
                      No pending payables
                    </p>
                    <p className="text-slate-300 text-[10px]">
                      {statusFilter !== "all"
                        ? `No bills with status "${statusFilter}"`
                        : "Your balance with vendors is currently clear."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-slate-50/30 transition-colors border-slate-50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "py-4",
                        cell.column.id === "vendor" && "pl-6",
                        cell.column.id === "action" && "pr-6"
                      )}
                    >
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Vendor Payment</DialogTitle>
            <DialogDescription>
              {selectedAP &&
                `Recording payment for bill ${selectedAP.bill_no} (${selectedAP.vendor_name})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Amount (KES)</Label>
              <Input
                type="number"
                value={paymentData.amount}
                onChange={(e) =>
                  setPaymentData({
                    ...paymentData,
                    amount: Number(e.target.value),
                  })
                }
              />
              <p className="text-[10px] text-slate-400">
                Remaining balance: KES {selectedAP?.balance?.toLocaleString()}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={paymentData.paymentMethod}
                onValueChange={(v) =>
                  setPaymentData({ ...paymentData, paymentMethod: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input
                placeholder="e.g. TRN12345678"
                value={paymentData.referenceNo}
                onChange={(e) =>
                  setPaymentData({
                    ...paymentData,
                    referenceNo: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                placeholder="Optional payment notes"
                value={paymentData.notes}
                onChange={(e) =>
                  setPaymentData({ ...paymentData, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsPaymentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              Submit Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
