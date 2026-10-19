"use client";

import * as React from "react";
import { toast as sonner } from "sonner";

/**
 * Legacy `useToast()` API, now backed by Sonner.
 *
 * The app mounts Sonner's <Toaster /> in the root layout, but no custom
 * <ToastProvider /> was ever mounted, so `useToast().toast(...)` silently hit
 * the context's no-op default and users never saw messages such as
 * "Insufficient inventory" or "Checkout failed" on the POS and finance pages.
 * Delegating to Sonner makes every existing caller work (no provider needed)
 * and keeps a single toast system app-wide, matching the Payroll page.
 */

type ToastType = "success" | "error" | "info" | "warning";

type ToastFn = (message: string, type?: ToastType, duration?: number) => void;

const showToast: ToastFn = (message, type = "info", duration = 3000) => {
  const options = { duration: duration > 0 ? duration : Infinity };
  switch (type) {
    case "success":
      sonner.success(message, options);
      break;
    case "error":
      sonner.error(message, options);
      break;
    case "warning":
      sonner.warning(message, options);
      break;
    default:
      sonner.info(message, options);
  }
};

// Stable reference so callers can safely list `toast` in effect dependencies.
const toastApi = { toast: showToast };

export const useToast = () => toastApi;

/** Kept for backwards compatibility; Sonner needs no provider. */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);
