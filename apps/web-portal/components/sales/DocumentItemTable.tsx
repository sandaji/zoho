// frontend/components/sales/DocumentItemTable.tsx
"use client";

import React from "react";
import { useFieldArray } from "react-hook-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Trash2, Plus } from "lucide-react";
import { ProductSearchCombobox } from "./ProductSearchCombobox";
import { Badge } from "../ui/badge";

interface DocumentItemTableProps {
  form: any;
  isReadOnly: boolean;
  documentType: "draft" | "quote";
  branchId: string;
}

export const DocumentItemTable: React.FC<DocumentItemTableProps> = ({
  form,
  isReadOnly,
  documentType,
  branchId,
}) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const handleProductSelect = (product: any) => {
    // Check if product already exists in items
    const existingIndex = fields.findIndex(
      (field: any) => field.productId === product.id
    );

    if (existingIndex >= 0) {
      // Product exists, increment quantity
      const currentQty = form.getValues(`items.${existingIndex}.quantity`);
      form.setValue(`items.${existingIndex}.quantity`, currentQty + 1);
      
      // Recalculate total
      const unitPrice = form.getValues(`items.${existingIndex}.unitPrice`);
      const taxRate = form.getValues(`items.${existingIndex}.taxRate`);
      const newQuantity = currentQty + 1;
      const subtotal = newQuantity * unitPrice;
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;
      
      form.setValue(`items.${existingIndex}.total`, total);
    } else {
      // Add new product
      const subtotal = product.unit_price;
      const taxAmount = subtotal * product.tax_rate;
      const total = subtotal + taxAmount;

      append({
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        quantity: 1,
        unitPrice: product.unit_price,
        taxRate: product.tax_rate,
        discount: 0,
        available: product.available, // Store for reference
        subtotal: subtotal,
        taxAmount: taxAmount,
        total: total,
      });
    }
  };

  const calculateRowTotal = (index: number) => {
    const quantity = form.watch(`items.${index}.quantity`) || 0;
    const unitPrice = form.watch(`items.${index}.unitPrice`) || 0;
    const taxRate = form.watch(`items.${index}.taxRate`) || 0;
    const discount = form.watch(`items.${index}.discount`) || 0;

    const subtotal = quantity * unitPrice;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount - discount;

    return {
      subtotal,
      taxAmount,
      total,
    };
  };

  const handleQuantityChange = (index: number, newQuantity: number) => {
    const item = fields[index] as any;
    
    // Validate stock for drafts
    if (documentType === "draft" && newQuantity > item.available) {
      alert(
        `Only ${item.available} units available. Cannot add more to draft.`
      );
      return;
    }

    form.setValue(`items.${index}.quantity`, newQuantity);
    
    // Recalculate total
    const totals = calculateRowTotal(index);
    form.setValue(`items.${index}.total`, totals.total);
  };

  return (
    <div className="space-y-4">
      {/* Product Search */}
      {!isReadOnly && (
        <div className="flex gap-2">
          <ProductSearchCombobox
            branchId={branchId}
            onProductSelect={handleProductSelect}
            documentType={documentType}
            placeholder="Search and add products... (F3)"
          />
        </div>
      )}

      {/* Items Table */}
      {fields.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[50px]">S.No</TableHead>
                <TableHead className="w-[120px]">Code</TableHead>
                <TableHead className="min-w-[200px]">Description</TableHead>
                <TableHead className="w-[100px]">Qty</TableHead>
                <TableHead className="w-[120px]">Unit Price</TableHead>
                <TableHead className="w-[80px]">Tax</TableHead>
                <TableHead className="w-[120px]">Amount</TableHead>
                {!isReadOnly && <TableHead className="w-[80px]">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field: any, index) => {
                const totals = calculateRowTotal(index);
                const available = field.available || 0;
                const quantity = form.watch(`items.${index}.quantity`) || 0;

                return (
                  <TableRow key={field.id}>
                    {/* S.No */}
                    <TableCell className="font-medium">{index + 1}</TableCell>

                    {/* Code */}
                    <TableCell>
                      <div className="font-mono text-sm">
                        {field.productSku}
                      </div>
                    </TableCell>

                    {/* Description */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{field.productName}</div>
                        {documentType === "draft" && quantity > available && (
                          <Badge variant="destructive" className="text-xs">
                            Exceeds stock ({available} available)
                          </Badge>
                        )}
                        {documentType === "quote" && available < quantity && (
                          <Badge variant="warning" className="text-xs bg-yellow-500">
                            Low stock ({available} available)
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Quantity */}
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={quantity}
                        onChange={(e) =>
                          handleQuantityChange(index, parseInt(e.target.value) || 0)
                        }
                        disabled={isReadOnly}
                        className="w-20"
                      />
                    </TableCell>

                    {/* Unit Price */}
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...form.register(`items.${index}.unitPrice`, {
                          valueAsNumber: true,
                        })}
                        disabled={isReadOnly}
                        className="w-28"
                      />
                    </TableCell>

                    {/* Tax Rate */}
                    <TableCell>
                      <div className="text-sm">
                        {(form.watch(`items.${index}.taxRate`) * 100 || 0).toFixed(0)}%
                      </div>
                    </TableCell>

                    {/* Amount */}
                    <TableCell>
                      <div className="text-right font-semibold">
                        {totals.total.toFixed(2)}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    {!isReadOnly && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Empty State */}
      {fields.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-12 text-center">
          <Plus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No items added</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Search and add products to create your {documentType}
          </p>
          {!isReadOnly && (
            <p className="text-xs text-muted-foreground">
              Press <kbd className="px-2 py-1 bg-muted rounded">F3</kbd> to
              quickly add products
            </p>
          )}
        </div>
      )}

      {form.formState.errors.items && (
        <p className="text-red-500 text-sm mt-2">
          {form.formState.errors.items.message}
        </p>
      )}
    </div>
  );
};
