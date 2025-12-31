// frontend/components/pos/POSHistory.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Search, Eye, Printer, RefreshCw, Calendar, Download } from "lucide-react";
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

interface POSHistoryProps {
  branchId: string;
}

type SaleRecord = {
  id: string;
  invoice_no: string;
  total: number;
  payment_method: string;
  created_at: string;
  customer_name?: string;
  items_count: number;
  status: string;
};

export const POSHistory: React.FC<POSHistoryProps> = ({ branchId }) => {
  const { toast } = useToast();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [paymentFilter, setPaymentFilter] = useState("all");

  useEffect(() => {
    fetchSales();
  }, [dateFilter, paymentFilter]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        branchId,
        date: dateFilter,
        payment_method: paymentFilter !== "all" ? paymentFilter : "",
      });

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
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-KE", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      sale.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-linear-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
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
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by invoice or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="mpesa">M-Pesa</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600">Total Sales</p>
              <p className="text-2xl font-bold">{filteredSales.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600">Total Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600">Average Sale</p>
              <p className="text-2xl font-bold">
                {formatCurrency(filteredSales.length > 0 ? totalSales / filteredSales.length : 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sales Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No sales found</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Date & Time</TableHead>
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
                      {formatDate(sale.created_at)}
                    </TableCell>
                    <TableCell>
                      {sale.customer_name || <span className="text-slate-400">Walk-in</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{sale.items_count} items</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {sale.payment_method}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(sale.total)}
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
