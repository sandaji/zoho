// frontend/components/sales/ProductSearchCombobox.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Check, ChevronsUpDown, AlertCircle, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  unit_price: number;
  tax_rate: number;
  category?: string;
  unit_of_measurement: string;
  quantity: number;
  available: number;
  reserved: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
  reorder_level: number;
}

interface ProductSearchComboboxProps {
  branchId: string;
  onProductSelect: (product: Product) => void;
  disabled?: boolean;
  documentType: "draft" | "quote";
  placeholder?: string;
}

export function ProductSearchCombobox({
  branchId,
  onProductSelect,
  disabled = false,
  documentType,
  placeholder = "Search products...",
}: ProductSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const searchProducts = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setProducts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/products/search/pos?q=${encodeURIComponent(query)}&branchId=${branchId}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to search products");
      }

      const data = await response.json();
      setProducts(data.data || []);
    } catch (err) {
      console.error("Product search error:", err);
      setError("Failed to search products. Please try again.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    if (debouncedSearch) {
      searchProducts(debouncedSearch);
    } else {
      setProducts([]);
    }
  }, [debouncedSearch, searchProducts]);

  const handleSelect = (product: Product) => {
    // Check stock availability for drafts
    if (documentType === "draft" && product.available <= 0) {
      setError(`${product.name} is out of stock. Cannot add to draft.`);
      return;
    }

    // Warn for quotes with low stock
    if (documentType === "quote" && product.available <= 0) {
      const confirmed = window.confirm(
        `${product.name} is out of stock. This quote will require admin approval. Continue?`
      );
      if (!confirmed) return;
    }

    onProductSelect(product);
    setOpen(false);
    setSearch("");
    setProducts([]);
  };

  const getStockBadge = (product: Product) => {
    if (product.status === "out_of_stock") {
      return (
        <Badge variant="destructive" className="text-xs">
          Out of Stock
        </Badge>
      );
    }
    if (product.status === "low_stock") {
      return (
        <Badge variant="warning" className="text-xs bg-yellow-500">
          Low Stock ({product.available})
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs">
        In Stock ({product.available})
      </Badge>
    );
  };

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              {placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[600px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name, SKU, or barcode..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Searching products...
                </div>
              )}
              
              {!loading && error && (
                <div className="py-6 px-4">
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                </div>
              )}
              
              {!loading && !error && search.length > 0 && products.length === 0 && (
                <CommandEmpty>
                  No products found. Try a different search term.
                </CommandEmpty>
              )}
              
              {!loading && products.length > 0 && (
                <CommandGroup>
                  {products.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={product.id}
                      onSelect={() => handleSelect(product)}
                      className="flex items-center justify-between py-3 cursor-pointer"
                      disabled={documentType === "draft" && product.available <= 0}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{product.name}</span>
                          {getStockBadge(product)}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>SKU: {product.sku}</span>
                          <span>•</span>
                          <span>KES {product.unit_price.toFixed(2)}</span>
                          {product.category && (
                            <>
                              <span>•</span>
                              <span>{product.category}</span>
                            </>
                          )}
                        </div>
                        {documentType === "draft" && product.available <= 0 && (
                          <div className="text-xs text-destructive">
                            Cannot add to draft - insufficient stock
                          </div>
                        )}
                      </div>
                      <Check
                        className={cn(
                          "ml-2 h-4 w-4",
                          "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
