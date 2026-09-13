import { useCallback } from "react";
import { toast as sonnerToast } from "sonner";

export type ToastType = "success" | "error" | "info";

export function useToast() {
  const showToast = useCallback((title: string, description?: string, type: ToastType = "info") => {
    switch (type) {
      case "success":
        sonnerToast.success(title, { description });
        break;
      case "error":
        sonnerToast.error(title, { description });
        break;
      default:
        sonnerToast(title, { description });
    }
  }, []);

  return { showToast };
}

/**
 * Standalone shadcn-ui style toast function, for call sites that use the
 * classic object-argument API: toast({ title, description, variant }).
 * Kept alongside the useToast() hook above for backward compatibility with
 * components written against the older shadcn toast API.
 */
export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function toast({ title, description, variant }: ToastOptions) {
  if (variant === "destructive") {
    sonnerToast.error(title, { description });
  } else {
    sonnerToast.success(title ?? "", { description });
  }
}
