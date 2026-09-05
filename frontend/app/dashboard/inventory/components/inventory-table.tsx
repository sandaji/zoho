// app/dashboard/inventory/components/inventory-table.tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Search,
  Package,
  Edit,
  MoreHorizontal,
  Filter,
  SlidersHorizontal,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { useTable, createColumnHelper, type SortingState } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { tableFeaturesConfig, type AppTableFeatures } from "@/lib/table/table-features";

interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  lastRestocked: string;
  status: "in_stock" | "low_stock" | "out_of_stock";
  branch: string;
}

interface InventoryTableProps {
  items: InventoryItem[];
  isLoading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onSort?: (field: string) => void;
  onPageChange?: (page: number) => void;
  onEdit?: (item: InventoryItem) => void;
  onAdjustStock?: (item: InventoryItem) => void;
  currentSort?: {
    sortBy: string;
    sortOrder: "asc" | "desc";
  };
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case "in_stock":
      return "default";
    case "low_stock":
      return "secondary";
    case "out_of_stock":
      return "destructive";
    default:
      return "secondary";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "in_stock":
      return "In Stock";
    case "low_stock":
      return "Low Stock";
    case "out_of_stock":
      return "Out of Stock";
    default:
      return "Unknown";
  }
};

const getStockColor = (current: number, min: number, max: number) => {
  const percentage = (current / max) * 100;
  if (current === 0) return "bg-rose-500";
  if (current <= min) return "bg-amber-500";
  if (percentage <= 30) return "bg-amber-500";
  if (percentage <= 60) return "bg-blue-500";
  return "bg-emerald-500";
};

const columnHelper = createColumnHelper<AppTableFeatures, InventoryItem>();

function buildColumns(
  onEdit?: (item: InventoryItem) => void,
  onAdjustStock?: (item: InventoryItem) => void
) {
  return columnHelper.columns([
    // Column ids match the `field` names the server-side sort API expects
    // ("name" / "quantity" / "price"), since sorting here is fully manual —
    // the id is passed straight through to onSort().
    columnHelper.accessor((row) => row.name, {
      id: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Item" />,
      cell: (ctx) => {
        const item = ctx.row.original;
        return (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Package className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="min-w-0">
              <Link
                href={`/dashboard/inventory/products/${item.id}`}
                className="text-sm font-medium text-slate-900 dark:text-white truncate hover:underline hover:text-blue-600 block"
              >
                {item.name}
              </Link>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{item.itemCode}</p>
            </div>
          </div>
        );
      },
      sortFn: "text",
    }),
    columnHelper.accessor((row) => row.category, {
      id: "category",
      header: "Category",
      enableSorting: false,
      cell: (ctx) => <span className="text-sm text-slate-600 dark:text-slate-400">{ctx.getValue()}</span>,
    }),
    columnHelper.accessor((row) => row.currentStock, {
      id: "quantity",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Stock Level" />,
      cell: (ctx) => {
        const item = ctx.row.original;
        return (
          <div className="flex items-center space-x-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600 dark:text-slate-400">
                  {item.currentStock} {item.unit}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-500">Min: {item.minStock}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getStockColor(item.currentStock, item.minStock, item.maxStock)}`}
                  style={{ width: `${Math.min((item.currentStock / item.maxStock) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        );
      },
      sortFn: "alphanumeric",
    }),
    columnHelper.accessor((row) => row.sellingPrice, {
      id: "price",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Price" />,
      cell: (ctx) => {
        const item = ctx.row.original;
        return (
          <div className="text-sm">
            <p className="text-slate-900 dark:text-white font-medium">{formatCurrency(item.sellingPrice)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Cost: {formatCurrency(item.costPrice)}</p>
          </div>
        );
      },
      sortFn: "alphanumeric",
    }),
    columnHelper.accessor((row) => row.status, {
      id: "status",
      header: "Status",
      enableSorting: false,
      cell: (ctx) => (
        <Badge variant={getStatusVariant(ctx.getValue())} className="text-xs">
          {getStatusText(ctx.getValue())}
        </Badge>
      ),
    }),
    columnHelper.accessor((row) => row.branch, {
      id: "branch",
      header: "Branch",
      enableSorting: false,
      cell: (ctx) => <span className="text-sm text-slate-600 dark:text-slate-400">{ctx.getValue()}</span>,
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: (ctx) => {
        const item = ctx.row.original;
        return (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              onClick={() => onEdit?.(item)}
              title="Edit product"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              onClick={() => onAdjustStock?.(item)}
              title="Adjust stock"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    }),
  ]);
}

export function InventoryTable({
  items,
  isLoading,
  pagination,
  onSort,
  onPageChange,
  onEdit,
  onAdjustStock,
  currentSort,
}: InventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const columns = useMemo(() => buildColumns(onEdit, onAdjustStock), [onEdit, onAdjustStock]);

  // Sorting and pagination are both server-driven (see useInventory's
  // fetchProducts / setSort), so this table is a pure view: sorting is
  // derived straight from the currentSort prop (fully controlled, no local
  // state needed since the parent already owns the true sort state), and
  // state changes call back out to the parent instead of the table
  // re-slicing/re-sorting `items` itself.
  const sorting: SortingState = useMemo(
    () => (currentSort ? [{ id: currentSort.sortBy, desc: currentSort.sortOrder === "desc" }] : []),
    [currentSort]
  );

  const currentPagination = useMemo(
    () => ({
      pageIndex: pagination ? pagination.page - 1 : 0,
      pageSize: pagination?.limit || items.length || 10,
    }),
    [pagination, items.length]
  );

  const table = useTable({
    features: tableFeaturesConfig,
    data: items,
    columns,
    manualSorting: true,
    manualPagination: true,
    pageCount: pagination?.totalPages ?? -1,
    state: { sorting, pagination: currentPagination },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const [first] = next;
      if (first) onSort?.(first.id);
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(currentPagination) : updater;
      if (next.pageIndex !== currentPagination.pageIndex) {
        onPageChange?.(next.pageIndex + 1);
      }
    },
  });

  if (items.length === 0) {
    return (
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
        <CardHeader className="pb-4">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              Inventory Items
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              No items found matching your criteria
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No items found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              Inventory Items
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              {pagination?.total || items.length} items in inventory
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-48 border-slate-300 dark:border-slate-600"
              />
            </div>
            <Button variant="outline" size="sm" className="border-slate-300 dark:border-slate-600">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-slate-200 dark:border-slate-700">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="text-slate-700 dark:text-slate-300 font-semibold"
                      >
                        {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} items
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!table.getCanPreviousPage() || isLoading}
                className="border-slate-300 dark:border-slate-600"
                onClick={() => table.previousPage()}
              >
                Previous
              </Button>
              <div className="text-sm font-medium">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!table.getCanNextPage() || isLoading}
                className="border-slate-300 dark:border-slate-600"
                onClick={() => table.nextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
