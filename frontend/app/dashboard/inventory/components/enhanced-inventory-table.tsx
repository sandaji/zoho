"use client";

import * as React from "react";
import {
  useTable,
  createColumnHelper,
  type SortingState,
  type PaginationState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Truck, TrendingUp, History } from "lucide-react";
import { StockHealthBadge } from "./stock-health-badge";
import { formatCurrency, cn } from "@/lib/utils";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { tableFeaturesConfig, type AppTableFeatures } from "@/lib/table/table-features";

interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  currentStock: number;
  inTransit: number;
  minStock?: number;
  maxStock?: number;
  unit?: string;
  costPrice?: number;
  sellingPrice?: number;
  lastRestocked?: string;
  status?: "in_stock" | "low_stock" | "out_of_stock";
  branch?: string;
}

interface EnhancedInventoryTableProps {
  items: InventoryItem[];
  isLoading?: boolean;
  onAdjustStock?: (itemId: string) => void;
  onInitiateTransfer?: (itemId: string, itemName: string) => void;
  onViewHistory?: (itemId: string) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onSort?: (column: string, direction?: "asc" | "desc") => void;
}

const columnHelper = createColumnHelper<AppTableFeatures, InventoryItem>();

function buildColumns(
  onAdjustStock?: (itemId: string) => void,
  onInitiateTransfer?: (itemId: string, itemName: string) => void,
  onViewHistory?: (itemId: string) => void
) {
  return columnHelper.columns([
    columnHelper.accessor((row) => row.itemCode, {
      id: "itemCode",
      header: ({ column }) => <DataTableColumnHeader column={column} title="SKU" />,
      cell: (ctx) => (
        <span className="font-mono font-semibold text-slate-900 dark:text-white text-sm">
          {ctx.getValue()}
        </span>
      ),
      sortFn: "text",
    }),
    columnHelper.accessor((row) => row.name, {
      id: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Item Name" />,
      cell: (ctx) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900 dark:text-white">{ctx.getValue()}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {ctx.row.original.unit}
          </span>
        </div>
      ),
      sortFn: "text",
    }),
    columnHelper.accessor((row) => row.category, {
      id: "category",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      cell: (ctx) => (
        <Badge variant="outline" className="text-xs">
          {ctx.getValue()}
        </Badge>
      ),
      sortFn: "text",
    }),
    columnHelper.accessor((row) => row.currentStock, {
      id: "currentStock",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Stock on Hand" className="w-full justify-end" />
      ),
      cell: (ctx) => (
        <div className="text-right font-semibold text-slate-900 dark:text-white">
          {ctx.getValue().toLocaleString()}
        </div>
      ),
      sortFn: "alphanumeric",
    }),
    columnHelper.accessor((row) => row.inTransit, {
      id: "inTransit",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="In-Transit" className="w-full justify-end" />
      ),
      cell: (ctx) => {
        const inTransit = ctx.getValue();
        return (
          <div className="text-right">
            {inTransit > 0 ? (
              <div className="flex items-center justify-end gap-1">
                <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {inTransit.toLocaleString()}
                </span>
              </div>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </div>
        );
      },
      sortFn: "alphanumeric",
    }),
    columnHelper.accessor((row) => row.costPrice, {
      id: "costPrice",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Unit Cost" className="w-full justify-end" />
      ),
      cell: (ctx) => (
        <div className="text-right font-medium text-slate-900 dark:text-white">
          {formatCurrency(ctx.getValue())}
        </div>
      ),
      sortFn: "alphanumeric",
    }),
    columnHelper.display({
      id: "status",
      header: "Status",
      enableSorting: false,
      cell: (ctx) => {
        const item = ctx.row.original;
        return (
          <StockHealthBadge
            status={(item.status === "in_stock" ? "healthy" : item.status) as "healthy" | "low_stock" | "out_of_stock"}
            currentStock={item.currentStock}
            size="sm"
          />
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      enableSorting: false,
      cell: (ctx) => {
        const item = ctx.row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAdjustStock?.(item.id)} className="cursor-pointer">
                  <span>Adjust Stock</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onInitiateTransfer?.(item.id, item.name)}
                  className="cursor-pointer"
                >
                  <Truck className="h-4 w-4 mr-2" />
                  <span>Initiate Transfer</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onViewHistory?.(item.id)} className="cursor-pointer">
                  <History className="h-4 w-4 mr-2" />
                  <span>View History</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    }),
  ]);
}

const RIGHT_ALIGNED_COLUMNS = new Set(["currentStock", "inTransit", "costPrice", "actions"]);

export function EnhancedInventoryTable({
  items,
  isLoading,
  onAdjustStock,
  onInitiateTransfer,
  onViewHistory,
  pagination,
  onPageChange,
  onSort,
}: EnhancedInventoryTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns = React.useMemo(
    () => buildColumns(onAdjustStock, onInitiateTransfer, onViewHistory),
    [onAdjustStock, onInitiateTransfer, onViewHistory]
  );

  // `items` and `pagination` are already server-paginated/sorted (see
  // useInventory's fetchProducts), so this table is a pure view: sorting and
  // pagination state changes call back out to the parent instead of the
  // table re-slicing/re-sorting `items` itself.
  const currentPagination: PaginationState = React.useMemo(
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
      setSorting((old) => {
        const next = typeof updater === "function" ? updater(old) : updater;
        const [first] = next;
        if (first) onSort?.(first.id, first.desc ? "desc" : "asc");
        return next;
      });
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(currentPagination) : updater;
      if (next.pageIndex !== currentPagination.pageIndex) {
        onPageChange?.(next.pageIndex + 1);
      }
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <div className="animate-spin inline-block">
              <TrendingUp className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-600 dark:text-slate-400">Loading inventory...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <TrendingUp className="h-8 w-8 text-slate-400 mb-3" />
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">No items found</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Try adjusting your filters to see inventory items.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle>Inventory Items</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(RIGHT_ALIGNED_COLUMNS.has(header.column.id) && "text-right")}
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
                className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
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

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total items)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
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
