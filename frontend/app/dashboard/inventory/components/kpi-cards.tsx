"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, Truck, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { clsx } from "clsx";

interface KPICardsProps {
  totalItems: number;
  lowStockAlerts: number;
  pendingTransfers: number;
  totalInventoryValue: number;
}

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  variant?: "default" | "warning" | "alert";
}

function KPICard({
  title,
  value,
  icon,
  trend,
  variant = "default",
}: KPICardProps) {
  const variantStyles = {
    default: "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800",
    warning: "border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950",
    alert: "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950",
  };

  return (
    <Card className={clsx("overflow-hidden", variantStyles[variant])}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {title}
        </CardTitle>
        <div
          className={clsx(
            "h-8 w-8 rounded-lg flex items-center justify-center",
            variant === "default" && "bg-emerald-100 dark:bg-emerald-950",
            variant === "warning" && "bg-yellow-100 dark:bg-yellow-950",
            variant === "alert" && "bg-red-100 dark:bg-red-950"
          )}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">
          {value}
        </div>
        {trend && (
          <p
            className={clsx(
              "text-xs mt-1",
              trend.direction === "up"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            {trend.direction === "up" ? "↑" : "↓"} {trend.value}% from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function KPICards({
  totalItems,
  lowStockAlerts,
  pendingTransfers,
  totalInventoryValue,
}: KPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Total Items"
        value={totalItems.toLocaleString()}
        icon={<Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
      />
      <KPICard
        title="Low Stock Alerts"
        value={lowStockAlerts}
        icon={<AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />}
        variant={lowStockAlerts > 0 ? "warning" : "default"}
      />
      <KPICard
        title="Pending Transfers"
        value={pendingTransfers}
        icon={<Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      />
      <KPICard
        title="Total Inventory Value"
        value={formatCurrency(totalInventoryValue)}
        icon={<DollarSign className="h-5 w-5 text-slate-600 dark:text-slate-400" />}
      />
    </div>
  );
}
