// frontend/components/sales/SalesDocumentBuilder.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DocumentTypeSelector } from "./DocumentTypeSelector";
import { DocumentHeader } from "./DocumentHeader";
import { DocumentItemTable } from "./DocumentItemTable";
import { DocumentTotals } from "./DocumentTotals";
import { DocumentActions } from "./DocumentActions";
import { Toaster, toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

// Define schema
const salesDocumentSchema = z.object({
  customerId: z.string().optional(),
  issueDate: z.date(),
  dueDate: z.date().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        productSku: z.string().optional(),
        productName: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
        taxRate: z.number().nonnegative(),
        discount: z.number().nonnegative().default(0),
        total: z.number(),
        available: z.number().optional(), // Stock availability
      })
    )
    .min(1, "At least one item is required."),
  notes: z.string().optional(),
  status: z.string().optional(),
});

type SalesDocumentFormValues = z.infer<typeof salesDocumentSchema>;

interface SalesDocumentBuilderProps {
  mode: "draft" | "quote" | "invoice" | "credit_note";
  initialData?: Partial<SalesDocumentFormValues>;
}

export const SalesDocumentBuilder: React.FC<SalesDocumentBuilderProps> = ({
  mode: initialMode,
  initialData,
}) => {
  const { user } = useAuth();
  const [documentType, setDocumentType] = useState<"draft" | "quote">(
    initialMode === "quote" ? "quote" : "draft"
  );
  const [isTypeLocked, setIsTypeLocked] = useState(false);

  const form = useForm<SalesDocumentFormValues>({
    resolver: zodResolver(salesDocumentSchema),
    defaultValues: initialData || {
      issueDate: new Date(),
      items: [],
      status: "draft",
    },
    mode: "onBlur",
  });

  // Lock document type after first item is added
  const items = form.watch("items");
  useEffect(() => {
    if (items && items.length > 0) {
      setIsTypeLocked(true);
    } else {
      setIsTypeLocked(false);
    }
  }, [items]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1: Add customer (to be implemented)
      if (e.key === "F1") {
        e.preventDefault();
        toast.info("Add customer feature coming soon!");
      }

      // F3: Focus product search
      if (e.key === "F3") {
        e.preventDefault();
        const searchButton = document.querySelector(
          '[role="combobox"]'
        ) as HTMLElement;
        searchButton?.click();
      }

      // F4: Delete last product
      if (e.key === "F4") {
        e.preventDefault();
        const currentItems = form.getValues("items");
        if (currentItems.length > 0) {
          form.setValue("items", currentItems.slice(0, -1));
          toast.success("Last item removed");
        }
      }

      // F5: Save document
      if (e.key === "F5") {
        e.preventDefault();
        form.handleSubmit(onSubmit)();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [form]);

  const onSubmit = async (data: SalesDocumentFormValues) => {
    try {
      // Calculate totals
      const items = data.items.map((item) => {
        const subtotal = item.quantity * item.unitPrice;
        const taxAmount = subtotal * item.taxRate;
        const total = subtotal + taxAmount - (item.discount || 0);
        
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          discount: item.discount || 0,
          total,
        };
      });

      const subtotal = items.reduce((sum, item) => {
        return sum + item.quantity * item.unitPrice;
      }, 0);

      const tax = items.reduce((sum, item) => {
        return sum + item.quantity * item.unitPrice * item.taxRate;
      }, 0);

      const discount = items.reduce((sum, item) => sum + (item.discount || 0), 0);
      const total = subtotal + tax - discount;

      const payload = {
        type: documentType.toUpperCase(),
        customerId: data.customerId || null,
        issueDate: data.issueDate,
        dueDate: data.dueDate || null,
        items,
        subtotal,
        tax,
        discount,
        total,
        notes: data.notes || null,
        status: "DRAFT",
      };

      console.log("Submitting document:", payload);

      const response = await fetch("/api/sales/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create document");
      }

      toast.success(
        `${documentType.charAt(0).toUpperCase() + documentType.slice(1)} created successfully!`
      );

      // Reset form
      form.reset({
        issueDate: new Date(),
        items: [],
        status: "draft",
      });
      setIsTypeLocked(false);
    } catch (error: any) {
      console.error("Error creating document:", error);
      toast.error(error.message || "Failed to create document");
    }
  };

  const handleSaveDraft = () => {
    form.setValue("status", "DRAFT");
    form.handleSubmit(onSubmit)();
  };

  // Check if read-only
  const isReadOnly =
    initialData?.status === "CONVERTED" ||
    initialData?.status === "PAID" ||
    initialData?.status === "VOID";

  if (!user?.branchId) {
    return (
      <div className="flex items-center justify-center p-12 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground">
          Branch information is required to create documents
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Document Type Selector - Only show for new documents */}
      {!initialData && (
        <DocumentTypeSelector
          selectedType={documentType}
          onTypeChange={setDocumentType}
          disabled={isTypeLocked}
        />
      )}

      {/* Document Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <DocumentHeader form={form} isReadOnly={isReadOnly} />
        
        <DocumentItemTable
          form={form}
          isReadOnly={isReadOnly}
          documentType={documentType}
          branchId={user.branchId}
        />
        
        <DocumentTotals form={form} />
        
        <DocumentActions
          form={form}
          isSubmitting={form.formState.isSubmitting}
          isReadOnly={isReadOnly}
          mode={documentType}
          onSaveDraft={handleSaveDraft}
        />
      </form>

      {/* Keyboard Shortcuts Helper */}
      <div className="p-4 bg-muted/50 rounded-lg text-xs space-y-1">
        <p className="font-semibold mb-2">⌨️ Keyboard Shortcuts:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <kbd className="px-2 py-1 bg-background rounded border">F1</kbd> Add
            Customer
          </div>
          <div>
            <kbd className="px-2 py-1 bg-background rounded border">F3</kbd> Add
            Product
          </div>
          <div>
            <kbd className="px-2 py-1 bg-background rounded border">F4</kbd>{" "}
            Remove Last
          </div>
          <div>
            <kbd className="px-2 py-1 bg-background rounded border">F5</kbd> Save
          </div>
        </div>
      </div>

      <Toaster />
    </div>
  );
};
