// frontend/components/pos/POSCart.tsx
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  Percent,
  DollarSign,
} from "lucide-react";
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
  const [discountItem, setDiscountItem] = useState<CartItem | null>(null);
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");

  const handleApplyDiscount = () => {
    if (!discountItem) return;
    const value = parseFloat(discountValue);
    if (isNaN(value) || value < 0) return;

    onUpdateDiscount(discountItem.productId, value, discountType === "percent");
    setDiscountItem(null);
    setDiscountValue("");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping Cart
            <Badge variant="secondary" className="ml-2">
              {cart.length} {cart.length === 1 ? "item" : "items"}
            </Badge>
          </CardTitle>
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
      </CardHeader>
      <CardContent className="p-0">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingCart className="h-16 w-16 text-slate-300 mb-4" />
            <p className="text-slate-500 text-lg font-medium">Cart is empty</p>
            <p className="text-slate-400 text-sm mt-1">
              Search and add products to get started
            </p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50 z-10">
                <TableRow>
                  <TableHead className="w-[40%]">Product</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((item) => {
                  const lineTotal = item.quantity * item.unit_price - item.discount;
                  return (
                    <TableRow key={item.productId} className="hover:bg-slate-50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">SKU: {item.sku}</p>
                          <Badge variant="outline" className="mt-1 text-xs">
                            Available: {item.available}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              onUpdateQuantity(item.productId, item.quantity - 1)
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              onUpdateQuantity(
                                item.productId,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-16 text-center h-8"
                            min="1"
                            max={item.available}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              onUpdateQuantity(item.productId, item.quantity + 1)
                            }
                            disabled={item.quantity >= item.available}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => {
                                setDiscountItem(item);
                                setDiscountValue(item.discount_percent.toFixed(2));
                                setDiscountType("percent");
                              }}
                            >
                              {item.discount > 0 ? (
                                <span className="text-green-600 font-medium">
                                  -{formatCurrency(item.discount)}
                                </span>
                              ) : (
                                <span className="text-slate-400">Add</span>
                              )}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Apply Discount</DialogTitle>
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
                              <Button onClick={handleApplyDiscount} className="w-full">
                                Apply Discount
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {formatCurrency(lineTotal)}
                      </TableCell>
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
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
