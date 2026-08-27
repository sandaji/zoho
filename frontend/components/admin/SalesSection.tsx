"use client";

import { useEffect, useState } from "react";
import { AdminTable, Column } from "./AdminTable";
import { Sales, fetchSales } from "@/lib/admin-api";
import CreateCreditNoteDialog from "./CreateCreditNoteDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/utils";
import { Button } from "../ui/button";
import { SalesStatus, PaymentMethod } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import SalesPerformance from "./sections/SalesPerformance";

const statusVariant = (status: string) => {
  switch (status) {
    case "confirmed":
      return "default";
    case "delivered":
      return "default";
    case "cancelled":
      return "destructive";
    case "returned":
      return "secondary";
    default:
      return "secondary";
  }
};

export default function SalesSection() {
  const { token } = useAuth();
  const [sales, setSales] = useState<Sales[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sales | null>(null);
  const [returnSale, setReturnSale] = useState<Sales | null>(null);
  const [viewMode, setViewMode] = useState<"orders" | "performance">("orders");

  const loadSales = () => {
    if (token) {
      setLoading(true);
      fetchSales(token)
        .then(setSales)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    loadSales();
  }, [token]);

  const columns: Column<Sales>[] = [
    { key: "invoice_no", label: "Invoice" },
    {
      key: "createdAt",
      label: "Date",
      render: (date) => new Date(date as string).toLocaleDateString(),
    },
    {
      key: "branch.name",
      label: "Branch",
      render: (branchName) => (branchName as string) || "-",
    },
    {
      key: "user.name",
      label: "Cashier",
      render: (userName) => (userName as string) || "-",
    },
    {
      key: "grand_total",
      label: "Total",
      render: (total) => formatCurrency(total as number),
    },
    {
      key: "payment_method",
      label: "Payment",
      render: (method) => (
        <Badge variant="outline" className="uppercase">
          {method as PaymentMethod}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (status) => (
        <Badge variant={statusVariant(status as string)}>
          {(status as SalesStatus).toUpperCase()}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Sales</h2>
          <p className="text-sm text-slate-500">
            View recent transactions and sales performance summary.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode("orders")}
              className={`px-3 py-1 rounded ${viewMode === "orders" ? "bg-emerald-600 text-white" : "bg-white text-slate-700 border"}`}
            >
              Orders
            </button>
            <button
              onClick={() => setViewMode("performance")}
              className={`px-3 py-1 rounded ${viewMode === "performance" ? "bg-emerald-600 text-white" : "bg-white text-slate-700 border"}`}
            >
              Performance
            </button>
          </div>
        </div>
      </div>

      {viewMode === "orders" ? (
        <>
          <AdminTable
            title="Sales Orders"
            data={sales}
            columns={columns}
            loading={loading}
            searchKeys={["invoice_no", "branch.name", "user.name", "status"]}
            actions={(sale) => (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedSale(sale)}>
                  View
                </Button>
                {sale.status !== "cancelled" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => setReturnSale(sale)}
                  >
                    Return / CN
                  </Button>
                )}
              </div>
            )}
          />

          <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Sale Details - {selectedSale?.invoice_no}</DialogTitle>
              </DialogHeader>
              {selectedSale && (
                <div className="space-y-4">
                  {/* Header Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Invoice</p>
                      <p className="text-sm font-semibold">{selectedSale.invoice_no}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge variant={statusVariant(selectedSale.status)}>
                        {selectedSale.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Date</p>
                      <p className="text-sm">{new Date(selectedSale.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Payment</p>
                      <Badge variant="outline" className="uppercase">
                        {selectedSale.payment_method}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Branch</p>
                      <p className="text-sm">{selectedSale.branch?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Cashier</p>
                      <p className="text-sm">{selectedSale.user?.name || "-"}</p>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="border rounded-md mt-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product ID</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSale.items?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-xs font-mono">{item.productId}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.unitPrice)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.quantity * item.unitPrice)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Totals */}
                  <div className="flex flex-col items-end space-y-1 pt-4 border-t">
                    <div className="flex justify-between w-48 text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatCurrency(selectedSale.subtotal)}</span>
                    </div>
                    <div className="flex justify-between w-48 text-sm">
                      <span className="text-muted-foreground">Tax:</span>
                      <span>{formatCurrency(selectedSale.tax)}</span>
                    </div>
                    <div className="flex justify-between w-48 font-bold text-lg pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedSale.grand_total)}</span>
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button
                      variant="destructive"
                      className="bg-amber-600 hover:bg-amber-700"
                      onClick={() => {
                        setSelectedSale(null);
                        setReturnSale(selectedSale);
                      }}
                    >
                      Issue Credit Note
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <CreateCreditNoteDialog
            sale={returnSale}
            isOpen={!!returnSale}
            onClose={() => setReturnSale(null)}
            onSuccess={loadSales}
          />
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <SalesPerformance />
        </div>
      )}
    </>
  );
}
