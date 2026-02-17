"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getApiUrl, API_ENDPOINTS, getAuthHeaders } from "@/lib/api-config";
import { Package, Loader2, Search, AlertCircle } from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  unit_price: number;
  available: number;
  category?: string;
}

interface Props {
  branchId: string;
  onSelect: (product: Product) => void;
  autoFocus?: boolean;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function AutocompleteProductSearch({
  branchId,
  onSelect,
  autoFocus = true,
  searchInputRef,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Global shortcut: "/" to focus search
  useEffect(() => {
    const handleGlobalShortcut = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleGlobalShortcut);
    return () => window.removeEventListener("keydown", handleGlobalShortcut);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch product suggestions with debouncing
  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      setIsOpen(false);
      setError(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(getApiUrl(API_ENDPOINTS.POS_PRODUCTS_SEARCH), {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            search: trimmedQuery,
            branchId,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.message || "Search failed");
        }

        // Handle both single object and array responses
        const products = Array.isArray(json.data) ? json.data : [json.data];

        setResults(products.filter(Boolean).slice(0, 8)); // Limit to 8 results
        setIsOpen(products.length > 0);
        setActiveIndex(-1);
      } catch (err) {
        console.error("Search error:", err);
        setError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
        setIsOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, branchId]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      // Allow Enter to search even if dropdown closed
      if (e.key === "Enter" && query.trim()) {
        e.preventDefault();
        // Re-trigger search
        return;
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;

      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, -1));
        break;

      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) {
          selectProduct(results[activeIndex]);
        } else if (results[0]) {
          // If no item selected, select first result (barcode scanner behavior)
          selectProduct(results[0]);
        }
        break;

      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        setQuery("");
        inputRef.current?.blur();
        break;
    }
  };

  const selectProduct = (product: Product) => {
    onSelect(product);

    // Clear and refocus for next item
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setActiveIndex(-1);
    setError(null);

    // Auto-focus for next scan/search
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const getStockColor = (available: number) => {
    if (available === 0) return "text-red-600";
    if (available <= 5) return "text-orange-600";
    return "text-green-600";
  };

  const getStockLabel = (available: number) => {
    if (available === 0) return "Out of Stock";
    if (available <= 5) return "Low Stock";
    return "In Stock";
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />

        <Input
          ref={searchInputRef || inputRef}
          value={query}
          placeholder="Search product by name, SKU, or scan barcode..."
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          className="h-12 pl-10 pr-10 text-base"
          disabled={loading}
        />

        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Keyboard shortcut hint */}
      {!query && !isOpen && (
        <p className="mt-1 text-xs text-muted-foreground">
          Press <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">/ </kbd> to focus search
        </p>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-md bg-red-50 p-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <Card className="absolute z-50 mt-2 w-full overflow-hidden border shadow-lg">
          <div className="max-h-96 overflow-y-auto">
            {results.map((product, index) => (
              <button
                key={product.id}
                onClick={() => selectProduct(product)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "flex w-full items-center justify-between gap-4 border-b p-3 text-left transition-colors last:border-b-0",
                  index === activeIndex ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  product.available === 0 && "opacity-50"
                )}
                disabled={product.available === 0}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
                      index === activeIndex ? "bg-primary-foreground/10" : "bg-muted"
                    )}
                  >
                    <Package
                      className={cn(
                        "h-5 w-5",
                        index === activeIndex ? "text-primary-foreground" : "text-muted-foreground"
                      )}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{product.name}</p>
                    <div className="flex items-center gap-2 text-sm opacity-90">
                      <span className="font-mono">{product.sku}</span>
                      {product.category && (
                        <>
                          <span>•</span>
                          <span className="truncate">{product.category}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-lg font-bold">
                    KSh {(product.unit_price || 0).toLocaleString()}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      index === activeIndex ? "opacity-90" : getStockColor(product.available)
                    )}
                  >
                    {product.available} {getStockLabel(product.available)}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Navigation hint */}
          <div className="border-t bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Use <kbd className="rounded bg-background px-1 py-0.5 font-mono">↑↓</kbd> to navigate •{" "}
            <kbd className="rounded bg-background px-1 py-0.5 font-mono">Enter</kbd> to select •{" "}
            <kbd className="rounded bg-background px-1 py-0.5 font-mono">Esc</kbd> to close
          </div>
        </Card>
      )}

      {/* No results message */}
      {isOpen && !loading && results.length === 0 && query && (
        <Card className="absolute z-50 mt-2 w-full p-4 text-center">
          <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No products found</p>
          <p className="text-xs text-muted-foreground">Try searching by name, SKU, or barcode</p>
        </Card>
      )}
    </div>
  );
}
