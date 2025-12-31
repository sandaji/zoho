import { toast } from "sonner";

export type ToastType = "success" | "error" | "info";

export function useToast() {
  function showToast(title: string, description?: string, type: ToastType = "info") {
    switch (type) {
      case "success":
        toast.success(title, { description });
        break;
      case "error":
        toast.error(title, { description });
        break;
      default:
        toast(title, { description });
    }
  }

  return { showToast };
}
