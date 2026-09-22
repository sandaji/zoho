"use client";

import { useInventory } from "@/hooks/use-inventory";
import {
  Plus,
  Search,
  Download,
  Upload,
  RefreshCw,
  AlertCircle,
  Package,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InventoryTable } from "../inventory/components/inventory-table";
import { AddProductDialog } from "../inventory/components/add-product-dialog";
import { AdjustStockModal } from "../inventory/components/adjust-stock-modal";
import { CategoryManagementDialog } from "../inventory/components/category-management-dialog";
import { ImportProductsDialog } from "../inventory/components/import-products-dialog";
import { useState } from "react";

export default function ProductsPage() {
  const {
    products,
    pagination,
    isLoading,
    error,
    filters,
    categories,
    branches,
    setSearch,
    setCategory,
    setBranch,
    setSort,
    goToPage,
    refresh,
    exportData,
  } = useInventory();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [stockAdjustProduct, setStockAdjustProduct] = useState<any | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Get the active branch inventory data
  const getBranchInventoryData = (product: any) => {
    if (filters.branchId && product.branchInventory) {
      // Branch selected — use that branch's inventory
      const branchInv = product.branchInventory.find((bi: any) => bi.branchId === filters.branchId);
      if (branchInv) {
        return { ...branchInv, branch: branchInv.branch?.name || "Unassigned" };
      }
      return { quantity: 0, reorder_level: 10, reorder_quantity: 20, branch: "No Inventory" };
    }

    // No branch selected — aggregate across all branch inventories
    if (product.branchInventory && product.branchInventory.length > 0) {
      const totalQty = product.branchInventory.reduce(
        (sum: number, bi: any) => sum + (bi.quantity || 0),
        0
      );
      const maxReorder = Math.max(
        ...product.branchInventory.map((bi: any) => bi.reorder_level || 10)
      );
      const maxReorderQty = Math.max(
        ...product.branchInventory.map((bi: any) => bi.reorder_quantity || 20)
      );
      return {
        quantity: totalQty,
        reorder_level: maxReorder,
        reorder_quantity: maxReorderQty,
        branch: "All Branches",
      };
    }

    return { quantity: 0, reorder_level: 10, reorder_quantity: 20, branch: "Unassigned" };
  };

  // Transform products for the table
  const transformedProducts = products.map((product) => {
    const branchInv = getBranchInventoryData(product);
    return {
      id: product.id,
      itemCode: product.sku,
      name: product.name,
      category: product.category || "Uncategorized",
      currentStock: branchInv.quantity,
      minStock: branchInv.reorder_level,
      maxStock: branchInv.reorder_quantity,
      unit: product.unit_of_measurement,
      costPrice: product.cost_price,
      sellingPrice: product.unit_price,
      status:
        branchInv.quantity <= branchInv.reorder_level
          ? branchInv.quantity === 0
            ? "out_of_stock"
            : "low_stock"
          : ("in_stock" as any),
      lastRestocked: product.updatedAt,
      branch: branchInv.branch,
      _raw: product,
    };
  });

  return (
    <div className="min-h-screen space-y-6 bg-background p-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
            <div className="rounded-lg bg-primary/10 p-2">
              <Package className="h-8 w-8 text-primary" />
            </div>
            Product Catalogue
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Manage your master product data, pricing, and inventory levels.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={refresh}
            disabled={isLoading}
            className="border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={exportData}
            className="border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsImportDialogOpen(true)}
            className="border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsCategoryDialogOpen(true)}
            className="border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Manage Categories
          </Button>
          <Button className="shadow-sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          variant="destructive"
          className="border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30"
        >
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-700 dark:text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {/* Search and Filters Card */}
      <Card className="border-border/50 bg-card shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Branch Select */}
            <select
              value={filters.branchId}
              onChange={(e) => setBranch(e.target.value)}
              className="cursor-pointer rounded-md border border-border/70 bg-background px-4 py-2 font-medium text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:border-primary/50"
            >
              <option value="">Select Branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="flex-1 relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
              <Input
                placeholder="Search by name, SKU, or category..."
                value={filters.search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-border/70 bg-background pl-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
              />
            </div>

            {/* Category Select */}
            <select
              value={filters.category}
              onChange={(e) => setCategory(e.target.value)}
              className="cursor-pointer rounded-md border border-border/70 bg-background px-4 py-2 text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:border-primary/50"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* More Filters Button */}
            <Button
              variant="outline"
              className="border-border/70 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table Section */}
      <Card className="overflow-hidden border-border/50 bg-card shadow-sm">
        <InventoryTable
          items={transformedProducts}
          isLoading={isLoading}
          pagination={pagination}
          onSort={setSort}
          onPageChange={goToPage}
          onEdit={(item) => setEditingProduct((item as any)._raw)}
          onAdjustStock={(item) => setStockAdjustProduct(item)}
          currentSort={{
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder,
          }}
        />
      </Card>

      {/* Add Product Dialog */}
      <AddProductDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onProductAdded={refresh}
      />

      {/* Edit Product Dialog */}
      <AddProductDialog
        open={!!editingProduct}
        onOpenChange={(open) => !open && setEditingProduct(null)}
        onProductAdded={refresh}
        editProduct={editingProduct}
      />

      {/* Adjust Stock Modal */}
      <AdjustStockModal
        open={!!stockAdjustProduct}
        onOpenChange={(open) => !open && setStockAdjustProduct(null)}
        productId={stockAdjustProduct?.id}
        productName={stockAdjustProduct?.name}
        currentStock={stockAdjustProduct?.currentStock}
        productCostPrice={stockAdjustProduct?.costPrice}
        onAdjustComplete={refresh}
      />

      {/* Category Management Dialog */}
      <CategoryManagementDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        onCategoryAdded={refresh}
      />

      {/* Import Products Dialog */}
      <ImportProductsDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={refresh}
      />
    </div>
  );
}
