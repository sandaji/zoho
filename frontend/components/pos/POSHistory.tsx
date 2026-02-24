// frontend/components/pos/POSHistory.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Eye, Printer, RefreshCw, Calendar, Download, X, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiUrl, API_ENDPOINTS, getAuthHeaders } from "@/lib/api-config";
import { useToast } from "@/lib/toast-context";
import { formatCurrency, safeFormatDate } from "@/lib/utils";

interface POSHistoryProps {
  branchId: string;
}

type SaleRecord = {
  id: string;
  invoice_no: string;
  grand_total: number | string;
  payment_method: string;
  created_date: string | Date;
  customer_name?: string;
  items?: { id: string }[];
  status: string;
};

// Returns YYYY-MM-DD for today in local timezone
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const POSHistory: React.FC<POSHistoryProps> = ({ branchId }) => {
  const { toast } = useToast();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Date range state — default to today
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());

  // Payment method filter
  const [paymentFilter, setPaymentFilter] = useState("all");

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ branchId });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (paymentFilter && paymentFilter !== "all") {
        params.set("payment_method", paymentFilter);
      }

      const res = await fetch(`${getApiUrl(API_ENDPOINTS.POS_SALES)}?${params}`, {
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (json.success) {
        setSales(json.data || []);
      } else {
        toast(json.message || "Failed to fetch sales", "error");
      }
    } catch (error) {
      toast("Failed to fetch sales history", "error");
      console.error("Fetch sales error:", error);
    } finally {
      setLoading(false);
    }
  }, [branchId, startDate, endDate, paymentFilter]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Quick date presets
  const applyPreset = (preset: "today" | "yesterday" | "week" | "month" | "all") => {
    const now = new Date();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    switch (preset) {
      case "today": {
        const t = fmt(now);
        setStartDate(t);
        setEndDate(t);
        break;
      }
      case "yesterday": {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        const yStr = fmt(y);
        setStartDate(yStr);
        setEndDate(yStr);
        break;
      }
      case "week": {
        const mon = new Date(now);
        mon.setDate(now.getDate() - now.getDay() + 1);
        setStartDate(fmt(mon));
        setEndDate(fmt(now));
        break;
      }
      case "month": {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        setStartDate(fmt(first));
        setEndDate(fmt(now));
        break;
      }
      case "all": {
        setStartDate("");
        setEndDate("");
        break;
      }
    }
  };

  const clearDates = () => {
    setStartDate("");
    setEndDate("");
  };

  const formatDate = (date: string | Date | null | undefined) =>
    safeFormatDate(date, { dateStyle: "short", timeStyle: "short" });

  // Client-side search filter only (date + payment already handled server-side)
  const filteredSales = sales.filter((sale) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      sale.invoice_no.toLowerCase().includes(q) ||
      (sale.customer_name?.toLowerCase().includes(q) ?? false)
    );
  });

  const totalSales = filteredSales.reduce((sum, sale) => sum + Number(sale.grand_total ?? 0), 0);

  const PAYMENT_LABELS: Record<string, string> = {
    all: "All Methods",
    cash: "Cash",
    card: "Card",
    mpesa: "M-Pesa",
    cheque: "Cheque",
    bank_transfer: "Bank Transfer",
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-linear-to-r from-emerald-50 to-indigo-50 rounded-lg py-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Sales History
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchSales} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">

        {/* ── Filters Row ── */}
        <div className="rounded-lg border bg-slate-50 p-4 space-y-4">

          {/* Quick presets */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-medium text-slate-500 mr-1">Quick:</span>
            {(["today", "yesterday", "week", "month", "all"] as const).map((p) => (
              <Button
                key={p}
                variant="outline"
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => applyPreset(p)}
              >
                {p === "today" ? "Today"
                  : p === "yesterday" ? "Yesterday"
                    : p === "week" ? "This Week"
                      : p === "month" ? "This Month"
                        : "All Time"}
              </Button>
            ))}
          </div>

          {/* Date range inputs + payment method */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            {/* From date */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600">From Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || undefined}
                className="h-9"
              />
            </div>

            {/* To date */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600">To Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                className="h-9"
              />
            </div>

            {/* Payment method */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600">Payment Method</Label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear button */}
            <div className="flex gap-2">
              {(startDate || endDate) && (
                <Button variant="ghost" size="sm" className="h-9 text-slate-500" onClick={clearDates}>
                  <X className="h-4 w-4 mr-1" />
                  Clear Dates
                </Button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by invoice number or customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Active filter badges */}
          {(paymentFilter !== "all" || startDate || endDate) && (
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs text-slate-400 self-center"><Filter className="inline h-3 w-3 mr-1" />Active filters:</span>
              {(startDate || endDate) && (
                <Badge variant="secondary" className="text-xs">
                  {startDate || "…"} → {endDate || "…"}
                  <button className="ml-1 opacity-60 hover:opacity-100" onClick={clearDates}>×</button>
                </Badge>
              )}
              {paymentFilter !== "all" && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {PAYMENT_LABELS[paymentFilter] ?? paymentFilter}
                  <button className="ml-1 opacity-60 hover:opacity-100" onClick={() => setPaymentFilter("all")}>×</button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-slate-600">Total Transactions</p>
              <p className="text-2xl font-bold">{filteredSales.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-slate-600">Total Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-slate-600">Average Sale</p>
              <p className="text-2xl font-bold">
                {formatCurrency(filteredSales.length > 0 ? totalSales / filteredSales.length : 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Sales Table ── */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-2">
            <Calendar className="h-10 w-10 mx-auto opacity-30" />
            <p className="font-medium">No sales found</p>
            <p className="text-sm">Try adjusting the date range or filters</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Date &amp; Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{sale.invoice_no}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {formatDate(sale.created_date)}
                    </TableCell>
                    <TableCell>
                      {sale.customer_name || <span className="text-slate-400">Walk-in</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{sale.items?.length ?? 0} items</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {sale.payment_method === "bank_transfer"
                          ? "Bank Transfer"
                          : sale.payment_method}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(sale.grand_total)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
