"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  MoreHorizontal,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
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
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function ReceivablesPage() {
  const { showToast } = useToast();
  const [receivables, setReceivables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedAR, setSelectedAR] = useState<any>(null);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: "bank_transfer",
    referenceNo: "",
    notes: ""
  });

  useEffect(() => {
    fetchReceivables();
  }, []);

  const fetchReceivables = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/finance/ar/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setReceivables(data.data);
      }
    } catch (error) {
      console.error("Error fetching receivables:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = new Date() > new Date(dueDate);
    
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Paid</Badge>;
      case "partial":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Partial</Badge>;
      case "outstanding":
        return isOverdue 
          ? <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">Overdue</Badge>
          : <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">Outstanding</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleOpenPayment = (ar: any) => {
    setSelectedAR(ar);
    setPaymentData({
      amount: ar.balance,
      paymentMethod: "bank_transfer",
      referenceNo: "",
      notes: ""
    });
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedAR) return;
    
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/finance/ar/payment`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          receivableId: selectedAR.id,
          ...paymentData
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        showToast("Payment recorded successfully", undefined, "success");
        setIsPaymentModalOpen(false);
        fetchReceivables();
      } else {
        showToast("Error", data.message || "Failed to record payment", "error");
      }
    } catch (error) {
      showToast("Network error", undefined, "error");
    }
  };

  const filteredReceivables = receivables.filter(ar => 
    ar.invoice_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ar.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalReceivable = receivables.reduce((sum, ar) => sum + ar.balance, 0);
  const overdueCount = receivables.filter(ar => ar.status !== 'paid' && new Date() > new Date(ar.due_date)).length;

  return (
    <div className="p-6 space-y-6 text-slate-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts Receivable</h1>
          <p className="text-slate-500">Track and manage customer invoices and expected payments.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="text-slate-700 border-slate-200">
            Aging Report
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">KES {totalReceivable.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1">Across {receivables.length} invoices</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
            <p className="text-xs text-red-400 mt-1">Requires attention</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">84%</div>
            <p className="text-xs text-green-400 mt-1">+2.4% from last month</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg. Days to Pay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">18 Days</div>
            <p className="text-xs text-slate-400 mt-1">Based on recent history</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search invoices or customers..." 
              className="pl-9 bg-white border-slate-200 focus:ring-blue-500 flex-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">All</Badge>
            <Badge variant="secondary" className="bg-white text-slate-400 border border-slate-100 hover:bg-slate-50 cursor-pointer text-[10px]">Overdue</Badge>
            <Badge variant="secondary" className="bg-white text-slate-400 border border-slate-100 hover:bg-slate-50 cursor-pointer text-[10px]">Unpaid</Badge>
          </div>
        </div>

        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-slate-500 font-semibold text-xs">Customer</TableHead>
              <TableHead className="text-slate-500 font-semibold text-xs">Invoice No</TableHead>
              <TableHead className="text-slate-500 font-semibold text-xs">Invoice Date</TableHead>
              <TableHead className="text-slate-500 font-semibold text-xs">Due Date</TableHead>
              <TableHead className="text-slate-500 font-semibold text-xs text-right">Amount</TableHead>
              <TableHead className="text-slate-500 font-semibold text-xs text-right">Balance</TableHead>
              <TableHead className="text-slate-500 font-semibold text-xs text-center">Status</TableHead>
              <TableHead className="text-slate-500 font-semibold text-xs text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-full ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredReceivables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center py-10">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium">No open receivables found</p>
                    <p className="text-slate-400 text-xs">All invoices are currently up to date.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredReceivables.map((ar) => (
                <TableRow key={ar.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-slate-900">{ar.customer_name}</span>
                      <span className="text-[10px] text-slate-400">{ar.customer_email || "No email"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {ar.invoice_no}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {format(new Date(ar.invoice_date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    <div className="flex items-center gap-1">
                      {new Date() > new Date(ar.due_date) && ar.status !== 'paid' && <AlertCircle className="w-3 h-3 text-red-500" />}
                      {format(new Date(ar.due_date), "dd/MM/yyyy")}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-slate-900">
                    KES {ar.total_amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-sm font-bold text-slate-900">
                    KES {ar.balance.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(ar.status, ar.due_date)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100">
                          <MoreHorizontal className="w-4 h-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Invoice Options</DropdownMenuLabel>
                        <DropdownMenuItem 
                          className="gap-2 cursor-pointer"
                          onClick={() => handleOpenPayment(ar)}
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Record Payment
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer">
                          <Clock className="w-4 h-4 text-blue-500" />
                          Follow Up
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 cursor-pointer">
                          <Plus className="w-4 h-4 text-slate-500" />
                          View Sales Link
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Customer Payment</DialogTitle>
            <DialogDescription>
              {selectedAR && `Recording payment for invoice ${selectedAR.invoice_no} (${selectedAR.customer_name})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Amount (KES)</Label>
              <Input 
                type="number" 
                value={paymentData.amount} 
                onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
              />
              <p className="text-[10px] text-slate-400">Remaining balance: KES {selectedAR?.balance.toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select 
                value={paymentData.paymentMethod} 
                onValueChange={(v) => setPaymentData({ ...paymentData, paymentMethod: v })}
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
                onChange={(e) => setPaymentData({ ...paymentData, referenceNo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input 
                placeholder="Optional payment notes" 
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} className="bg-blue-600 hover:bg-blue-700">Submit Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
