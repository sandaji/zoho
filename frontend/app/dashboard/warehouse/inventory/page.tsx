"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { frontendEnv } from "@/lib/env";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Package, Plus, Minus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTable, createColumnHelper, type SortingState } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { tableFeaturesConfig, type AppTableFeatures } from "@/lib/table/table-features";
import { warehouseService } from "@/lib/warehouse.service";

function getStockStatusColor(available: number, reorderLevel: number) {
  if (available === 0) return "text-red-600 bg-red-100";
  if (available <= reorderLevel) return "text-orange-600 bg-orange-100";
  return "text-green-600 bg-green-100";
}

interface AdjustmentData {
  warehouseId: string;
  productId: string;
  quantity: number;
  reason: string;
}

const inventoryColumnHelper = createColumnHelper<AppTableFeatures, any>();

// The per-row "Adjust" action opens a single shared Dialog whose open state
// lives in the parent (adjustmentDialog && adjustmentData.productId === item.productId).
// That's unchanged from the pre-migration version - it's just relocated into
// this column's cell renderer, closing over the same setters.
function buildInventoryColumns(
  adjustmentDialog: boolean,
  adjustmentData: AdjustmentData,
  setAdjustmentData: (data: AdjustmentData) => void,
  setAdjustmentDialog: (open: boolean) => void,
  handleAdjustment: () => void
) {
  return inventoryColumnHelper.columns([
    inventoryColumnHelper.accessor((row) => row.product?.name, {
      id: "product",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
      cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
      sortFn: "text",
    }),
    inventoryColumnHelper.accessor((row) => row.product?.sku, {
      id: "sku",
      header: ({ column }) => <DataTableColumnHeader column={column} title="SKU" />,
      cell: (ctx) => <span className="text-gray-600">{ctx.getValue()}</span>,
      sortFn: "text",
    }),
    inventoryColumnHelper.accessor((row) => row.warehouse?.name, {
      id: "warehouse",
      header: "Warehouse",
      enableSorting: false,
      cell: (ctx) => <span className="text-gray-600">{ctx.getValue()}</span>,
    }),
    inventoryColumnHelper.accessor((row) => row.quantity, {
      id: "quantity",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Quantity" className="w-full justify-end" />
      ),
      cell: (ctx) => <div className="text-right font-semibold">{ctx.getValue()}</div>,
      sortFn: "alphanumeric",
    }),
    inventoryColumnHelper.accessor((row) => row.available, {
      id: "available",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Available" className="w-full justify-end" />
      ),
      cell: (ctx) => <div className="text-right">{ctx.getValue()}</div>,
      sortFn: "alphanumeric",
    }),
    inventoryColumnHelper.accessor((row) => row.reserved, {
      id: "reserved",
      header: () => <div className="text-right">Reserved</div>,
      enableSorting: false,
      cell: (ctx) => <div className="text-right">{ctx.getValue()}</div>,
    }),
    inventoryColumnHelper.display({
      id: "status",
      header: () => <div className="text-center">Status</div>,
      enableSorting: false,
      cell: (ctx) => {
        const item = ctx.row.original;
        return (
          <div className="text-center">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getStockStatusColor(
                item.available,
                item.product?.reorder_level || 10
              )}`}
            >
              {item.status}
            </span>
          </div>
        );
      },
    }),
    inventoryColumnHelper.display({
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      enableSorting: false,
      cell: (ctx) => {
        const item = ctx.row.original;
        return (
          <div className="text-center">
            <Dialog
              open={adjustmentDialog && adjustmentData.productId === item.productId}
              onOpenChange={setAdjustmentDialog}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAdjustmentData({
                      warehouseId: item.warehouseId,
                      productId: item.productId,
                      quantity: 0,
                      reason: "",
                    });
                    setAdjustmentDialog(true);
                  }}
                >
                  Adjust
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adjust Stock</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Adjustment</label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setAdjustmentData({ ...adjustmentData, quantity: adjustmentData.quantity - 1 })
                        }
                      >
                        <Minus size={16} />
                      </Button>
                      <Input
                        type="number"
                        value={adjustmentData.quantity}
                        onChange={(e) =>
                          setAdjustmentData({
                            ...adjustmentData,
                            quantity: parseInt(e.target.value) || 0,
                          })
                        }
                        className="text-center"
                      />
                      <Button
                        variant="outline"
                        onClick={() =>
                          setAdjustmentData({ ...adjustmentData, quantity: adjustmentData.quantity + 1 })
                        }
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Positive: Add stock | Negative: Remove stock
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Reason *</label>
                    <Input
                      placeholder="e.g., Damaged goods, Returns, etc."
                      value={adjustmentData.reason}
                      onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAdjustment} className="w-full">
                    Confirm Adjustment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        );
      },
    }),
  ]);
}

export default function InventoryPage() {
  const { token } = useAuth();
  const [inventory, setInventory] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [adjustmentDialog, setAdjustmentDialog] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState<AdjustmentData>({
    warehouseId: "",
    productId: "",
    quantity: 0,
    reason: "",
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to load inventory");

      const data = await response.json();
      setInventory(data.data || []);

      // Load warehouses
      const warehouseRes = await fetch(`${frontendEnv.NEXT_PUBLIC_API_URL}/v1/warehouse`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (warehouseRes.ok) {
        const whData = await warehouseRes.json();
        setWarehouses(whData.data || []);
      }
    } catch (error) {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustment = async () => {
    try {
      if (!adjustmentData.reason.trim()) {
        toast.error("Please provide a reason for adjustment");
        return;
      }

      await warehouseService.adjustStock(adjustmentData, token!);
      toast.success("Stock adjusted successfully");
      setAdjustmentDialog(false);
      setAdjustmentData({ warehouseId: "", productId: "", quantity: 0, reason: "" });
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to adjust stock");
    }
  };

  const filteredInventory = inventory.filter((item) => {
    const matchesWarehouse = selectedWarehouse === "all" || item.warehouseId === selectedWarehouse;
    const matchesSearch = item.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product?.sku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesWarehouse && matchesSearch;
  });

  const inventoryColumns = useMemo(
    () =>
      buildInventoryColumns(
        adjustmentDialog,
        adjustmentData,
        setAdjustmentData,
        setAdjustmentDialog,
        handleAdjustment
      ),
    [adjustmentDialog, adjustmentData]
  );
  // Real client-side pagination (matches AdminTable / employees table): the
  // filtered set is already computed above, the table just paginates it.
  const inventoryTable = useTable({
    features: tableFeaturesConfig,
    data: filteredInventory,
    columns: inventoryColumns,
    onSortingChange: setSorting,
    state: { sorting },
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  });

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-gray-600">Manage stock levels across warehouses</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                {inventoryTable.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : <inventoryTable.FlexRender header={header} />}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {inventoryTable.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        <inventoryTable.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredInventory.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Package size={48} className="mx-auto mb-4 opacity-50" />
                <p>No inventory found</p>
              </div>
            )}
          </div>
          <DataTablePagination table={inventoryTable} totalRows={filteredInventory.length} />
        </CardContent>
      </Card>
    </div>
  );
}
