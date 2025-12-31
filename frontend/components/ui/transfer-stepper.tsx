/**
 * Stepper Component for Inventory Transfer Workflow
 * Multi-step workflow: Select From/To Warehouses -> Select Items -> Review -> Confirm
 */

import React, { useState } from "react";
import { MdCheckCircle, MdClose } from "react-icons/md";
import { cn } from "@/lib/utils";

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

    if (step === 1 && !formData.fromWarehouseId) {
      newErrors.fromWarehouseId = "Please select source warehouse";
    }

    if (step === 2) {
      if (!formData.toWarehouseId) {
        newErrors.toWarehouseId = "Please select destination warehouse";
      }
      if (formData.toWarehouseId === formData.fromWarehouseId) {
        newErrors.toWarehouseId = "Destination must be different from source";
      }
    }

    if (step === 3) {
      if (!formData.productId) {
        newErrors.productId = "Please select a product";
      }
      if (!formData.quantity || formData.quantity <= 0) {
        newErrors.quantity = "Quantity must be greater than 0";
      }

      const selectedProduct = availableProducts.find((p) => p.id === formData.productId);
      if (selectedProduct && formData.quantity > selectedProduct.currentQuantity) {
        newErrors.quantity = `Cannot transfer more than available quantity (${selectedProduct.currentQuantity})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(currentStep)) {
      return;
    }

    try {
      await onSubmit(formData);
      setCurrentStep(1);
      setFormData({
        fromWarehouseId: "",
        toWarehouseId: "",
        productId: "",
        quantity: 1,
        reason: "",
        notes: "",
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error("Transfer failed:", error);
    }
  };

  const getStepContent = () => {
    const fromWarehouse = warehouses.find((w) => w.id === formData.fromWarehouseId);
    const toWarehouse = warehouses.find((w) => w.id === formData.toWarehouseId);
    const selectedProduct = availableProducts.find((p) => p.id === formData.productId);

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900">Select Source Warehouse</h3>
            <p className="text-sm text-slate-600">Choose the warehouse to transfer items from</p>
            <div className="space-y-2">
              {warehouses.map((warehouse) => (
                <button
                  key={warehouse.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, fromWarehouseId: warehouse.id })}
                  className={cn(
                    "w-full p-3 rounded-lg border-2 text-left transition-colors",
                    formData.fromWarehouseId === warehouse.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <p className="font-medium text-slate-900">{warehouse.name}</p>
                  <p className="text-xs text-slate-600">{warehouse.code}</p>
                </button>
              ))}
            </div>
            {errors.fromWarehouseId && (
              <p className="text-sm text-red-600">{errors.fromWarehouseId}</p>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900">Select Destination Warehouse</h3>
            <p className="text-sm text-slate-600">Choose the warehouse to transfer items to</p>
            <div className="bg-blue-50 p-3 rounded-lg mb-3">
              <p className="text-xs text-slate-600">From:</p>
              <p className="font-medium text-slate-900">{fromWarehouse?.name}</p>
            </div>
            <div className="space-y-2">
              {warehouses
                .filter((w) => w.id !== formData.fromWarehouseId)
                .map((warehouse) => (
                  <button
                    key={warehouse.id}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        toWarehouseId: warehouse.id,
                      })
                    }
                    className={cn(
                      "w-full p-3 rounded-lg border-2 text-left transition-colors",
                      formData.toWarehouseId === warehouse.id
                        ? "border-green-500 bg-green-50"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <p className="font-medium text-slate-900">{warehouse.name}</p>
                    <p className="text-xs text-slate-600">{warehouse.code}</p>
                  </button>
                ))}
            </div>
            {errors.toWarehouseId && <p className="text-sm text-red-600">{errors.toWarehouseId}</p>}
          </div>
        );

      case 3:
        return (
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900">Select Product</h3>
            <p className="text-sm text-slate-600">Choose the product and quantity to transfer</p>
            <div className="bg-blue-50 p-2 rounded text-xs text-slate-600">
              {fromWarehouse?.name} → {toWarehouse?.name}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Product *</label>
              <select
                value={formData.productId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    productId: e.target.value,
                    quantity: 1,
                  })
                }
                className={cn(
                  "w-full px-3 py-2 border rounded-lg",
                  errors.productId ? "border-red-500 bg-red-50" : "border-slate-300"
                )}
              >
                <option value="">Select a product...</option>
                {availableProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku}) - Available: {product.currentQuantity}
                  </option>
                ))}
              </select>
              {errors.productId && <p className="text-sm text-red-600 mt-1">{errors.productId}</p>}
            </div>

            {selectedProduct && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Quantity *</label>
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
                    max={selectedProduct.currentQuantity}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        quantity: Math.min(formData.quantity + 1, selectedProduct.currentQuantity),
                      })
                    }
                    className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Max available: {selectedProduct.currentQuantity} units
                </p>
                {errors.quantity && <p className="text-sm text-red-600 mt-1">{errors.quantity}</p>}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Review Transfer</h3>
            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">From:</span>
                <span className="font-medium text-slate-900">{fromWarehouse?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">To:</span>
                <span className="font-medium text-slate-900">{toWarehouse?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Product:</span>
                <span className="font-medium text-slate-900">{selectedProduct?.name}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-600">Quantity:</span>
                <span className="text-lg font-bold text-blue-600">{formData.quantity} units</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Balancing stock, reorganization..."
                value={formData.reason || ""}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                placeholder="Additional details about this transfer..."
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none"
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
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Transfer Inventory</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
            disabled={isLoading}
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex justify-between">
            {STEPS.map((step) => (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <button
                  type="button"
                  disabled={true}
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center mb-2 transition-colors",
                    currentStep === step.id
                      ? "bg-blue-500 text-white"
                      : currentStep > step.id
                        ? "bg-green-500 text-white"
                        : "bg-slate-200 text-slate-600"
                  )}
                >
                  {currentStep > step.id ? <MdCheckCircle className="h-5 w-5" /> : step.id}
                </button>
                <p className="text-xs text-center text-slate-600 leading-tight">{step.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="min-h-[250px]">{getStepContent()}</div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t border-slate-200 mt-6">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1 || isLoading}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Back
            </button>
            {currentStep < STEPS.length ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 rounded-lg font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-green-600 rounded-lg font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? "Transferring..." : "Confirm Transfer"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export type { TransferStepperProps };
