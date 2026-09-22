// frontend/components/pos/POSCart.tsx
"use client";

import React from "react";
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

  docMode?: "SALE" | "DRAFT" | "QUOTE";
  editingDocId?: string | null;
}

export const POSCart: React.FC<POSCartProps> = ({
  cart,
  onUpdateQuantity,
  onUpdateDiscount,
  onRemove,
  onClear,
  docMode = "SALE",
  editingDocId = null,
}) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        {docMode !== "SALE" && (
          <div className="text-lg text-primary">
            <span className="font-semibold">
              Sales {docMode === "DRAFT" ? "Draft" : "Quotation"}
            </span>
            {editingDocId && ` - Editing: ${editingDocId}`}
          </div>
        )}
        <div className="flex items-center gap-5">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Shopping Cart</h3>
          <Badge variant="secondary" className="ml-2">
            {cart.length} {cart.length === 1 ? "item" : "items"}
          </Badge>
        </div>

        {cart.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Cart
          </Button>
        )}
      </div>

      {/* Cart Content */}
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingCart className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg font-medium text-muted-foreground">Cart is empty</p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Search and add products to get started
          </p>
        </div>
      ) : (
        <div className="max-h-[500px] overflow-auto table-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <TableRow>
                <TableHead className="w-[20%]">Item Code</TableHead>
                <TableHead className="w-[30%]">Name</TableHead>
                <TableHead className="text-center w-[10%]">Qty</TableHead>
                <TableHead className="text-center ">Price</TableHead>
                <TableHead className="text-center w-[5%]">Discount</TableHead>
                <TableHead className="text-center w-[20%]">Total</TableHead>
                <TableHead className="text-center w-[5%]">Action</TableHead>
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
