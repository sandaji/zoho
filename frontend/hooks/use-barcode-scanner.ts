import { useEffect, useRef, useState, useCallback } from "react";
import { getApiUrl, getAuthHeaders } from "@/lib/api-config";
import { useToast } from "@/lib/toast-context";

interface ScannedProduct {
  id: string;
  sku: string;
  name: string;
  unit_price: number;
  available: number;
  category?: string;
}

interface UseBarcodeScanner {
  onProductScanned: (product: ScannedProduct) => void;
  branchId: string;
  enabled?: boolean;
}

/**
 * Hook for detecting barcode scanner input
 * Barcode scanners typically emit the scanned value followed by Enter key
 *
 * Listens for rapid keyboard input and performs SKU lookup when complete
 * Returns product data via callback for adding to cart
 */
export function useBarcodeScanner({
  onProductScanned,
  branchId,
  enabled = true,
}: UseBarcodeScanner) {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scannedValueRef = useRef("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const performSKULookup = useCallback(
    async (sku: string) => {
      if (!sku.trim()) return;

      try {
        setIsLoading(true);
        const response = await fetch(
          `${getApiUrl("/v1/pos/products/search")}?sku=${encodeURIComponent(sku.trim())}&branchId=${branchId}`,
          {
            headers: getAuthHeaders(),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          toast(data.message || `Product with SKU "${sku}" not found`, "error");
          return;
        }

        const data = await response.json();

        if (!data.success || !data.data || data.data.length === 0) {
          toast(`Product with SKU "${sku}" not found`, "error");
          return;
        }

        const product = data.data[0];

        if (product.available <= 0) {
          toast(`Product "${product.name}" is out of stock`, "warning");
          return;
        }

        // Call the callback to add product to cart
        onProductScanned(product);
        toast(`Added: ${product.name}`, "success");
      } catch (error) {
        toast("Failed to lookup product", "error");
        console.error("Barcode scanner lookup error:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [branchId, onProductScanned, toast]
  );

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input field (unless it's the main search which we want to skip)
      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true";

      // Allow barcode scanning in all contexts (even while typing in search)
      // Barcode scanners emit keys rapidly, normal typing is slower

      // Enter key signals end of barcode
      if (e.key === "Enter" && scannedValueRef.current.length > 0) {
        e.preventDefault();
        setIsScanning(false);

        const sku = scannedValueRef.current.trim();
        scannedValueRef.current = "";

        // Only process if it looks like a barcode (at least 3 chars)
        if (sku.length >= 3) {
          performSKULookup(sku);
        }
        return;
      }

      // Skip if modifier keys are pressed (Ctrl, Alt, Cmd, Shift)
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;

      // Skip function keys and special keys
      if (e.key.length > 1 && e.key !== "Backspace") return;

      // Backspace: remove last character
      if (e.key === "Backspace") {
        scannedValueRef.current = scannedValueRef.current.slice(0, -1);
        if (scannedValueRef.current.length === 0) {
          setIsScanning(false);
        }
        return;
      }

      // Printable character: add to scanned value
      if (e.key.length === 1) {
        e.preventDefault();
        scannedValueRef.current += e.key;
        setIsScanning(true);

        // Reset timeout - clears the scanned value if no input for 2 seconds
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          scannedValueRef.current = "";
          setIsScanning(false);
        }, 2000);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, performSKULookup]);

  return {
    isScanning,
    isLoading,
    currentScanValue: scannedValueRef.current,
  };
}
