// frontend/components/sales/DocumentActions.tsx
"use client";

import React from "react";
import { Button } from "../ui/button";
import { Loader2, Save, FileCheck, Printer } from "lucide-react";

interface DocumentActionsProps {
  form: any;
  isSubmitting: boolean;
  isReadOnly: boolean;
  mode: "draft" | "quote" | "invoice" | "credit_note";
  onSaveDraft?: () => void;
}
export const DocumentActions: React.FC<DocumentActionsProps> = ({
  isSubmitting,
  isReadOnly,
  mode,
  onSaveDraft,
}) => {
  // If the document is read-only, show contextual actions instead of form submission buttons
  if (isReadOnly) {
    return (
      <div className="flex justify-end space-x-2 pt-4 border-t">
        {mode === "invoice" && (
          <Button type="button" variant="outline">
            Create Credit Note
          </Button>
        )}
        <Button type="button" variant="outline">
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>
    );
  }

  // Otherwise, show the form submission buttons
  return (
    <div className="flex justify-between items-center pt-4 border-t">
      <div className="text-sm text-muted-foreground">
        {mode === "draft"
          ? "Stock will be validated before saving"
          : "Quote will be valid for 3 days from creation"}
      </div>

      <div className="flex space-x-2">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onSaveDraft}
        >
          <Save className="mr-2 h-4 w-4" />
          Save as Draft
        </Button>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <FileCheck className="mr-2 h-4 w-4" />
              Save {mode === "draft" ? "Draft" : "Quote"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
