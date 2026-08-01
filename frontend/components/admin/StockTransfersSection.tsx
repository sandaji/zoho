"use client";

import { useEffect, useState } from "react";
import { AdminTable, Column } from "./AdminTable";
import {
  StockTransfer,
  StockTransferItem,
  fetchStockTransfers,
  fetchStockTransferDetail,
  receiveStockTransfer,
  ReceiveStockTransferPayload,
} from "@/lib/admin-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "@/hooks/use-toast";

const statusVariant = (status: string) => {
  const normalized = status?.toUpperCase?.() ?? status;
  switch (normalized) {
    case "RECEIVED":
    case "COMPLETED":
      return "default";
    case "PENDING_APPROVAL":
    case "APPROVED":
    case "DISPATCHED":
    case "PARTIALLY_RECEIVED":
    case "PENDING_RECEIPT":
      return "secondary";
    case "DISCREPANCY":
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
};

export default function StockTransfersSection() {
  const { token } = useAuth();
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StockTransfer | null>(null);
  const [isReceiveOpen, setReceiveOpen] = useState(false);

  const fetchData = () => {
    if (token) {
      setLoading(true);
      fetchStockTransfers(token)
        .then(setTransfers)
        .catch((err) => {
          console.error(err);
          toast({
            title: "Error",
            description: "Failed to fetch stock transfers.",
            variant: "destructive",
          });
        })
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleConfirmSuccess = () => {
    setReceiveOpen(false);
    setSelected(null);
    fetchData();
    toast({ title: "Success", description: "Stock transfer confirmed." });
  };

  const columns: Column<StockTransfer>[] = [
    { key: "documentId", label: "Document #" },
    {
      key: "createdAt",
      label: "Date",
      render: (date) => new Date(date as string).toLocaleDateString(),
    },
    { key: "sourceWarehouse.name", label: "From" },
    { key: "destinationWarehouse.name", label: "To" },
    {
      key: "status",
      label: "Status",
      render: (status) => {
        const normalized = (status as string)?.toUpperCase?.() ?? String(status ?? "");
        const label = normalized.replace(/_/g, " ");
        return <Badge variant={statusVariant(normalized)}>{label}</Badge>;
      },
    },
  ];

  return (
    <>
      <AdminTable
        title="Stock Transfers"
        data={transfers}
        columns={columns}
        loading={loading}
        searchKeys={["documentId", "sourceWarehouse.name", "destinationWarehouse.name", "status"]}
        actions={(transfer) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (token) {
                fetchStockTransferDetail(token, transfer.id).then(setSelected);
              }
            }}
          >
            View Details
          </Button>
        )}
      />

      <Dialog open={!!selected && !isReceiveOpen} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transfer Details ({selected?.documentId})</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {/* Details sections */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">From</p>
                  <p>{selected.sourceWarehouse.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">To</p>
                  <p>{selected.destinationWarehouse.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={statusVariant(selected.status)}>
                    {selected.status.toUpperCase().replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>
              <div>
                <h3 className="text-md font-semibold mb-2">Items</h3>
                <div className="border rounded-md">
                  <div className="grid grid-cols-3 gap-2 p-2 font-semibold bg-gray-50">
                    <div>Product</div>
                    <div className="text-right">Expected Qty</div>
                    <div className="text-right">Received Qty</div>
                  </div>
                  {selected.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-3 gap-2 p-2 border-t">
                      <div>
                        {item.product.name} ({item.product.sku})
                      </div>
                      <div className="text-right">{item.requested_qty}</div>
                      <div className="text-right">{item.received_qty ?? "N/A"}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {(selected?.status === "PENDING_RECEIPT" || selected?.status === "DISPATCHED") && (
              <Button variant="default" onClick={() => setReceiveOpen(true)}>
                Confirm Receipt
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selected && (
        <ReceiveTransferDialog
          isOpen={isReceiveOpen}
          onClose={() => setReceiveOpen(false)}
          onSuccess={handleConfirmSuccess}
          transfer={selected}
        />
      )}
    </>
  );
}

function ReceiveTransferDialog({
  isOpen,
  onClose,
  onSuccess,
  transfer,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transfer: StockTransfer;
}) {
  const { token } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [receivedItems, setReceivedItems] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (transfer) {
      const initialItems: Record<string, number> = {};
      transfer.items.forEach((item) => {
        initialItems[item.product.id] = item.requested_qty;
      });
      setReceivedItems(initialItems);
    }
  }, [transfer]);

  const handleSubmit = async () => {
    if (!token) return;
    setSubmitting(true);
    const payload: ReceiveStockTransferPayload = {
      items: Object.entries(receivedItems).map(([productId, received_qty]) => ({
        productId,
        received_qty,
        damaged_qty: 0, // Assuming 0 damaged quantity for now
      })),
      notes: notes || undefined,
    };
    try {
      await receiveStockTransfer(token, transfer.id, payload);
      onSuccess();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleItemQuantityChange = (productId: string, value: string) => {
    const numValue = parseInt(value, 10);
    setReceivedItems((prev) => ({ ...prev, [productId]: isNaN(numValue) ? 0 : numValue }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receive Stock Transfer ({transfer.documentId})</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="border rounded-md">
            <div className="grid grid-cols-3 gap-2 p-2 font-semibold bg-gray-50">
              <div>Product</div>
              <div className="text-right">Expected Qty</div>
              <div className="text-right">Received Qty</div>
            </div>
            {transfer.items.map((item) => (
              <div key={item.id} className="grid grid-cols-3 gap-2 p-2 border-t items-center">
                <div>
                  {item.product.name} ({item.product.sku})
                </div>
                <div className="text-right">{item.quantity}</div>
                <div>
                  <Input
                    type="number"
                    value={receivedItems[item.product.id] ?? ""}
                    onChange={(e) => handleItemQuantityChange(item.product.id, e.target.value)}
                    className="text-right"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., one box was damaged"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Confirming..." : "Confirm Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
