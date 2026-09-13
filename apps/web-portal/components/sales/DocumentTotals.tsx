// frontend/components/sales/DocumentTotals.tsx
'use client';

import React, { useEffect, useState } from 'react';
// useFormContext removed
import { Card, CardContent } from '../ui/card';

interface DocumentTotalsProps {
  form: any; // Simplified for now
}

export const DocumentTotals: React.FC<DocumentTotalsProps> = ({ form }) => {
  const [totals, setTotals] = useState({ subtotal: 0, tax: 0, total: 0 });
  const items = form.watch('items');

  useEffect(() => {
    const calculateTotals = () => {
      const subtotal = items.reduce((acc: number, item: any) => acc + (item.quantity * item.unitPrice), 0);
      const tax = items.reduce((acc: number, item: any) => acc + (item.quantity * item.unitPrice * item.taxRate), 0);
      const total = subtotal + tax;
      setTotals({ subtotal, tax, total });
    };

    if (items) {
      calculateTotals();
    }
  }, [items]);

  return (
    <div className="flex justify-end">
      <Card className="w-full md:w-1/3">
        <CardContent className="space-y-2 pt-4">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{totals.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{totals.total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
