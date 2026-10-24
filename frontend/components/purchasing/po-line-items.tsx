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
  quantity: number;
  unitPrice: number;
}

export const newBlankLine = (): POLineItem => ({
  id: Math.random().toString(36).slice(2, 11),
  product: null,
  quantity: 1,
  unitPrice: 0,
});

/** Guarantees the list always ends with exactly one empty row to type into. */
export const withTrailingBlank = (items: POLineItem[]): POLineItem[] => {
  const last = items[items.length - 1];
  return !last || last.product ? [...items, newBlankLine()] : items;
};

interface ComboboxProps {
  token: string;
  vendorId: string;
  value: POProduct | null;
  excludeIds: string[];
  autoFocus?: boolean;
  onSelect: (product: POProduct) => void;
}

function ProductCombobox({ token, vendorId, value, excludeIds, autoFocus, onSelect }: ComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [results, setResults] = useState<POProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const requestId = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const disabled = !vendorId;

  // Type-ahead: refetch (vendor-scoped) as the user types. Opening the
  // dropdown with an empty query lists the vendor's products.
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

  // Close when clicking outside.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const visible = results.filter((p) => !excludeIds.includes(p.id));

  const choose = (p: POProduct) => {
    onSelect(p);
    setQuery("");
    setOpen(false);
    setEditing(false);
  };

  if (value && !editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setEditing(true);
          setOpen(true);
        }}
        className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
      >
        <span className="font-medium text-foreground">{value.name}</span>
        <span className="ml-2 text-xs text-muted-foreground">{value.sku}</span>
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        autoFocus={editing || autoFocus}
        disabled={disabled}
        value={query}
        placeholder={disabled ? "Select a vendor first" : "Type to search vendor products..."}
        className="pl-9"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
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
            choose(visible[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
            setEditing(false);
          }
        }}
      />
      {loading && (
        <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-64 w-full min-w-72 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
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

interface LineItemsProps {
  token: string;
  vendorId: string;
  items: POLineItem[];
  onChange: (items: POLineItem[]) => void;
}

export function POLineItemsTable({ token, vendorId, items, onChange }: LineItemsProps) {
  // After picking a product, focus jumps to the freshly added blank row so
  // several items can be entered in a row without touching the mouse.
  const [focusId, setFocusId] = useState<string | null>(null);
  const selectedIds = items.map((i) => i.product?.id).filter(Boolean) as string[];

  const update = (id: string, patch: Partial<POLineItem>) =>
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const select = (id: string, product: POProduct) => {
    const next = withTrailingBlank(
      items.map((i) =>
        i.id === id ? { ...i, product, unitPrice: Number(product.cost_price) || 0 } : i
      )
    );
    setFocusId(next[next.length - 1]!.id);
    onChange(next);
  };

  const remove = (id: string) => onChange(withTrailingBlank(items.filter((i) => i.id !== id)));

  return (
    <div className="overflow-visible">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead className="min-w-72">Product</TableHead>
            <TableHead className="w-28 text-right">Quantity</TableHead>
            <TableHead className="w-36 text-right">Unit Price</TableHead>
            <TableHead className="w-36 text-right">Total</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={item.id}>
              <TableCell className="text-muted-foreground">{index + 1}</TableCell>
              <TableCell>
                <ProductCombobox
                  token={token}
                  vendorId={vendorId}
                  value={item.product}
                  excludeIds={selectedIds.filter((id) => id !== item.product?.id)}
                  autoFocus={item.id === focusId}
                  onSelect={(p) => select(item.id, p)}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={1}
                  disabled={!item.product}
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
                  disabled={!item.product}
                  value={item.unitPrice}
                  onChange={(e) =>
                    update(item.id, { unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })
                  }
                  className="text-right"
                />
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground">
                {item.product ? formatCurrency(item.quantity * item.unitPrice) : "—"}
              </TableCell>
              <TableCell className="text-center">
                {item.product && (
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
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
