// frontend/components/pos/POSCart.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { POSCartItem } from "./POSCartItem";
import { CartItem } from "@/app/dashboard/pos/page";

interface POSCartProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdateDiscount: (productId: string, discount: number, isPercent?: boolean) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
}

export const POSCart: React.FC<POSCartProps> = ({
  cart,
  onUpdateQuantity,
  onUpdateDiscount,
  onRemove,
  onClear,
}) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-slate-700" />
          <h3 className="font-semibold text-slate-900">Shopping Cart</h3>
          <Badge variant="secondary" className="ml-2">
            {cart.length} {cart.length === 1 ? "item" : "items"}
          </Badge>
        </div>
        {cart.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Cart
          </Button>
        )}
      </div>

      {/* Cart Content */}
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingCart className="h-16 w-16 text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg font-medium">Cart is empty</p>
          <p className="text-slate-400 text-sm mt-1">Search and add products to get started</p>
        </div>
      ) : (
        <div className="max-h-[500px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-slate-50 z-10">
              <TableRow>
                <TableHead className="w-[40%]">Item Code</TableHead>
                <TableHead className="w-[40%]">Name</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cart.map((item) => (
                <POSCartItem
                  key={item.productId}
                  item={item}
                  onUpdateQuantity={onUpdateQuantity}
                  onUpdateDiscount={onUpdateDiscount}
                  onRemove={onRemove}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
