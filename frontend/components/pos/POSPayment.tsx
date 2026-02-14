// frontend/components/pos/POSPayment.tsx
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Banknote,
  Smartphone,
  FileText,
  Building2,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type PaymentMethod = "cash" | "card" | "mpesa" | "cheque" | "bank_transfer";

interface POSPaymentProps {
  subtotal: number;
  tax: number;
  totalDiscount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  amountTendered: number;
  setAmountTendered: (amount: number) => void;
  changeAmount: number;
  onCheckout: () => void;
  loading: boolean;
  cartCount: number;
  notes: string;
  setNotes: (notes: string) => void;
}

export const POSPayment: React.FC<POSPaymentProps> = ({
  subtotal,
  tax,
  totalDiscount,
  grandTotal,
  paymentMethod,
  setPaymentMethod,
  amountTendered,
  setAmountTendered,
  changeAmount,
  onCheckout,
  loading,
  cartCount,
  notes,
  setNotes,
}) => {
  const paymentMethods = [
    { value: "cash", label: "Cash", icon: Banknote, color: "bg-green-100 text-green-700" },
    { value: "card", label: "Card", icon: CreditCard, color: "bg-blue-100 text-blue-700" },
    { value: "mpesa", label: "M-Pesa", icon: Smartphone, color: "bg-emerald-100 text-emerald-700" },
    { value: "cheque", label: "Cheque", icon: FileText, color: "bg-purple-100 text-purple-700" },
    {
      value: "bank_transfer",
      label: "Bank",
      icon: Building2,
      color: "bg-indigo-100 text-indigo-700",
    },
  ];

  const quickAmounts = [
    { label: "Exact", value: grandTotal },
    { label: "1000", value: 1000 },
    { label: "2000", value: 2000 },
    { label: "5000", value: 5000 },
  ];

  return (
    <Card className="shadow-lg sticky top-4">
      <CardHeader className="border-b bg-linear-to-r from-purple-50 to-pink-50">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment & Checkout
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {/* Order Summary */}
        <div className="space-y-2 rounded-lg bg-slate-50 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Discount</span>
              <span className="font-medium text-green-600">-{formatCurrency(totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Tax (16%)</span>
            <span className="font-medium">{formatCurrency(tax)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-2xl">{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Payment Method</Label>
          <div className="grid grid-cols-2 gap-2">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = paymentMethod === method.value;
              return (
                <Button
                  key={method.value}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  className={`h-20 flex-col gap-2 ${isSelected ? "" : method.color}`}
                  onClick={() => setPaymentMethod(method.value as PaymentMethod)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{method.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Cash Payment Details */}
        {paymentMethod === "cash" && (
          <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4">
            <div>
              <Label htmlFor="amountTendered" className="text-sm font-semibold">
                Amount Tendered
              </Label>
              <Input
                id="amountTendered"
                type="number"
                value={amountTendered || ""}
                onChange={(e) => setAmountTendered(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="mt-2 text-lg font-bold"
                min="0"
                step="0.01"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmountTendered(amount.value)}
                  className="text-xs"
                >
                  {amount.label}
                </Button>
              ))}
            </div>

            {/* Change Amount */}
            {amountTendered > 0 && (
              <div className="rounded-lg bg-white p-3 border border-green-300">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Change Due</span>
                  <span
                    className={`text-2xl font-bold ${changeAmount < 0 ? "text-red-600" : "text-green-600"
                      }`}
                  >
                    {formatCurrency(changeAmount)}
                  </span>
                </div>
                {changeAmount < 0 && (
                  <p className="text-xs text-red-600 mt-1">Insufficient amount tendered</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <Label htmlFor="notes" className="text-xs text-slate-600">
            Notes (Optional)
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add sale notes..."
            className="mt-1 resize-none"
            rows={2}
          />
        </div>

        {/* Checkout Button */}
        <Button
          onClick={onCheckout}
          disabled={
            loading || cartCount === 0 || (paymentMethod === "cash" && amountTendered < grandTotal)
          }
          className="w-full h-14 text-lg font-bold"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Complete Sale (F9)
            </>
          )}
        </Button>

        {/* Keyboard Shortcut Hints */}
        <div className="text-xs text-center text-slate-500 space-y-1">
          <p>F9: Complete Sale • F4: Clear Cart • ESC: Focus Search</p>
        </div>
      </CardContent>
    </Card>
  );
};
