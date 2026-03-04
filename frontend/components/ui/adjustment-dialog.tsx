/**
 * Dialog Component for Inventory Adjustments
 * Modal dialog with form validation for increasing/decreasing stock
 */

import React, { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

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
  { value: "receipt", label: "Stock Receipt" },
  { value: "damage", label: "Damaged Goods" },
  { value: "theft", label: "Theft/Loss" },
  { value: "count_variance", label: "Count Variance" },
  { value: "expiry", label: "Expired Stock" },
  { value: "return", label: "Customer Return" },
  { value: "promotion", label: "Promotional Adjustment" },
  { value: "other", label: "Other" },
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

    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = "Quantity must be greater than 0";
    }

    if (formData.adjustmentType === "decrease" && formData.quantity > currentQuantity) {
      newErrors.quantity = `Cannot decrease by ${formData.quantity}. Current quantity is ${currentQuantity}`;
    }

    if (!formData.reason) {
      newErrors.reason = "Please select a reason";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData({
        adjustmentType: "increase",
        quantity: 1,
        reason: "receipt",
        reference: "",
        notes: "",
      });
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

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Adjust Inventory</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Product Info */}
          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="text-sm text-slate-600">Product</p>
            <p className="font-medium text-slate-900">{productName}</p>
            <p className="text-xs text-slate-500 mt-1">Current Quantity: {currentQuantity} units</p>
          </div>

          {/* Adjustment Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Adjustment Type</label>
            <div className="flex gap-2">
              {(["increase", "decrease"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, adjustmentType: type })}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg border-2 font-medium transition-colors",
                    formData.adjustmentType === type
                      ? type === "increase"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-red-500 bg-red-50 text-red-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  )}
                >
                  {type === "increase" ? "Add Stock" : "Remove Stock"}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Quantity</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    quantity: Math.max(0, formData.quantity - 1),
                  })
                }
                className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100"
              >
                −
              </button>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantity: parseInt(e.target.value) || 0,
                  })
                }
                className={cn(
                  "flex-1 px-3 py-2 border rounded-lg text-center font-medium",
                  errors.quantity ? "border-red-500 bg-red-50" : "border-slate-300"
                )}
                min="0"
              />
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    quantity: formData.quantity + 1,
                  })
                }
                className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100"
              >
                +
              </button>
            </div>
            {errors.quantity && <p className="text-sm text-red-600 mt-1">{errors.quantity}</p>}
          </div>

          {/* Projected Quantity */}
          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="text-sm text-slate-600">Projected Quantity</p>
            <p
              className={cn(
                "text-lg font-semibold",
                projectedQuantity >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {projectedQuantity} units
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Reason *</label>
            <select
              value={formData.reason}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  reason: e.target.value as AdjustmentFormData["reason"],
                })
              }
              className={cn(
                "w-full px-3 py-2 border rounded-lg font-medium",
                errors.reason ? "border-red-500 bg-red-50" : "border-slate-300"
              )}
            >
              <option value="">Select a reason...</option>
              {ADJUSTMENT_REASONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.reason && <p className="text-sm text-red-600 mt-1">{errors.reason}</p>}
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Reference (Optional)
            </label>
            <input
              type="text"
              placeholder="PO#, RMA#, etc."
              value={formData.reference || ""}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional details..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg font-medium text-white disabled:opacity-50",
                formData.adjustmentType === "increase"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              )}
            >
              {isLoading ? "Adjusting..." : "Confirm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export type { AdjustmentDialogProps };
