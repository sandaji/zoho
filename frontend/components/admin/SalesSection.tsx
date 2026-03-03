"use client";

import { useEffect, useState } from "react";
import { AdminTable, Column } from "./AdminTable";
import { Sales, fetchSales } from "@/lib/admin-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { Button } from "../ui/button";
import { SalesStatus, PaymentMethod } from "@/lib/types";

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

  useEffect(() => {
    if (token) {
      fetchSales(token)
        .then(setSales)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
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
      render: (total) => `KES ${(total as number).toLocaleString()}`,
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
      <AdminTable
        title="Sales Orders"
        data={sales}
        columns={columns}
        loading={loading}
        searchKeys={["invoice_no", "branch.name", "user.name", "status"]}
        actions={(sale) => (
          <Button variant="outline" size="sm" onClick={() => setSelectedSale(sale)}>
            View Details
          </Button>
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
                  <p className="text-sm">
                    {new Date(selectedSale.createdAt).toLocaleString()}
                  </p>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
