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
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { WarehouseSelect } from "@/components/ui/warehouse-select";

interface TransferStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string;
  productName?: string;
  fromWarehouseId?: string;
  availableQuantity?: number;
  onTransferComplete?: () => void;
}

export function TransferStockDialog({
  open,
  onOpenChange,
  productId,
  productName,
  fromWarehouseId,
  availableQuantity = 0,
  onTransferComplete,
}: TransferStockDialogProps) {
  const [formData, setFormData] = useState({
    toWarehouseId: "",
    quantity: "",
    reason: "",
    reference: "",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!productId) {
      toast.error("Product not selected");
      return false;
    }

    if (!fromWarehouseId) {
      toast.error("Source warehouse not selected");
      return false;
    }

    if (!formData.toWarehouseId) {
      toast.error("Please select destination warehouse");
      return false;
    }

    if (formData.toWarehouseId === fromWarehouseId) {
      toast.error("Source and destination warehouses must be different");
      return false;
    }

    const quantity = parseInt(formData.quantity);
    if (!quantity || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return false;
    }

    if (quantity > availableQuantity) {
      toast.error(
        `Quantity exceeds available stock (${availableQuantity} available)`
      );
      return false;
    }

    if (!formData.reason.trim()) {
      toast.error("Please provide a reason for transfer");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        productId,
        fromWarehouseId,
        toWarehouseId: formData.toWarehouseId,
        quantity: parseInt(formData.quantity),
        reason: formData.reason,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
      };

      const response = await fetch("http://localhost:5000/inventory/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to transfer stock");
      }

      const result = await response.json();
      
      toast.success(
        `Successfully transferred ${result.quantity} units from warehouse to warehouse`
      );

      // Reset form
      setFormData({
        toWarehouseId: "",
        quantity: "",
        reason: "",
        reference: "",
        notes: "",
      });

      onOpenChange(false);
      onTransferComplete?.();
    } catch (error) {
      console.error("Error transferring stock:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to transfer stock"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Transfer Stock</DialogTitle>
          <DialogDescription>
            Transfer inventory from one warehouse to another
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Product Info */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium">Product: {productName}</p>
              <p className="text-sm text-gray-600">
                Available Quantity: {availableQuantity} units
              </p>
            </div>

            {/* Destination Warehouse */}
            <div className="space-y-2">
              <Label htmlFor="toWarehouse">
                Destination Warehouse <span className="text-red-500">*</span>
              </Label>
              <WarehouseSelect
                value={formData.toWarehouseId}
                onValueChange={(value) => handleInputChange("toWarehouseId", value)}
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
                max={availableQuantity}
                placeholder="Enter quantity to transfer"
                value={formData.quantity}
                onChange={(e) => handleInputChange("quantity", e.target.value)}
                required
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Input
                id="reason"
                placeholder="e.g., Stock rebalancing, Branch transfer"
                value={formData.reason}
                onChange={(e) => handleInputChange("reason", e.target.value)}
                required
              />
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number (Optional)</Label>
              <Input
                id="reference"
                placeholder="e.g., TRANS-001"
                value={formData.reference}
                onChange={(e) => handleInputChange("reference", e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this transfer..."
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Transfer Stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
