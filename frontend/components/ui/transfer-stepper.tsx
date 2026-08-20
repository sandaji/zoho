/**
 * Stepper Component for Inventory Transfer Workflow
 * Multi-step workflow: Select From/To Warehouses -> Select Items -> Review -> Confirm
 */

import React, { useState } from "react";
import { CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface TransferFormData {
  fromWarehouseId: string;
  toWarehouseId: string;
  productId: string;
  quantity: number;
  reason?: string;
  notes?: string;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  currentQuantity: number;
}

interface TransferStepperProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransferFormData) => Promise<void>;
  warehouses: Warehouse[];
  availableProducts: Product[];
  isLoading?: boolean;
}

const STEPS = [
  { id: 1, label: "From Warehouse" },
  { id: 2, label: "To Warehouse" },
  { id: 3, label: "Select Items" },
  { id: 4, label: "Review" },
];

export function TransferStepper({
  isOpen,
  onClose,
  onSubmit,
  warehouses,
  availableProducts,
  isLoading = false,
}: TransferStepperProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<TransferFormData>({
    fromWarehouseId: "",
    toWarehouseId: "",
    productId: "",
    quantity: 1,
    reason: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 1 && !formData.fromWarehouseId)
      newErrors.fromWarehouseId = "Please select source warehouse";
    if (step === 2) {
      if (!formData.toWarehouseId)
        newErrors.toWarehouseId = "Please select destination warehouse";
      if (formData.toWarehouseId === formData.fromWarehouseId)
        newErrors.toWarehouseId = "Destination must be different from source";
    }
    if (step === 3) {
      if (!formData.productId) newErrors.productId = "Please select a product";
      if (!formData.quantity || formData.quantity <= 0)
        newErrors.quantity = "Quantity must be greater than 0";
      const selectedProduct = availableProducts.find((p) => p.id === formData.productId);
      if (selectedProduct && formData.quantity > selectedProduct.currentQuantity)
        newErrors.quantity = `Cannot transfer more than available quantity (${selectedProduct.currentQuantity})`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;
    try {
      await onSubmit(formData);
      setCurrentStep(1);
      setFormData({ fromWarehouseId: "", toWarehouseId: "", productId: "", quantity: 1, reason: "", notes: "" });
      setErrors({});
      onClose();
    } catch (error) {
      console.error("Transfer failed:", error);
    }
  };

  const inputBase = "w-full px-3 py-2 border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";
  const inputNormal = cn(inputBase, "border-border");
  const inputError  = cn(inputBase, "border-destructive bg-destructive/5");

  const getStepContent = () => {
    const fromWarehouse    = warehouses.find((w) => w.id === formData.fromWarehouseId);
    const toWarehouse      = warehouses.find((w) => w.id === formData.toWarehouseId);
    const selectedProduct  = availableProducts.find((p) => p.id === formData.productId);

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Select Source Warehouse</h3>
            <p className="text-sm text-muted-foreground">Choose the warehouse to transfer items from</p>
            <div className="space-y-2">
              {warehouses.map((warehouse) => (
                <button
                  key={warehouse.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, fromWarehouseId: warehouse.id })}
                  className={cn(
                    "w-full p-3 rounded-lg border-2 text-left transition-colors",
                    formData.fromWarehouseId === warehouse.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  )}
                >
                  <p className="font-medium text-foreground text-sm">{warehouse.name}</p>
                  <p className="text-xs text-muted-foreground">{warehouse.code}</p>
                </button>
              ))}
            </div>
            {errors.fromWarehouseId && <p className="text-sm text-destructive">{errors.fromWarehouseId}</p>}
          </div>
        );

      case 2:
        return (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Select Destination Warehouse</h3>
            <p className="text-sm text-muted-foreground">Choose the warehouse to transfer items to</p>
            <div className="rounded-lg bg-muted border border-border p-3 mb-3">
              <p className="text-xs text-muted-foreground">From:</p>
              <p className="font-medium text-foreground text-sm">{fromWarehouse?.name}</p>
            </div>
            <div className="space-y-2">
              {warehouses
                .filter((w) => w.id !== formData.fromWarehouseId)
                .map((warehouse) => (
                  <button
                    key={warehouse.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, toWarehouseId: warehouse.id })}
                    className={cn(
                      "w-full p-3 rounded-lg border-2 text-left transition-colors",
                      formData.toWarehouseId === warehouse.id
                        ? "border-success bg-success/5"
                        : "border-border hover:border-success/50 hover:bg-accent"
                    )}
                  >
                    <p className="font-medium text-foreground text-sm">{warehouse.name}</p>
                    <p className="text-xs text-muted-foreground">{warehouse.code}</p>
                  </button>
                ))}
            </div>
            {errors.toWarehouseId && <p className="text-sm text-destructive">{errors.toWarehouseId}</p>}
          </div>
        );

      case 3:
        return (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Select Product</h3>
            <p className="text-sm text-muted-foreground">Choose the product and quantity to transfer</p>
            <div className="rounded-lg bg-muted border border-border p-2 text-xs text-muted-foreground">
              {fromWarehouse?.name} → {toWarehouse?.name}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Product *</label>
              <select
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value, quantity: 1 })}
                className={errors.productId ? inputError : inputNormal}
              >
                <option value="">Select a product...</option>
                {availableProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku}) - Available: {product.currentQuantity}
                  </option>
                ))}
              </select>
              {errors.productId && <p className="text-sm text-destructive mt-1">{errors.productId}</p>}
            </div>
            {selectedProduct && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Quantity *</label>
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
                    max={selectedProduct.currentQuantity}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, quantity: Math.min(formData.quantity + 1, selectedProduct.currentQuantity) })}
                    className="px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-foreground"
                  >+</button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Max available: {selectedProduct.currentQuantity} units
                </p>
                {errors.quantity && <p className="text-sm text-destructive mt-1">{errors.quantity}</p>}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Review Transfer</h3>
            <div className="rounded-lg bg-muted border border-border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">From:</span>
                <span className="font-medium text-foreground">{fromWarehouse?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">To:</span>
                <span className="font-medium text-foreground">{toWarehouse?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product:</span>
                <span className="font-medium text-foreground">{selectedProduct?.name}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-muted-foreground">Quantity:</span>
                <span className="text-lg font-bold text-primary">{formData.quantity} units</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Reason (Optional)</label>
              <input
                type="text"
                placeholder="e.g., Balancing stock, reorganization..."
                value={formData.reason || ""}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className={inputNormal}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Notes (Optional)</label>
              <textarea
                placeholder="Additional details about this transfer..."
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className={cn(inputNormal, "resize-none")}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-card rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto border border-border animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Transfer Inventory</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex justify-between">
            {STEPS.map((step) => (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center mb-2 transition-colors text-sm font-semibold",
                    currentStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : currentStep > step.id
                        ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? <CheckCircle className="h-5 w-5" /> : step.id}
                </div>
                <p className="text-[10px] text-center text-muted-foreground leading-tight">{step.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="min-h-[250px]">{getStepContent()}</div>

          {/* Actions */}
          <div className="flex gap-3 pt-5 border-t border-border mt-5">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || isLoading}
              className="flex-1"
            >
              Back
            </Button>
            {currentStep < STEPS.length ? (
              <Button type="button" onClick={handleNext} disabled={isLoading} className="flex-1">
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Transferring..." : "Confirm Transfer"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export type { TransferStepperProps };
