// app/dashboard/inventory/components/low-stock-items.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, ShoppingCart } from "lucide-react";

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

interface LowStockItemsProps {
  items: InventoryItem[];
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case "low_stock":
      return "warning";
    case "out_of_stock":
      return "destructive";
    default:
      return "default";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "low_stock":
      return "Low Stock";
    case "out_of_stock":
      return "Out of Stock";
    default:
      return "In Stock";
  }
};

export function LowStockItems({ items }: LowStockItemsProps) {
  if (items.length === 0) {
    return (
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
        <CardHeader className="pb-4">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Stock Alerts
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              All items are adequately stocked
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No stock alerts at this time</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
      <CardHeader className="pb-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            Stock Alerts
            <Badge variant="destructive" className="ml-2">
              {items.length}
            </Badge>
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Items requiring immediate attention
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center border border-slate-200 dark:border-slate-600">
                    <Package className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {item.name}
                    </p>
                    <Badge
                      variant={getStatusVariant(item.status) as any}
                      className="text-xs"
                    >
                      {getStatusText(item.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {item.itemCode} • {item.category}
                  </p>
                  <div className="flex items-center space-x-3 mt-1">
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Stock: {item.currentStock} {item.unit}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-500">•</span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Min: {item.minStock}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                Reorder
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}