// app/dashboard/inventory/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
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
import { AdjustStockModal } from "./components/adjust-stock-modal";
import { useInventory } from "@/hooks/use-inventory";
import { useAuth } from "@/lib/auth-context";
import { warehouseService } from "@/lib/warehouse.service";
import { toast } from "sonner";

interface SelectedItemForTransfer {
  id: string;
  name: string;
  availableStock: number;
}

interface SelectedItemForAdjustment {
  id: string;
  name: string;
  currentStock: number;
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

  const { token } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedItemForTransfer, setSelectedItemForTransfer] =
    useState<SelectedItemForTransfer | null>(null);
  const [adjustStockModalOpen, setAdjustStockModalOpen] = useState(false);
  const [selectedItemForAdjustment, setSelectedItemForAdjustment] =
    useState<SelectedItemForAdjustment | null>(null);
  const [warehouses, setWarehouses] = useState<
    Array<{ id: string; name: string; code?: string; location?: string }>
  >([]);
  const [inventoryRows, setInventoryRows] = useState<
    Array<{ productId: string; warehouseId: string; available: number }>
  >([]);

  // Transform products for components that expect the enhanced interface
  const transformedProducts = products.map((product) => {
    const quantity = product.branchInventory?.reduce((acc, b) => acc + (b.quantity || 0), 0) || 0;
    const reorderLevel =
      product.branchInventory?.reduce((acc, b) => acc + (b.reorder_level || 0), 0) || 0;
    const inTransit = product.branchInventory?.reduce((acc, b) => acc + (b.reserved || 0), 0) || 0;

    return {
      id: product.id,
      itemCode: product.sku,
      name: product.name,
      category: product.category || "Uncategorized",
      currentStock: quantity,
      inTransit,
      maxStock: reorderLevel * 10,
      unit: product.unit_of_measurement,
      costPrice: product.cost_price,
      sellingPrice: product.unit_price,
      lastRestocked: product.updatedAt,
      status:
        quantity === 0
          ? ("out_of_stock" as const)
          : quantity <= reorderLevel
            ? ("low_stock" as const)
            : ("in_stock" as const),
      branch: "All Branches",
    };
  });

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const loadTransferContext = useCallback(async () => {
    if (!token) return;

    let warehouseData: Array<{ id: string; name: string; code?: string; location?: string }> = [];

    try {
      const warehouseResponse = await warehouseService.getWarehouses(token);
      warehouseData = Array.isArray(warehouseResponse?.data)
        ? warehouseResponse.data
        : Array.isArray((warehouseResponse as any)?.data?.warehouses)
          ? (warehouseResponse as any).data.warehouses
          : [];
    } catch (err) {
      console.warn("Falling back to branch list for transfer warehouses", err);
      warehouseData = (branches || []).map((branch) => ({
        id: branch.id,
        name: branch.name,
        code: branch.code,
        location: "",
      }));
    }

    setWarehouses(warehouseData);

    const inventoryData = (products || []).flatMap((product) => {
      if (!Array.isArray(product.branchInventory) || product.branchInventory.length === 0) {
        return [];
      }

      return product.branchInventory.map((entry) => ({
        productId: product.id,
        warehouseId: entry.branchId || entry.branch?.id || "",
        available: Number(entry.available ?? entry.quantity ?? 0),
      }));
    });

    setInventoryRows(inventoryData);
  }, [branches, products, token]);

  useEffect(() => {
    void loadTransferContext();
  }, [loadTransferContext]);

  const handleRefresh = async () => {
    await refresh();
    await loadTransferContext();
    toast.success("Inventory refreshed successfully");
  };

  const handleExport = () => {
    exportData();
  };

  const handleInitiateTransfer = (itemId: string, itemName: string) => {
    const quantity = inventoryRows
      .filter((row) => row.productId === itemId)
      .reduce((sum, row) => sum + row.available, 0);

    setSelectedItemForTransfer({
      id: itemId,
      name: itemName,
      availableStock: quantity,
    });
    setTransferModalOpen(true);
  };

  const handleAdjustStock = (itemId: string) => {
    const item = products.find((p) => p.id === itemId);
    const quantity = item?.branchInventory?.reduce((acc, b) => acc + (b.quantity || 0), 0) || 0;
    setSelectedItemForAdjustment({
      id: itemId,
      name: item?.name ?? "",
      currentStock: quantity,
    });
    setAdjustStockModalOpen(true);
  };

  const inventoryAvailabilityMap = inventoryRows.reduce<Record<string, number>>((acc, row) => {
    const key = `${row.productId}:${row.warehouseId}`;
    acc[key] = (acc[key] || 0) + row.available;
    return acc;
  }, {});

  const handleTransferSubmit = async (data: {
    itemId: string;
    sourceBranchId: string;
    destinationBranchId: string;
    quantity: number;
    notes: string;
  }) => {
    if (!token) {
      toast.error("You need to be signed in to create a transfer");
      return;
    }

    try {
      await warehouseService.requestTransfer(
        {
          sourceWarehouseId: data.sourceBranchId,
          destinationWarehouseId: data.destinationBranchId,
          items: [{ productId: data.itemId, requested_qty: data.quantity }],
          notes: data.notes || undefined,
        },
        token
      );

      toast.success("Stock transfer request created successfully");
      setTransferModalOpen(false);
      await refresh();
      await loadTransferContext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create stock transfer");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header Section */}
      <div className="space-y-6">
        {/* Title + Branch Selector Row */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground">
              Inventory Dashboard
            </h1>
            <p className="text-muted-foreground">
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
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Truck className="h-4 w-4 mr-2" />
            New Transfer
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            disabled={isLoading || products.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="secondary"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
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
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items by name or SKU..."
                value={filters.search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filters.category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
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
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading inventory data...</p>
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
            onAdjustStock={handleAdjustStock}
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
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No products found
              </h3>
              <p className="text-muted-foreground mb-4">
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

      {/* Adjust Stock Modal */}
      <AdjustStockModal
        open={adjustStockModalOpen}
        onOpenChange={setAdjustStockModalOpen}
        productId={selectedItemForAdjustment?.id}
        productName={selectedItemForAdjustment?.name}
        currentStock={selectedItemForAdjustment?.currentStock}
        onAdjustComplete={refresh}
      />

      {/* Stock Transfer Modal */}
      <StockTransferModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        itemId={selectedItemForTransfer?.id}
        availableStock={selectedItemForTransfer?.availableStock}
        warehouses={warehouses}
        inventoryAvailability={inventoryAvailabilityMap}
        items={products.map((p) => ({ id: p.id, name: p.name, sku: p.sku }))}
        onSubmit={handleTransferSubmit}
      />
    </div>
  );
}
