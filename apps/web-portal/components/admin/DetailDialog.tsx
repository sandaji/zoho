/**
 * Detail Dialog Component
 * Displays detailed information in a modal
 */

"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface DetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  data: Record<string, any>;
  fields: Array<{
    key: string;
    label: string;
    render?: (value: any, data: Record<string, any>) => React.ReactNode;
  }>;
}

export function DetailDialog({
  open,
  onOpenChange,
  title,
  description,
  data,
  fields,
}: DetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {fields.map((field, index) => {
            const value = data[field.key];

            return (
              <div key={field.key}>
                {index > 0 && <Separator className="my-4" />}
                <div className="grid grid-cols-3 gap-4">
                  <div className="font-medium text-muted-foreground">
                    {field.label}
                  </div>
                  <div className="col-span-2">
                    {field.render
                      ? field.render(value, data)
                      : value?.toString() || "-"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to render status badges
export function renderStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    active: "default",
    inactive: "secondary",
    pending: "outline",
    confirmed: "default",
    delivered: "default",
    cancelled: "destructive",
    draft: "secondary",
    approved: "default",
    paid: "default",
    in_transit: "outline",
  };

  return (
    <Badge variant={variants[status.toLowerCase()] || "outline"}>
      {status.replace(/_/g, " ").toUpperCase()}
    </Badge>
  );
}

// Re-export currency formatter from utils for backward compatibility
export { formatCurrency } from "@/lib/utils";

// Helper function to format date
export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
