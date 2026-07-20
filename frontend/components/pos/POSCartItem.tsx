// frontend/components/pos/POSCartItem.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableCell, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Minus, Percent, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CartItem } from "@/app/dashboard/pos/page";
import { formatCurrency } from "@/lib/utils";

interface POSCartItemProps {
  item: CartItem;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdateDiscount: (productId: string, discount: number, isPercent?: boolean) => void;
  onRemove: (productId: string) => void;
}

export const POSCartItem: React.FC<POSCartItemProps> = ({
  item,
  onUpdateQuantity,
  onUpdateDiscount,
  onRemove,
}) => {
  // Item-specific discount state (not shared with other items)
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [discountValue, setDiscountValue] = useState(item.discount_percent.toFixed(2));
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");

  const lineTotal = item.quantity * item.unit_price - item.discount;

  const handleApplyDiscount = () => {
    const value = parseFloat(discountValue);
    if (isNaN(value) || value < 0) return;

    onUpdateDiscount(item.productId, value, discountType === "percent");
    setIsDiscountDialogOpen(false);
    // Reset to current item state
    setDiscountValue(item.discount_percent.toFixed(2));
    setDiscountType("percent");
  };

  const handleOpenDiscountDialog = () => {
    setDiscountValue(item.discount_percent.toFixed(2));
    setDiscountType("percent");
    setIsDiscountDialogOpen(true);
  };

  return (
    <TableRow className="hover:bg-slate-50">
      <TableCell>
        <div>
          {/* <p className="font-medium text-slate-900">{item.name}</p> */}
          <p className="text-xs text-slate-500">SKU: {item.sku}</p>
          <Badge variant="outline" className="mt-1 text-xs">
            Available: {item.available}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium text-slate-900">{item.name}</p>
          {/* <p className="text-xs text-slate-500">SKU: {item.sku}</p> */}
          {/* <Badge variant="outline" className="mt-1 text-xs">
            Available: {item.available}
          </Badge> */}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-center gap-2">
        
          <Input
            type="number"
            value={item.quantity}
            onChange={(e) => onUpdateQuantity(item.productId, parseInt(e.target.value) || 0)}
            className="w-16 text-center h-8"
            min="1"
            max={item.available}
          />
        </div>
      </TableCell>
      <TableCell className="text-right font-medium">{formatCurrency(item.unit_price)}</TableCell>
      <TableCell className="text-right">
        <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={handleOpenDiscountDialog}
            >
              {item.discount > 0 ? (
                <span className="text-green-600 font-medium">-{formatCurrency(item.discount)}</span>
              ) : (
                <span className="text-slate-400">Add</span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply Discount to {item.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Discount Type</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={discountType === "percent" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setDiscountType("percent")}
                  >
                    <Percent className="h-4 w-4 mr-2" />
                    Percentage
                  </Button>
                  <Button
                    type="button"
                    variant={discountType === "amount" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setDiscountType("amount")}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Fixed Amount
                  </Button>
                </div>
              </div>
              <div>
                <Label>Discount Value</Label>
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percent" ? "0-100" : "Amount"}
                  className="mt-2"
                />
              </div>
              <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded">
                Line Total: {formatCurrency(item.quantity * item.unit_price)}
                <br />
                After Discount: {formatCurrency(lineTotal)}
              </div>
              <Button onClick={handleApplyDiscount} className="w-full">
                Apply Discount
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </TableCell>
      <TableCell className="text-right font-bold text-lg">{formatCurrency(lineTotal)}</TableCell>
      <TableCell className="text-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => onRemove(item.productId)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};
