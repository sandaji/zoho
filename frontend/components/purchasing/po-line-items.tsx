"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, Trash2, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency } from "@/lib/utils";
import { warehouseService } from "@/lib/warehouse.service";

export interface POProduct {
  id: string;
  sku: string;
  name: string;
  unit_price: number;
  cost_price: number;
}

export interface POLineItem {
  id: string;
  product: POProduct | null;
  description?: string;
  lineType?: "STOCKED" | "NON_STOCK";
  quantity: number;
  unitPrice: number;
}

const newId = () => Math.random().toString(36).slice(2, 11);

export const newBlankLine = (): POLineItem => ({
  id: newId(),
  product: null,
  quantity: 1,
  unitPrice: 0,
});

/**
 * Kept for the edit page. Lines are now only created by the search box, so
 * blank rows are never rendered — they're simply ignored by the table.
 */
export const withTrailingBlank = (items: POLineItem[]): POLineItem[] => items;

interface ComboboxProps {
  token: string;
  vendorId: string;
  excludeIds?: string[];
  onPick: (product: POProduct) => void;
  placeholder?: string;
  className?: string;
  /**
   * Single-select use: text shown in the box once something has been picked.
   * Leave unset to clear the box after every pick (add-to-list use).
   */
  selectedLabel?: string;
}

/**
 * Vendor-scoped product search box. Results refetch as the user types and
 * only ever include the given vendor's products.
 */
export function VendorProductCombobox({
  token,
  vendorId,
  excludeIds = [],
  onPick,
  placeholder,
  className,
  selectedLabel,
}: ComboboxProps) {
  const [query, setQuery] = useState("");
  const [typing, setTyping] = useState(false);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<POProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const requestId = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const disabled = !vendorId;

  useEffect(() => {
    if (!open || disabled) return;
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await warehouseService.getProducts(token, {
          vendorId,
          search: query.trim() || undefined,
          limit: 20,
        });
        if (id !== requestId.current) return;
        setResults(res.data?.products || []);
        setHighlight(0);
      } catch (e) {
        if (id === requestId.current) setResults([]);
        console.error("Failed to search products:", e);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [query, open, vendorId, token, disabled]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setTyping(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const visible = results.filter((p) => !excludeIds.includes(p.id));

  const choose = (p: POProduct) => {
    onPick(p);
    setQuery("");
    setTyping(false);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        disabled={disabled}
        value={selectedLabel && !typing ? selectedLabel : query}
        placeholder={
          disabled ? "Select a vendor first" : (placeholder ?? "Search vendor products...")
        }
        className="pl-9"
        onFocus={() => {
          setOpen(true);
          // Single-select: start searching from an empty box rather than
          // editing the displayed label.
          if (selectedLabel) setTyping(true);
        }}
        onClick={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setTyping(false);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setTyping(true);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, visible.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && open && visible[highlight]) {
            e.preventDefault();
            choose(visible[highlight]!);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {loading && (
        <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {open && !disabled && (
        <div
          // Keep focus in the input while clicking / scrolling the list, so the
          // blur handler above doesn't close it mid-interaction.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute right-0 z-50 mt-1 max-h-72 w-full min-w-80 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md"
        >
          {visible.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <PackageSearch className="h-4 w-4" />
              {loading ? "Searching..." : "No matching products for this vendor"}
            </div>
          ) : (
            visible.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm",
                  i === highlight && "bg-emerald-50 text-emerald-900"
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">{p.sku}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatCurrency(p.cost_price)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface SearchProps {
  token: string;
  vendorId: string;
  items: POLineItem[];
  onChange: (items: POLineItem[]) => void;
  className?: string;
}

/**
 * Search box for the PO form: choosing a product appends it to the line items
 * (quantity 1, price defaulted to the product's cost price) and clears the box.
 */
export function POProductSearch({ token, vendorId, items, onChange, className }: SearchProps) {
  const selectedIds = items.map((i) => i.product?.id).filter(Boolean) as string[];

  return (
    <VendorProductCombobox
      token={token}
      vendorId={vendorId}
      excludeIds={selectedIds}
      placeholder="Search vendor products to add..."
      className={className}
      onPick={(p) =>
        onChange([
          ...items.filter((i) => i.product || i.description),
          {
            id: newId(),
            product: p,
            quantity: 1,
            unitPrice: Number(p.cost_price) || 0,
          },
        ])
      }
    />
  );
}

interface LineItemsProps {
  items: POLineItem[];
  onChange: (items: POLineItem[]) => void;
  // Accepted for backwards compatibility with existing callers.
  token?: string;
  vendorId?: string;
}

/**
 * Lists the products added through <POProductSearch />. The row number column
 * comes from the app's shared <TableRow> (it injects a "#" column itself), so
 * numbering is automatic and updates when rows are removed.
 */
export function POLineItemsTable({ items, onChange }: LineItemsProps) {
  const rows = items.filter((i) => i.product || i.description);

  const update = (id: string, patch: Partial<POLineItem>) =>
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const remove = (id: string) => onChange(items.filter((i) => i.id !== id));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-72">Product</TableHead>
          <TableHead className="w-28 text-right">Quantity</TableHead>
          <TableHead className="w-36 text-right">Unit Price</TableHead>
          <TableHead className="w-36 text-right">Total</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
              No products added yet — use the search above to add items.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((item, index) => (
            <TableRow key={item.id}>
              <TableCell>
                <span className="font-medium text-foreground">{item.product?.name ?? item.description}</span>
                <span className="ml-2 text-xs text-muted-foreground">{item.lineType === "NON_STOCK" ? "Internal use" : item.product?.sku}</span>
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    update(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                  className="text-right"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) =>
                    update(item.id, { unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })
                  }
                  className="text-right"
                />
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground">
                {formatCurrency(item.quantity * item.unitPrice)}
              </TableCell>
              <TableCell className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(item.id)}
                  className="text-red-500 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Remove line {index + 1}</span>
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
