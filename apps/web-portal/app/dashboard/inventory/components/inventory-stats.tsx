// app/dashboard/inventory/components/inventory-stats.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface InventoryStatsProps {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
}

const statConfigs = [
  {
    key: "total",
    title: "Total Items",
    value: (props: InventoryStatsProps) => props.totalItems.toString(),
    description: "Active inventory items",
    icon: Package,
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "lowStock",
    title: "Low Stock",
    value: (props: InventoryStatsProps) => props.lowStockItems.toString(),
    description: "Items below minimum stock",
    icon: AlertTriangle,
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "outOfStock",
    title: "Out of Stock",
    value: (props: InventoryStatsProps) => props.outOfStockItems.toString(),
    description: "Items needing restock",
    icon: AlertTriangle,
    iconBg: "bg-rose-100 dark:bg-rose-900/30",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  {
    key: "value",
    title: "Total Value",
    value: (props: InventoryStatsProps) => formatCurrency(props.totalValue),
    description: "Current inventory value",
    icon: DollarSign,
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
];

export function InventoryStats(props: InventoryStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statConfigs.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card 
            key={stat.key}
            className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {stat.title}
              </CardTitle>
              <div className={`w-8 h-8 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {stat.value(props)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}