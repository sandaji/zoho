"use client";

import { useInventory } from "@/hooks/use-inventory";
import { 
  Plus, 
  Search, 
  Download, 
  RefreshCw, 
  AlertCircle,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InventoryTable } from "../inventory/components/inventory-table";
import { AddProductDialog } from "../inventory/components/add-product-dialog";
import { useState } from "react";

export default function ProductsPage() {
  const {
    products,
    pagination,
    isLoading,
    error,
    filters,
    categories,
    setSearch,
    setCategory,
    setSort,
    goToPage,
    refresh,
    exportData,
  } = useInventory();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Transform products for the table
  const transformedProducts = products.map((product) => ({
    id: product.id,
    itemCode: product.sku,
    name: product.name,
    category: product.category || "Uncategorized",
    currentStock: product.quantity,
    minStock: product.reorder_level,
    maxStock: product.reorder_quantity,
    unit: product.unit_of_measurement,
    costPrice: product.cost_price,
    sellingPrice: product.unit_price,
    status: (product.quantity <= product.reorder_level) 
      ? (product.quantity === 0 ? "out_of_stock" : "low_stock") 
      : "in_stock" as any,
    lastRestocked: product.updatedAt,
    branch: "Main Branch",
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="h-8 w-8 text-blue-600" />
            Product Catalogue
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage your master product data and specifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={refresh}
            disabled={isLoading}
            className="border-slate-300 dark:border-slate-600"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={exportData}
            className="border-slate-300 dark:border-slate-600"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search by name, SKU, or category..."
                value={filters.search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 border-slate-300 dark:border-slate-600"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filters.category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <Button variant="outline" className="border-slate-300 dark:border-slate-600">
                More Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <div className="space-y-4">
        <InventoryTable 
          items={transformedProducts} 
          isLoading={isLoading}
          pagination={pagination}
          onSort={setSort}
          onPageChange={goToPage}
          currentSort={{
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder
          }}
        />
      </div>

      {/* Add Product Dialog */}
      <AddProductDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onProductAdded={refresh}
      />
    </div>
  );
}
