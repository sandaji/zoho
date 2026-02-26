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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Truck } from "lucide-react";

interface StockTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId?: string;
  availableStock?: number;
  branches: Array<{ id: string; name: string }>;
  items: Array<{ id: string; name: string; sku: string }>;
  onSubmit?: (data: {
    itemId: string;
    sourceBranchId: string;
    destinationBranchId: string;
    quantity: number;
    notes: string;
  }) => Promise<void>;
}

export function StockTransferModal({
  open,
  onOpenChange,
  itemId,
  availableStock = 0,
  branches,
  items,
  onSubmit,
}: StockTransferModalProps) {
  const [formData, setFormData] = useState({
    itemId: itemId || "",
    sourceBranchId: "",
    destinationBranchId: "",
    quantity: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.itemId) newErrors.itemId = "Item is required";
    if (!formData.sourceBranchId) newErrors.sourceBranchId = "Source branch is required";
    if (!formData.destinationBranchId) newErrors.destinationBranchId = "Destination branch is required";
    if (!formData.quantity) newErrors.quantity = "Quantity is required";
    if (formData.sourceBranchId === formData.destinationBranchId) {
      newErrors.destinationBranchId = "Source and destination must be different";
    }

    const qty = parseInt(formData.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      newErrors.quantity = "Quantity must be a positive number";
    }
    if (qty > availableStock) {
      newErrors.quantity = `Quantity cannot exceed available stock (${availableStock})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      await onSubmit?.({
        itemId: formData.itemId,
        sourceBranchId: formData.sourceBranchId,
        destinationBranchId: formData.destinationBranchId,
        quantity: parseInt(formData.quantity, 10),
        notes: formData.notes,
      });
      onOpenChange(false);
      setFormData({
        itemId: itemId || "",
        sourceBranchId: "",
        destinationBranchId: "",
        quantity: "",
        notes: "",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quantityNum = parseInt(formData.quantity, 10) || 0;
  const remainingStock = availableStock - quantityNum;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <Truck className="h-5 w-5" />
            Initiate Stock Transfer
          </DialogTitle>
          <DialogDescription>
            Transfer inventory between branches. The transfer will be tracked as in-transit until received.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Item Selection */}
          <div className="space-y-2">
            <Label htmlFor="item" className="font-semibold">
              Item <span className="text-red-600">*</span>
            </Label>
            <Select value={formData.itemId} onValueChange={(val) => handleInputChange("itemId", val)}>
              <SelectTrigger id="item" className={errors.itemId ? "border-red-600" : ""}>
                <SelectValue placeholder="Select an item..." />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.sku} - {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.itemId && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.itemId}</p>
            )}
          </div>

          {/* Source Branch */}
          <div className="space-y-2">
            <Label htmlFor="source" className="font-semibold">
              Source Branch <span className="text-red-600">*</span>
            </Label>
            <Select
              value={formData.sourceBranchId}
              onValueChange={(val) => handleInputChange("sourceBranchId", val)}
            >
              <SelectTrigger id="source" className={errors.sourceBranchId ? "border-red-600" : ""}>
                <SelectValue placeholder="Select source branch..." />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.sourceBranchId && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.sourceBranchId}</p>
            )}
          </div>

          {/* Destination Branch */}
          <div className="space-y-2">
            <Label htmlFor="destination" className="font-semibold">
              Destination Branch <span className="text-red-600">*</span>
            </Label>
            <Select
              value={formData.destinationBranchId}
              onValueChange={(val) => handleInputChange("destinationBranchId", val)}
            >
              <SelectTrigger id="destination" className={errors.destinationBranchId ? "border-red-600" : ""}>
                <SelectValue placeholder="Select destination branch..." />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.destinationBranchId && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.destinationBranchId}</p>
            )}
          </div>

          {/* Stock Summary Card */}
          {formData.itemId && (
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Available Stock:
                    </span>
                    <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                      {availableStock.toLocaleString()}
                    </span>
                  </div>
                  {quantityNum > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Transfer Quantity:
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">{quantityNum.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-800">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Remaining Stock:
                        </span>
                        <span
                          className={`font-bold text-lg ${
                            remainingStock < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {remainingStock.toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="font-semibold">
              Quantity <span className="text-red-600">*</span>
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={availableStock}
              placeholder="Enter quantity to transfer"
              value={formData.quantity}
              onChange={(e) => handleInputChange("quantity", e.target.value)}
              className={`${errors.quantity ? "border-red-600" : ""} dark:bg-slate-700 dark:border-slate-600`}
            />
            {errors.quantity && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.quantity}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="font-semibold">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Add transfer notes, reference numbers, or special handling instructions..."
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              className="min-h-20 dark:bg-slate-700 dark:border-slate-600"
            />
          </div>

          {/* Info Alert */}
          <Alert className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
            <Truck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <AlertDescription className="text-emerald-800 dark:text-emerald-300">
              This stock will be marked as "In-Transit" and tracked until received at the destination branch.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="dark:bg-slate-700 dark:border-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Initiating Transfer...
              </>
            ) : (
              <>
                <Truck className="h-4 w-4 mr-2" />
                Initiate Transfer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
