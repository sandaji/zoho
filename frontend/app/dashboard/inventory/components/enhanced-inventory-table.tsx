"use client";

import { useState } from "react";
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
import { MoreHorizontal, ArrowUpDown, Truck, TrendingUp, History } from "lucide-react";
import { StockHealthBadge } from "./stock-health-badge";
import { formatCurrency } from "@/lib/utils";

interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  currentStock: number;
  inTransit: number;
  minStock: number;
  maxStock: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  lastRestocked: string;
  status: "in_stock" | "low_stock" | "out_of_stock";
  branch: string;
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
  onSort?: (column: string) => void;
}

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
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    onSort?.(column);
  };

  const SortIcon = ({ column }: { column: string }) => (
    <ArrowUpDown
      className={`h-4 w-4 ml-1 inline transition-opacity ${
        sortColumn === column ? "opacity-100" : "opacity-40"
      }`}
    />
  );

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
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
            No items found
          </h3>
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
            <TableRow className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("itemCode")}>
                SKU <SortIcon column="itemCode" />
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>
                Item Name <SortIcon column="name" />
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("category")}>
                Category <SortIcon column="category" />
              </TableHead>
              <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort("currentStock")}>
                Stock on Hand <SortIcon column="currentStock" />
              </TableHead>
              <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort("inTransit")}>
                In-Transit <SortIcon column="inTransit" />
              </TableHead>
              <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort("costPrice")}>
                Unit Cost <SortIcon column="costPrice" />
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <TableCell className="font-mono font-semibold text-slate-900 dark:text-white text-sm">
                  {item.itemCode}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900 dark:text-white">
                      {item.name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {item.unit}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {item.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold text-slate-900 dark:text-white">
                  {item.currentStock.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {item.inTransit > 0 ? (
                    <div className="flex items-center justify-end gap-1">
                      <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {item.inTransit.toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium text-slate-900 dark:text-white">
                  {formatCurrency(item.costPrice)}
                </TableCell>
                <TableCell>
                  <StockHealthBadge
                    status={(item.status === "in_stock" ? "healthy" : item.status) as "healthy" | "low_stock" | "out_of_stock"}
                    currentStock={item.currentStock}
                    size="sm"
                  />
                </TableCell>
                <TableCell className="text-right">
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
                      <DropdownMenuItem
                        onClick={() => onAdjustStock?.(item.id)}
                        className="cursor-pointer"
                      >
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
                      <DropdownMenuItem
                        onClick={() => onViewHistory?.(item.id)}
                        className="cursor-pointer"
                      >
                        <History className="h-4 w-4 mr-2" />
                        <span>View History</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
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
                onClick={() => onPageChange?.(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
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
