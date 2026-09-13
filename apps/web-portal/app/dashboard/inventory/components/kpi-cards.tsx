"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, Truck, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
  trend?: { value: number; direction: "up" | "down" };
  variant?: "default" | "warning" | "alert";
}

function KPICard({ title, value, icon, trend, variant = "default" }: KPICardProps) {
  const cardClass = {
    default: "",
    warning: "border-warning-border bg-warning-muted",
    alert:   "border-destructive/30 bg-destructive/10",
  }[variant];

  const iconWrapClass = {
    default: "bg-primary/10",
    warning: "bg-warning/10",
    alert:   "bg-destructive/10",
  }[variant];

  return (
    <Card className={cn("overflow-hidden card-hover", cardClass)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground">{title}</CardTitle>
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", iconWrapClass)}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {trend && (
          <p className={cn("text-xs mt-1", trend.direction === "up" ? "text-success" : "text-destructive")}>
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
        icon={<Package className="h-5 w-5 text-primary" />}
      />
      <KPICard
        title="Low Stock Alerts"
        value={lowStockAlerts}
        icon={<AlertTriangle className="h-5 w-5 text-warning" />}
        variant={lowStockAlerts > 0 ? "warning" : "default"}
      />
      <KPICard
        title="Pending Transfers"
        value={pendingTransfers}
        icon={<Truck className="h-5 w-5 text-info" />}
      />
      <KPICard
        title="Total Inventory Value"
        value={formatCurrency(totalInventoryValue)}
        icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
      />
    </div>
  );
}
