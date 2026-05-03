"use client";

import { useState, useEffect } from "react";
import { Sales, SalesItem, createCreditNote } from "@/lib/admin-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/toast-context";
import { useAuth } from "@/lib/auth-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface CreateCreditNoteDialogProps {
  sale: Sales | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateCreditNoteDialog({
  sale,
  isOpen,
  onClose,
  onSuccess,
}: CreateCreditNoteDialogProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, { quantity: number; selected: boolean }>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sale?.items) {
      const initial: Record<string, { quantity: number; selected: boolean }> = {};
      sale.items.forEach((item) => {
        initial[item.id] = { quantity: item.quantity, selected: false };
      });
      setSelectedItems(initial);
      setReason("");
    }
  }, [sale]);

  const handleToggleItem = (itemId: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], selected: !prev[itemId].selected },
    }));
  };

  const handleUpdateQuantity = (itemId: string, qty: number, max: number) => {
    const safeQty = Math.max(0, Math.min(qty, max));
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity: safeQty },
    }));
  };

  const calculateTotals = () => {
    if (!sale?.items) return { subtotal: 0, tax: 0, total: 0 };
    
    let subtotal = 0;
    let tax = 0;

    sale.items.forEach((item) => {
      const selection = selectedItems[item.id];
      if (selection?.selected) {
        const itemSubtotal = selection.quantity * item.unitPrice;
        const itemTax = itemSubtotal * item.taxRate;
        subtotal += itemSubtotal;
        tax += itemTax;
      }
    });

    return { subtotal, tax, total: subtotal + tax };
  };

  const handleSubmit = async () => {
    if (!sale || !token) return;

    const itemsToReturn = sale.items
      ?.filter((item) => selectedItems[item.id]?.selected)
      .map((item) => ({
        productId: item.productId,
        quantity: selectedItems[item.id].quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        discount: item.discount, // Should we adjust discount proportionally? For now using original item discount.
      }));

    if (!itemsToReturn || itemsToReturn.length === 0) {
      toast("Please select at least one item to return", "warning");
      return;
    }

    if (!reason.trim()) {
      toast("Please provide a reason for the credit note", "warning");
      return;
    }

    setLoading(true);
    try {
      await createCreditNote(token, sale.id, {
        items: itemsToReturn,
        reason,
      });
      toast("Credit note created successfully", "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.message || "Failed to create credit note", "error");
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Issue Credit Note - {sale?.invoice_no}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <Label>Select Items to Return</Label>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Return</TableHead>
                    <TableHead>Product ID</TableHead>
                    <TableHead className="text-right">Sold Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="w-[120px] text-right">Return Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale?.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedItems[item.id]?.selected} 
                          onCheckedChange={() => handleToggleItem(item.id)}
                        />
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.productId}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">KES {item.unitPrice.toLocaleString()}</TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          size={1}
                          className="h-8 text-right"
                          value={selectedItems[item.id]?.quantity || 0}
                          onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 0, item.quantity)}
                          disabled={!selectedItems[item.id]?.selected}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Return</Label>
            <Input 
              id="reason" 
              placeholder="e.g., Damaged item, Customer changed mind" 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="bg-slate-50 p-4 rounded-lg space-y-2 border border-slate-200">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal to Credit</span>
              <span>KES {totals.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Tax to Credit</span>
              <span>KES {totals.tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
              <span>Total Credit Amount</span>
              <span className="text-red-600">KES {totals.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || totals.total <= 0}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? "Issuing..." : "Issue Credit Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
