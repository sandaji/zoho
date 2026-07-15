"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { frontendEnv } from "@/lib/env";
import { WarehouseSelect } from "@/components/ui/warehouse-select";

interface AdjustStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string;
  productName?: string;
  currentStock?: number;
  onAdjustComplete?: () => void;
}

type AdjustmentReason =
  | "receipt"
  | "damage"
  | "theft"
  | "count_variance"
  | "expiry"
  | "return"
  | "promotion"
  | "other";

const REASON_LABELS: Record<AdjustmentReason, string> = {
  receipt: "Receipt / Goods In",
  damage: "Damage",
  theft: "Theft / Loss",
  count_variance: "Count Variance",
  expiry: "Expiry",
  return: "Customer Return",
  promotion: "Promotion / Sample",
  other: "Other",
};

export function AdjustStockModal({
  open,
  onOpenChange,
  productId,
  productName,
  currentStock = 0,
  onAdjustComplete,
}: AdjustStockModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<"increase" | "decrease">("increase");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<AdjustmentReason | "">("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();

  const resetForm = () => {
    setAdjustmentType("increase");
    setWarehouseId("");
    setQuantity("");
    setReason("");
    setReference("");
    setNotes("");
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const previewStock =
    adjustmentType === "increase"
      ? currentStock + (parseInt(quantity) || 0)
      : currentStock - (parseInt(quantity) || 0);

  const validateForm = (): boolean => {
    if (!productId) {
      toast.error("No product selected");
      return false;
    }
    if (!warehouseId) {
      toast.error("Please select a warehouse");
      return false;
    }
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      toast.error("Please enter a valid quantity greater than 0");
      return false;
    }
    if (adjustmentType === "decrease" && qty > currentStock) {
      toast.error(`Cannot decrease by more than current stock (${currentStock} units)`);
      return false;
    }
    if (!reason) {
      toast.error("Please select a reason for the adjustment");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const payload = {
        productId,
        warehouseId,
        adjustmentType,
        quantity: parseInt(quantity),
        reason,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const response = await fetch(
        `${frontendEnv.NEXT_PUBLIC_API_URL}/v1/inventory/adjust`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to adjust stock");
      }

      const result = await response.json();
      const msg = result.message || `Stock ${adjustmentType}d by ${quantity} units`;
      toast.success(msg);

      resetForm();
      onOpenChange(false);
      onAdjustComplete?.();
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to adjust stock"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            Manually increase or decrease stock for{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {productName ?? "this product"}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current stock info */}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Current Stock</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {currentStock.toLocaleString()}
              </p>
            </div>
            {quantity && parseInt(quantity) > 0 && (
              <div className="text-right">
                <p className="text-xs text-slate-500 dark:text-slate-400">After Adjustment</p>
                <p
                  className={`text-2xl font-bold ${
                    previewStock < 0
                      ? "text-red-600 dark:text-red-400"
                      : adjustmentType === "increase"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {Math.max(0, previewStock).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Adjustment type */}
          <div className="space-y-2">
            <Label>Adjustment Type <span className="text-red-500">*</span></Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAdjustmentType("increase")}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-medium transition-all ${
                  adjustmentType === "increase"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Increase
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType("decrease")}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-medium transition-all ${
                  adjustmentType === "decrease"
                    ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <TrendingDown className="h-4 w-4" />
                Decrease
              </button>
            </div>
          </div>

          {/* Warehouse */}
          <div className="space-y-2">
            <Label htmlFor="warehouse">
              Warehouse <span className="text-red-500">*</span>
            </Label>
            <WarehouseSelect
              value={warehouseId}
              onValueChange={setWarehouseId}
            />
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">
              Quantity <span className="text-red-500">*</span>
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={adjustmentType === "decrease" ? currentStock : undefined}
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Select value={reason} onValueChange={(v) => setReason(v as AdjustmentReason)}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(REASON_LABELS) as AdjustmentReason[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {REASON_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference (optional) */}
          <div className="space-y-2">
            <Label htmlFor="reference">Reference Number (Optional)</Label>
            <Input
              id="reference"
              placeholder="e.g., PO-1234, RMA-5678"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          {/* Notes (optional) */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional details about this adjustment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className={
                adjustmentType === "increase"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {adjustmentType === "increase" ? "Increase Stock" : "Decrease Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
