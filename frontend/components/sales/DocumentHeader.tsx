// frontend/components/sales/DocumentHeader.tsx
'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface DocumentHeaderProps {
  form: any; // Simplified for now
  isReadOnly: boolean;
}

export const DocumentHeader: React.FC<DocumentHeaderProps> = ({ form, isReadOnly }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Details</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="customerId">Customer</Label>
          {/* TODO: Replace with a shadcn Command component for autocomplete search */}
          <Input id="customerId" {...form.register('customerId')} disabled={isReadOnly} placeholder="Search for a customer..." />
          {form.formState.errors.customerId && <p className="text-red-500 text-sm">{form.formState.errors.customerId.message}</p>}
        </div>
        <div>
          <Label htmlFor="issueDate">Issue Date</Label>
          {/* TODO: Replace with shadcn DatePicker */}
          <Input id="issueDate" type="date" {...form.register('issueDate')} disabled={isReadOnly} />
        </div>
        <div>
          <Label htmlFor="dueDate">Due Date</Label>
          {/* TODO: Replace with shadcn DatePicker */}
          <Input id="dueDate" type="date" {...form.register('dueDate')} disabled={isReadOnly} />
        </div>
      </CardContent>
    </Card>
  );
};
