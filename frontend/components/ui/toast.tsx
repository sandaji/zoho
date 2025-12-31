/**
 * Toast Component
 * Error notifications and status messages using Sonner
 */

import { toast, Toaster } from "sonner";
import React from "react";

// ============================================================================
// TOAST VARIANT TYPES
// ============================================================================

export type ToastVariant = "default" | "success" | "error" | "warning" | "info" | "loading";

export interface ToastOptions {
  duration?: number;
  dismissible?: boolean;
  position?:
    | "top-left"
    | "top-center"
    | "top-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  className?: string;
}

// ============================================================================
// TOAST PROVIDER COMPONENT
// ============================================================================

/**
 * Wrap your app with ToastProvider to enable toast notifications
 * Place at root level (e.g., in layout.tsx)
 */
export const ToastProvider = () => {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      theme="light"
      expand={false}
      visibleToasts={5}
    />
  );
};

// ============================================================================
// TOAST FUNCTIONS
// ============================================================================

/**
 * Show default toast
 */
export const showToast = (message: string, options?: ToastOptions) => {
  toast(message, {
    duration: options?.duration || 4000,
    dismissible: options?.dismissible !== false,
    position: options?.position || "top-right",
    icon: options?.icon,
    action: options?.action,
    onDismiss: options?.onDismiss,
    className: options?.className,
  });
};

/**
 * Show success toast
 */
export const showSuccessToast = (message: string, options?: ToastOptions) => {
  toast.success(message, {
    duration: options?.duration || 3000,
    dismissible: options?.dismissible !== false,
    position: options?.position || "top-right",
    icon: options?.icon,
    action: options?.action,
    onDismiss: options?.onDismiss,
    className: options?.className,
  });
};

/**
 * Show error toast with customizable details
 */
export const showErrorToast = (message: string, options?: ToastOptions & { details?: string }) => {
  let content = message;

  if (options?.details) {
    content = `${message}: ${options.details}`;
  }

  toast.error(content, {
    duration: options?.duration || 5000,
    dismissible: options?.dismissible !== false,
    position: options?.position || "top-right",
    icon: options?.icon,
    action: options?.action,
    onDismiss: options?.onDismiss,
    className: options?.className,
  });
};

/**
 * Show warning toast
 */
export const showWarningToast = (message: string, options?: ToastOptions) => {
  toast.warning(message, {
    duration: options?.duration || 4000,
    dismissible: options?.dismissible !== false,
    position: options?.position || "top-right",
    icon: options?.icon,
    action: options?.action,
    onDismiss: options?.onDismiss,
    className: options?.className,
  });
};

/**
 * Show info toast
 */
export const showInfoToast = (message: string, options?: ToastOptions) => {
  toast.info(message, {
    duration: options?.duration || 4000,
    dismissible: options?.dismissible !== false,
    position: options?.position || "top-right",
    icon: options?.icon,
    action: options?.action,
    onDismiss: options?.onDismiss,
    className: options?.className,
  });
};

/**
 * Show loading toast (typically followed by success/error)
 */
export const showLoadingToast = (message: string, options?: ToastOptions) => {
  return toast.loading(message, {
    position: options?.position || "top-right",
    duration: options?.duration,
    className: options?.className,
  });
};

/**
 * Update a specific toast (useful for loading -> success/error transitions)
 */
export const updateToast = (
  id: string | number,
  options: {
    message?: string;
    variant?: ToastVariant;
    action?: {
      label: string;
      onClick: () => void;
    };
    onDismiss?: () => void;
  }
) => {
  const variant = options.variant || "default";

  if (variant === "success") {
    toast.success(options.message || "Success", { id });
  } else if (variant === "error") {
    toast.error(options.message || "Error", { id });
  } else if (variant === "warning") {
    toast.warning(options.message || "Warning", { id });
  } else if (variant === "info") {
    toast.info(options.message || "Info", { id });
  } else {
    toast(options.message || "Updated", { id });
  }
};

/**
 * Dismiss a specific toast
 */
export const dismissToast = (id: string | number) => {
  toast.dismiss(id);
};

/**
 * Dismiss all toasts
 */
export const dismissAllToasts = () => {
  toast.dismiss();
};

// ============================================================================
// TOAST UTILITY FUNCTIONS
// ============================================================================

/**
 * Show progress toast for long-running operations
 */
export const showProgressToast = (
  message: string,
  progress: number, // 0-100
  options?: ToastOptions
) => {
  const progressText = `${Math.round(progress)}%`;

  return toast(
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium">{message}</div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-xs text-gray-500">{progressText}</div>
    </div>,
    {
      duration: Infinity, // Keep visible until dismissed
      dismissible: false,
      position: options?.position || "bottom-right",
    }
  );
};

/**
 * Show promise-based toast (auto updates on success/error)
 */
export const showPromiseToast = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success?: (data: T) => string;
    error?: (error: Error) => string;
  }
) => {
  toast.promise(promise, {
    loading: messages.loading,
    success: (data: T) => messages.success?.(data) || "Success",
    error: (error: Error) => messages.error?.(error) || error.message || "Error occurred",
  });
  return promise;
};

/**
 * Show custom toast with React component
 */
export const showCustomToast = (content: React.ReactNode, options?: ToastOptions) => {
  return toast(content, {
    duration: options?.duration || 4000,
    dismissible: options?.dismissible !== false,
    position: options?.position || "top-right",
    className: options?.className,
  });
};

/**
 * Handle API error response and show appropriate toast
 */
export const handleApiError = (error: any, fallbackMessage?: string) => {
  const message =
    error?.response?.data?.error?.message ||
    error?.message ||
    fallbackMessage ||
    "An error occurred";

  const details = error?.response?.data?.error?.details?.[0]?.message;

  showErrorToast(message, {
    details,
    duration: 5000,
  });
};

/**
 * Show async operation toast (loading -> success/error)
 */
export const showAsyncToast = async <T,>(
  operation: Promise<T>,
  messages: {
    loading?: string;
    success?: string | ((data: T) => string);
    error?: string | ((error: Error) => string);
  }
): Promise<T> => {
  const toastId = showLoadingToast(messages.loading || "Processing...");

  try {
    const result = await operation;
    const successMessage =
      typeof messages.success === "function"
        ? messages.success(result)
        : messages.success || "Success";

    updateToast(toastId, {
      message: successMessage,
      variant: "success",
    });

    return result;
  } catch (error) {
    const errorMessage =
      typeof messages.error === "function"
        ? messages.error(error as Error)
        : messages.error || (error as Error).message || "Error occurred";

    updateToast(toastId, {
      message: errorMessage,
      variant: "error",
    });

    throw error;
  }
};

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Show multiple toasts in sequence with delays
 */
export const showBatchToasts = (
  toasts: Array<{
    message: string;
    variant?: ToastVariant;
    delay?: number;
  }>
) => {
  toasts.forEach((t, index) => {
    const delayMs = t.delay || (index + 1) * 200;

    setTimeout(() => {
      if (t.variant === "success") {
        showSuccessToast(t.message);
      } else if (t.variant === "error") {
        showErrorToast(t.message);
      } else if (t.variant === "warning") {
        showWarningToast(t.message);
      } else if (t.variant === "info") {
        showInfoToast(t.message);
      } else {
        showToast(t.message);
      }
    }, delayMs);
  });
};

// ============================================================================
// TOAST HOOKS
// ============================================================================

/**
 * Hook for using toasts in components
 */
export const useToast = () => {
  return {
    show: showToast,
    success: showSuccessToast,
    error: showErrorToast,
    warning: showWarningToast,
    info: showInfoToast,
    loading: showLoadingToast,
    update: updateToast,
    dismiss: dismissToast,
    dismissAll: dismissAllToasts,
    promise: showPromiseToast,
    async: showAsyncToast,
    custom: showCustomToast,
    handleApiError,
  };
};
