// frontend/components/sales/DocumentTypeSelector.tsx
"use client";

import React from "react";
import { FileText, FileCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DocumentTypeSelectorProps {
  selectedType: "draft" | "quote";
  onTypeChange: (type: "draft" | "quote") => void;
  disabled?: boolean;
}

export function DocumentTypeSelector({
  selectedType,
  onTypeChange,
  disabled = false,
}: DocumentTypeSelectorProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold">Document Type</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Select the type of document before adding items
            </p>
          </div>

          <RadioGroup
            value={selectedType}
            onValueChange={(value) => onTypeChange(value as "draft" | "quote")}
            disabled={disabled}
            className="grid grid-cols-2 gap-4"
          >
            {/* Draft Option */}
            <div>
              <RadioGroupItem
                value="draft"
                id="draft"
                className="peer sr-only"
              />
              <Label
                htmlFor="draft"
                className={`flex flex-col items-center justify-between rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-accent hover:border-primary/50"
                } ${
                  selectedType === "draft"
                    ? "border-primary bg-primary/5"
                    : "border-muted"
                }`}
              >
                <FileText
                  className={`mb-3 h-8 w-8 ${
                    selectedType === "draft"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                />
                <div className="text-center">
                  <div className="font-semibold">Draft</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    For internal use. Requires stock availability.
                  </div>
                </div>
              </Label>
            </div>

            {/* Quote Option */}
            <div>
              <RadioGroupItem
                value="quote"
                id="quote"
                className="peer sr-only"
              />
              <Label
                htmlFor="quote"
                className={`flex flex-col items-center justify-between rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-accent hover:border-primary/50"
                } ${
                  selectedType === "quote"
                    ? "border-primary bg-primary/5"
                    : "border-muted"
                }`}
              >
                <FileCheck
                  className={`mb-3 h-8 w-8 ${
                    selectedType === "quote"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                />
                <div className="text-center">
                  <div className="font-semibold">Quote</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    For customers. Valid for 3 days.
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {/* Information Alerts */}
          {selectedType === "draft" && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Draft:</strong> Stock will be validated. Items with
                insufficient stock cannot be added.
              </AlertDescription>
            </Alert>
          )}

          {selectedType === "quote" && (
            <Alert>
              <FileCheck className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Quote:</strong> Can be created even with low stock.
                Admin approval may be required if items are out of stock.
              </AlertDescription>
            </Alert>
          )}

          {disabled && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Document type cannot be changed after adding items. To change
                type, clear all items first.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
