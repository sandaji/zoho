// frontend/components/pos/POSPayment.tsx
"use client";

import React from "react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "../ui/dropdown-menu";

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
  docMode?: "SALE" | "DRAFT" | "QUOTE";
  onSaveDocument?: () => void;
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
  docMode = "SALE",
  onSaveDocument,
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-emerald-200">
        <CreditCard className="h-5 w-5 text-emerald-700" />
        <h3 className="font-semibold text-emerald-900">Payment & Checkout</h3>
      </div>

      {/* Order Summary - Strong Emerald */}
      <div className="space-y-2 rounded-lg bg-emerald-100 border border-emerald-200 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-emerald-800">Subtotal</span>
          <span className="font-medium text-emerald-900">{formatCurrency(subtotal)}</span>
        </div>
        {totalDiscount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-emerald-800">Discount</span>
            <span className="font-medium text-emerald-600">-{formatCurrency(totalDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-emerald-800">Tax (16%)</span>
          <span className="font-medium text-emerald-900">{formatCurrency(tax)}</span>
        </div>
        <Separator className="my-2 bg-emerald-300" />
        <div className="flex justify-between text-lg font-bold">
          <span className="text-emerald-900">Total</span>
          <span className="text-2xl text-emerald-900">{formatCurrency(grandTotal)}</span>
        </div>
      </div>

      {/* Payment Method */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-emerald-900">Payment Method</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-start border-emerald-200">
              {paymentMethods.find(m => m.value === paymentMethod)?.label || "Select Payment Method"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-sm font-semibold">Select Payment Method</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              >
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <DropdownMenuRadioItem value={method.value} key={method.value} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{method.label}</span>
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cash Payment Details */}
      {paymentMethod === "cash" && (
        <div className="space-y-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4">
          <div>
            <Label htmlFor="amountTendered" className="text-sm font-semibold text-emerald-900">
              Amount Tendered
            </Label>
            <Input
              id="amountTendered"
              type="number"
              value={amountTendered || ""}
              onChange={(e) => setAmountTendered(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="mt-2 text-lg font-bold border-emerald-300"
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
                className="text-xs border-emerald-200 hover:bg-emerald-100"
              >
                {amount.label}
              </Button>
            ))}
          </div>

          {/* Change Amount */}
          {amountTendered > 0 && (
            <div className="rounded-lg bg-white p-3 border border-emerald-300">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-emerald-800">Change Due</span>
                <span
                  className={`text-2xl font-bold ${changeAmount < 0 ? "text-red-600" : "text-emerald-600"
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
        <Label htmlFor="notes" className="text-xs text-emerald-700">
          Notes (Optional)
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add sale notes..."
          className="mt-1 resize-none border-emerald-200"
          rows={2}
        />
      </div>

      {/* Checkout Button - changes based on document mode */}
      {docMode === "SALE" ? (
        <Button
          onClick={onCheckout}
          disabled={
            loading || cartCount === 0 || (paymentMethod === "cash" && amountTendered < grandTotal)
          }
          className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700"
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
      ) : (
        <Button
          onClick={onSaveDocument}
          disabled={loading || cartCount === 0}
          className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-5 w-5" />
              Save {docMode === "DRAFT" ? "Draft" : "Quote"}
            </>
          )}
        </Button>
      )}

      {/* Keyboard Shortcut Hints */}
      <div className="text-xs text-center text-emerald-700 space-y-1">
        {docMode === "SALE" ? (
          <p>F9: Complete Sale • F4: Clear Cart • ESC: Focus Search</p>
        ) : (
          <p>F4: Clear Cart • ESC: Focus Search</p>
        )}
      </div>
    </div>
  );
};
