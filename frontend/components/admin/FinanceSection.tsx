"use client";

import { useEffect, useState } from "react";
import { AdminTable, Column } from "./AdminTable";
import { FinanceTransaction, fetchFinanceTransactions } from "@/lib/admin-api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { Button } from "../ui/button";
import { TransactionType } from "@/lib/types";

const typeVariant = (type: string) => {
  switch (type) {
    case "income": return "default";
    case "expense": return "destructive";
    case "transfer": return "secondary";
    default: return "outline" as const;
  }
};

export default function FinanceSection() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FinanceTransaction | null>(null);

  useEffect(() => {
    if (token) {
      fetchFinanceTransactions(token)
        .then(setTransactions)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [token]);

  const columns: Column<FinanceTransaction>[] = [
    { key: "reference_no", label: "Reference #" },
    {
      key: "createdAt",
      label: "Date",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      key: "type",
      label: "Type",
      render: (type: TransactionType) => (
        <Badge variant={typeVariant(type)}>
          {type.toUpperCase()}
        </Badge>
      ),
    },
    { key: "description", label: "Description" },
    {
      key: "amount",
      label: "Amount",
      render: (amount: number) => `KES ${amount.toLocaleString()}`,
    },
    {
      key: "payment_method",
      label: "Method",
      render: (method: string | null) => method?.toUpperCase() || "-",
    },
  ];

  return (
    <>
      <AdminTable
        title="Finance Transactions"
        data={transactions}
        columns={columns}
        loading={loading}
        searchKeys={["reference_no", "description", "type", "payment_method"]}
        actions={(transaction) => (
          <Button variant="outline" size="sm" onClick={() => setSelected(transaction)}>
            View Details
          </Button>
        )}
      />

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reference #</p>
                  <p className="text-sm font-semibold">{selected.reference_no}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <Badge variant={typeVariant(selected.type)}>
                    {selected.type.toUpperCase()}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{selected.description}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Amount</p>
                  <p className="text-sm font-semibold text-lg">
                    KES {selected.amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                  <p className="text-sm">{selected.payment_method?.toUpperCase() || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p className="text-sm">{new Date(selected.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
