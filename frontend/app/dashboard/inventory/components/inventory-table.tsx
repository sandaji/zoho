// app/dashboard/inventory/components/inventory-table.tsx
"use client";
   
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Package, 
  Edit, 
  MoreHorizontal,
  ArrowUpDown,
  Filter
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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
  currentSort?: {
    sortBy: string;
    sortOrder: "asc" | "desc";
  };
}

// No longer using internal SortField/SortDirection

const getStatusVariant = (status: string) => {
  switch (status) {
    case "in_stock":
      return "default";
    case "low_stock":
      return "secondary"; // Changed from "warning" to "secondary"
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

export function InventoryTable({ 
  items, 
  isLoading, 
  pagination, 
  onSort, 
  onPageChange,
  currentSort
}: InventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSort = (field: string) => {
    onSort?.(field);
  };

  const sortedItems = items; // Already sorted on server

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      onClick={() => handleSort(field)}
      className={`p-0 h-auto font-semibold hover:bg-transparent ${currentSort?.sortBy === field ? "text-blue-600" : ""}`}
    >
      {children}
      <ArrowUpDown className={`ml-2 h-3 w-3 ${currentSort?.sortBy === field ? "opacity-100" : "opacity-50"}`} />
    </Button>
  );

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
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    <SortableHeader field="name">Item</SortableHeader>
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    Category
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    <SortableHeader field="quantity">Stock Level</SortableHeader>
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    <SortableHeader field="price">Price</SortableHeader>
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    Branch
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {sortedItems.map((item) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                          <Package className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <p 
                            className="text-sm font-medium text-slate-900 dark:text-white truncate cursor-pointer hover:underline hover:text-blue-600"
                            onClick={() => window.location.href = `/dashboard/inventory/products/${item.id}`}
                          >
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            {item.itemCode}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-slate-600 dark:text-slate-400">
                              {item.currentStock} {item.unit}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-500">
                              Min: {item.minStock}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${getStockColor(item.currentStock, item.minStock, item.maxStock)}`}
                              style={{ 
                                width: `${Math.min((item.currentStock / item.maxStock) * 100, 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <p className="text-slate-900 dark:text-white font-medium">
                          {formatCurrency(item.sellingPrice)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Cost: {formatCurrency(item.costPrice)}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getStatusVariant(item.status)} className="text-xs">
                        {getStatusText(item.status)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {item.branch}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} items
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={pagination.page <= 1 || isLoading} 
                className="border-slate-300 dark:border-slate-600"
                onClick={() => onPageChange?.(pagination.page - 1)}
              >
                Previous
              </Button>
              <div className="text-sm font-medium">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={pagination.page >= pagination.totalPages || isLoading}
                className="border-slate-300 dark:border-slate-600"
                onClick={() => onPageChange?.(pagination.page + 1)}
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