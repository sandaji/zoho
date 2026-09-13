"use client";

import { Card } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreditCardWidgetProps {
  balance: number;
  cardNumber?: string;
  expiryDate?: string;
  holderName?: string;
  className?: string;
}

export function CreditCardWidget({
  balance,
  cardNumber = "•••• •••• •••• 4291",
  expiryDate = "12/26",
  holderName = "Account Holder",
  className,
}: CreditCardWidgetProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-0 bg-gradient-to-br from-[#104f38] via-[#156e4f] to-[#1a8a63] p-6 text-white shadow-xl",
        className
      )}
    >
      {/* Decorative background pattern */}
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5 blur-3xl" />

      {/* Card Content */}
      <div className="relative z-10 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-white/20 p-2">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium opacity-90">Total Balance</span>
          </div>
          <div className="text-xs opacity-75">VISA</div>
        </div>

        {/* Balance */}
        <div className="space-y-1">
          <p className="text-4xl font-bold tracking-tight">{formatCurrency(balance)}</p>
          <p className="text-xs text-white/70">Available balance</p>
        </div>

        {/* Card Details */}
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-xs text-white/70">Card Number</p>
            <p className="font-mono text-sm tracking-wider">{cardNumber}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-xs text-white/70">Expiry</p>
            <p className="font-mono text-sm">{expiryDate}</p>
          </div>
        </div>

        {/* Card Holder Name */}
        <div className="border-t border-white/20 pt-3">
          <p className="text-xs text-white/70">Card Holder</p>
          <p className="text-sm font-medium uppercase tracking-wide">{holderName}</p>
        </div>
      </div>

      {/* Accent Strip */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#cff07d] via-[#a8d65e] to-[#cff07d]" />
    </Card>
  );
}
