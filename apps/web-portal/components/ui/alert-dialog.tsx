/**
 * Alert Dialog Component
 * Critical confirmations using Radix UI Alert Dialog
 */

"use client";

import React, { useState, useCallback } from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";

// ============================================================================
// ALERT DIALOG PRIMITIVE COMPONENTS
// ============================================================================

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogCancel = AlertDialogPrimitive.Cancel;

// ============================================================================
// STYLED ALERT DIALOG COMPONENTS
// ============================================================================

export const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      )}
    />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-gray-200 bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg",
        className
      )}
      {...props}
    />
  </AlertDialogPrimitive.Portal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

// ============================================================================
// HEADER, TITLE, DESCRIPTION
// ============================================================================

export const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

export const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

export const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

export const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-gray-500", className)}
    {...props}
  />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

// ============================================================================
// ACTION BUTTON
// ============================================================================

export const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> & {
    variant?: "default" | "destructive" | "success" | "warning";
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variantClasses = {
    default: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
    warning: "bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500",
  };

  return (
    <AlertDialogPrimitive.Action
      ref={ref}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
});
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

// ============================================================================
// CANCEL BUTTON STYLED
// ============================================================================

export const AlertDialogCancelButton = React.forwardRef<
  React.ElementRef<typeof AlertDialogCancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogCancel>
>(({ className, ...props }, ref) => (
  <AlertDialogCancel
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-offset-background transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 mt-2 sm:mt-0",
      className
    )}
    {...props}
  />
));
AlertDialogCancelButton.displayName = "AlertDialogCancelButton";

// ============================================================================
// HOOKS & UTILITIES
// ============================================================================

/**
 * Hook to manage alert dialog state
 */
export const useAlertDialog = () => {
  const [open, setOpen] = useState(false);

  return {
    open,
    setOpen,
    openDialog: () => setOpen(true),
    closeDialog: () => setOpen(false),
    toggleDialog: () => setOpen(!open),
  };
};

/**
 * Confirmation dialog component with preset styling
 */
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  variant?: "default" | "destructive" | "success" | "warning";
  icon?: React.ReactNode;
}

export const ConfirmDialog = React.forwardRef<HTMLDivElement, ConfirmDialogProps>(
  (
    {
      open,
      onOpenChange,
      title,
      description,
      confirmText = "Confirm",
      cancelText = "Cancel",
      onConfirm,
      onCancel,
      isLoading = false,
      variant = "default",
      icon,
    },
    ref
  ) => {
    const [confirming, setConfirming] = useState(false);

    const handleConfirm = useCallback(async () => {
      setConfirming(true);
      try {
        await onConfirm();
        onOpenChange(false);
      } catch (error) {
        console.error("Confirmation action failed:", error);
      } finally {
        setConfirming(false);
      }
    }, [onConfirm, onOpenChange]);

    const handleCancel = useCallback(() => {
      onCancel?.();
      onOpenChange(false);
    }, [onCancel, onOpenChange]);

    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent ref={ref}>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              {icon && <div className="shrink-0">{icon}</div>}
              <AlertDialogTitle>{title}</AlertDialogTitle>
            </div>
            {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancelButton onClick={handleCancel} disabled={confirming || isLoading}>
              {cancelText}
            </AlertDialogCancelButton>
            <AlertDialogAction
              onClick={handleConfirm}
              variant={variant}
              disabled={confirming || isLoading}
            >
              {confirming || isLoading ? "Processing..." : confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

ConfirmDialog.displayName = "ConfirmDialog";

/**
 * Info dialog for important notifications
 */
export const InfoDialog = React.forwardRef<
  HTMLDivElement,
  {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    message: string;
    actionText?: string;
    onAction?: () => void;
    icon?: React.ReactNode;
  }
>(({ open, onOpenChange, title, message, actionText = "OK", onAction, icon }, ref) => {
  const handleAction = useCallback(() => {
    onAction?.();
    onOpenChange(false);
  }, [onAction, onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent ref={ref}>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            {icon && <div className="shrink-0">{icon}</div>}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleAction} variant="default">
            {actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

InfoDialog.displayName = "InfoDialog";

/**
 * Danger dialog for high-impact operations
 */
export const DangerDialog = React.forwardRef<
  HTMLDivElement,
  {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void | Promise<void>;
    isLoading?: boolean;
    icon?: React.ReactNode;
  }
>(
  (
    {
      open,
      onOpenChange,
      title,
      message,
      confirmText = "Delete",
      onConfirm,
      isLoading = false,
      icon,
    },
    ref
  ) => {
    const [confirming, setConfirming] = useState(false);

    const handleConfirm = useCallback(async () => {
      setConfirming(true);
      try {
        await onConfirm();
        onOpenChange(false);
      } catch (error) {
        console.error("Danger action failed:", error);
      } finally {
        setConfirming(false);
      }
    }, [onConfirm, onOpenChange]);

    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent ref={ref}>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              {icon && <div className="shrink-0 text-red-600">{icon}</div>}
              <AlertDialogTitle className="text-red-600">{title}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-600">{message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancelButton
              onClick={() => onOpenChange(false)}
              disabled={confirming || isLoading}
            >
              Cancel
            </AlertDialogCancelButton>
            <AlertDialogAction
              onClick={handleConfirm}
              variant="destructive"
              disabled={confirming || isLoading}
            >
              {confirming || isLoading ? "Deleting..." : confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

DangerDialog.displayName = "DangerDialog";
