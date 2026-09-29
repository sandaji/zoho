// frontend/components/sales/DocumentTotals.tsx
'use client';

import React, { useEffect, useState } from 'react';
// useFormContext removed
import { Card, CardContent } from '../ui/card';

interface DocumentTotalsProps {
  form: any; // Simplified for now
}

export const DocumentTotals: React.FC<DocumentTotalsProps> = ({ form }) => {
  const [totals, setTotals] = useState({ subtotal: 0, discount: 0, tax: 0, total: 0 });
  const items = form.watch('items');

  useEffect(() => {
    const calculateTotals = () => {
      const subtotal = items.reduce((acc: number, item: any) => acc + (item.quantity * item.unitPrice), 0);
      const tax = items.reduce((acc: number, item: any) => acc + (item.quantity * item.unitPrice * item.taxRate), 0);
      const discount = items.reduce((acc: number, item: any) => acc + (item.discount || 0), 0);
      const total = subtotal + tax - discount;
      setTotals({ subtotal, discount, tax, total });
    };

    if (items) {
      calculateTotals();
    }
  }, [items]);

  return (
    <div className="flex justify-end">
      <Card className="w-full border-border bg-card shadow-sm md:w-[360px]">
        <CardContent className="space-y-3 pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium tabular-nums">KES {totals.subtotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
          </div>
          {totals.discount > 0 && <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discount</span>
            <span className="font-medium text-success tabular-nums">− KES {totals.discount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">VAT</span>
            <span className="font-medium tabular-nums">KES {totals.tax.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between rounded-md bg-primary px-3 py-3 text-primary-foreground">
            <span className="font-semibold">Grand Total</span>
            <span className="text-lg font-bold tabular-nums">KES {totals.total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
