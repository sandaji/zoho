// app/dashboard/inventory/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, RefreshCw, AlertCircle, Truck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StockLevelChart } from "./components/stock-level-chart";
import { CategoryDistribution } from "./components/category-distribution";
import { LowStockItems } from "./components/low-stock-items";
import { QuickActions } from "./components/quick-actions";
import { BranchSelector } from "./components/branch-selector";
import { KPICards } from "./components/kpi-cards";
import { EnhancedInventoryTable } from "./components/enhanced-inventory-table";
import { StockTransferModal } from "./components/stock-transfer-modal";
import { useInventory } from "@/hooks/use-inventory";
import { toast } from "sonner";

interface SelectedItemForTransfer {
  id: string;
  name: string;
  availableStock: number;
}

export default function InventoryDashboard() {
  const {
    // Data
    products,
    stats,
    categories,
    branches,
    pagination,

    // State
    isLoading,
    error,

    // Filters
    filters,
    setSearch,
    setCategory,

    // Actions
    refresh,
    exportData,
    goToPage,
    setSort,
  } = useInventory();

  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedItemForTransfer, setSelectedItemForTransfer] = useState<SelectedItemForTransfer | null>(null);

  // Transform products for components that expect the enhanced interface
  const transformedProducts = products.map((product) => ({
    id: product.id,
    itemCode: product.sku,
    name: product.name,
    category: product.category || "Uncategorized",
    currentStock: product.quantity,
    inTransit: Math.floor(Math.random() * 5), // Mock in-transit data - replace with real data
    minStock: product.reorder_level,
    maxStock: product.reorder_level * 10,
    unit: product.unit_of_measurement,
    costPrice: product.cost_price,
    sellingPrice: product.unit_price,
    lastRestocked: product.updatedAt,
    status:
      product.quantity === 0
        ? ("out_of_stock" as const)
        : product.quantity <= product.reorder_level
        ? ("low_stock" as const)
        : ("in_stock" as const),
    branch: "All Branches",
  }));

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleRefresh = async () => {
    await refresh();
    toast.success("Inventory refreshed successfully");
  };

  const handleExport = () => {
    exportData();
  };

  const handleInitiateTransfer = (itemId: string, itemName: string) => {
    const item = products.find((p) => p.id === itemId);
    setSelectedItemForTransfer({
      id: itemId,
      name: itemName,
      availableStock: item?.quantity || 0,
    });
    setTransferModalOpen(true);
  };

  const handleTransferSubmit = async (data: {
    itemId: string;
    sourceBranchId: string;
    destinationBranchId: string;
    quantity: number;
    notes: string;
  }) => {
    // TODO: Call API to create transfer
    console.log("Transfer data:", data);
    toast.success("Stock transfer initiated successfully");
    setTransferModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 space-y-6">
      {/* Header Section */}
      <div className="space-y-6">
        {/* Title + Branch Selector Row */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Inventory Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Manage and monitor your inventory across all branches
            </p>
          </div>

          {/* Branch Selector */}
          <BranchSelector
            branches={branches || []}
            selectedBranch={selectedBranch}
            onBranchChange={setSelectedBranch}
            isLoading={isLoading}
          />
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setTransferModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white"
          >
            <Truck className="h-4 w-4 mr-2" />
            New Transfer
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            className="border-slate-300 dark:border-slate-600"
            disabled={isLoading || products.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
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
                placeholder="Search items by name or SKU..."
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
                disabled={isLoading}
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && products.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-slate-400" />
            <p className="text-slate-600 dark:text-slate-400">
              Loading inventory data...
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <KPICards
            totalItems={stats.totalItems}
            lowStockAlerts={stats.lowStockCount}
            pendingTransfers={transformedProducts.reduce((sum, p) => sum + p.inTransit, 0)}
            totalInventoryValue={stats.totalValue}
          />

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StockLevelChart items={transformedProducts} />
            <CategoryDistribution items={transformedProducts} />
          </div>

          {/* Main Table Section */}
          <EnhancedInventoryTable
            items={transformedProducts}
            isLoading={isLoading}
            onInitiateTransfer={handleInitiateTransfer}
            onPageChange={goToPage}
            onSort={setSort}
            pagination={pagination}
          />

          {/* Bottom Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <LowStockItems items={transformedProducts.filter((p) => p.status !== "in_stock")} />
            </div>
            <div className="space-y-6">
              <QuickActions onProductAdded={refresh} />
            </div>
          </div>

          {/* Empty State */}
          {!isLoading && products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No products found
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {filters.search || filters.category !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by adding your first product"}
              </p>
              <Button
                onClick={() => {
                  setSearch("");
                  setCategory("all");
                }}
                variant="outline"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </>
      )}

      {/* Stock Transfer Modal */}
      <StockTransferModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        itemId={selectedItemForTransfer?.id}
        availableStock={selectedItemForTransfer?.availableStock}
        branches={branches || []}
        items={products.map((p) => ({ id: p.id, name: p.name, sku: p.sku }))}
        onSubmit={handleTransferSubmit}
      />
    </div>
  );
}
