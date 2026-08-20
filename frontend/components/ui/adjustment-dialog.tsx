/**
 * Dialog Component for Inventory Adjustments
 * Modal dialog with form validation for increasing/decreasing stock
 */

import React, { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AdjustmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AdjustmentFormData) => Promise<void>;
  productName?: string;
  currentQuantity?: number;
  warehouseId?: string;
  isLoading?: boolean;
}

export interface AdjustmentFormData {
  adjustmentType: "increase" | "decrease";
  quantity: number;
  reason:
    | "receipt"
    | "damage"
    | "theft"
    | "count_variance"
    | "expiry"
    | "return"
    | "promotion"
    | "other";
  reference?: string;
  notes?: string;
}

const ADJUSTMENT_REASONS = [
  { value: "receipt",        label: "Stock Receipt" },
  { value: "damage",         label: "Damaged Goods" },
  { value: "theft",          label: "Theft/Loss" },
  { value: "count_variance", label: "Count Variance" },
  { value: "expiry",         label: "Expired Stock" },
  { value: "return",         label: "Customer Return" },
  { value: "promotion",      label: "Promotional Adjustment" },
  { value: "other",          label: "Other" },
];

export function AdjustmentDialog({
  isOpen,
  onClose,
  onSubmit,
  productName = "Product",
  currentQuantity = 0,
  isLoading = false,
}: AdjustmentDialogProps) {
  const [formData, setFormData] = useState<AdjustmentFormData>({
    adjustmentType: "increase",
    quantity: 1,
    reason: "receipt",
    reference: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.quantity || formData.quantity <= 0)
      newErrors.quantity = "Quantity must be greater than 0";
    if (formData.adjustmentType === "decrease" && formData.quantity > currentQuantity)
      newErrors.quantity = `Cannot decrease by ${formData.quantity}. Current quantity is ${currentQuantity}`;
    if (!formData.reason) newErrors.reason = "Please select a reason";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      await onSubmit(formData);
      setFormData({ adjustmentType: "increase", quantity: 1, reason: "receipt", reference: "", notes: "" });
      setErrors({});
      onClose();
    } catch (error) {
      console.error("Adjustment failed:", error);
    }
  };

  if (!isOpen) return null;

  const projectedQuantity =
    formData.adjustmentType === "increase"
      ? currentQuantity + formData.quantity
      : currentQuantity - formData.quantity;

  const inputBase = "w-full px-3 py-2 border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";
  const inputNormal = cn(inputBase, "border-border");
  const inputError  = cn(inputBase, "border-destructive bg-destructive/5");

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-card rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto border border-border animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Adjust Inventory</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Product Info */}
          <div className="rounded-lg bg-muted border border-border p-3">
            <p className="text-xs text-muted-foreground">Product</p>
            <p className="font-medium text-foreground text-sm">{productName}</p>
            <p className="text-xs text-muted-foreground mt-1">Current Quantity: {currentQuantity} units</p>
          </div>

          {/* Adjustment Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Adjustment Type</label>
            <div className="flex gap-2">
              {(["increase", "decrease"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, adjustmentType: type })}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg border-2 font-medium text-sm transition-colors",
                    formData.adjustmentType === type
                      ? type === "increase"
                        ? "border-success bg-success/10 text-success"
                        : "border-destructive bg-destructive/10 text-destructive"
                      : "border-border bg-background text-foreground hover:border-primary/50"
                  )}
                >
                  {type === "increase" ? "Add Stock" : "Remove Stock"}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Quantity</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, quantity: Math.max(0, formData.quantity - 1) })}
                className="px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-foreground"
              >−</button>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                className={cn(errors.quantity ? inputError : inputNormal, "flex-1 text-center font-medium")}
                min="0"
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
                className="px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-foreground"
              >+</button>
            </div>
            {errors.quantity && <p className="text-sm text-destructive mt-1">{errors.quantity}</p>}
          </div>

          {/* Projected Quantity */}
          <div className="rounded-lg bg-muted border border-border p-3">
            <p className="text-xs text-muted-foreground">Projected Quantity</p>
            <p className={cn("text-lg font-semibold", projectedQuantity >= 0 ? "text-success" : "text-destructive")}>
              {projectedQuantity} units
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Reason *</label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value as AdjustmentFormData["reason"] })}
              className={errors.reason ? inputError : inputNormal}
            >
              <option value="">Select a reason...</option>
              {ADJUSTMENT_REASONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {errors.reason && <p className="text-sm text-destructive mt-1">{errors.reason}</p>}
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Reference (Optional)</label>
            <input
              type="text"
              placeholder="PO#, RMA#, etc."
              value={formData.reference || ""}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              className={inputNormal}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Notes (Optional)</label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional details..."
              rows={3}
              className={cn(inputNormal, "resize-none")}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              variant={formData.adjustmentType === "increase" ? "default" : "destructive"}
              className="flex-1"
            >
              {isLoading ? "Adjusting..." : "Confirm"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export type { AdjustmentDialogProps };
