"use client";

import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";

interface StockHealthBadgeProps {
  status: "healthy" | "low_stock" | "out_of_stock";
  currentStock: number;
  size?: "sm" | "md" | "lg";
}

export function StockHealthBadge({
  status,
  currentStock,
  size = "md",
}: StockHealthBadgeProps) {
  const statusConfig = {
    healthy: {
      label: "In Stock",
      icon: CheckCircle2,
      textColor: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950",
      borderColor: "border-emerald-200 dark:border-emerald-800",
    },
    low_stock: {
      label: "Low Stock",
      icon: AlertTriangle,
      textColor: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-950",
      borderColor: "border-yellow-200 dark:border-yellow-800",
    },
    out_of_stock: {
      label: "Out of Stock",
      icon: AlertCircle,
      textColor: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950",
      borderColor: "border-red-200 dark:border-red-800",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-1 text-xs gap-1",
    md: "px-3 py-1.5 text-sm gap-1.5",
    lg: "px-4 py-2 text-base gap-2",
  };

  return (
    <div
      className={clsx(
        "inline-flex items-center gap-1.5 font-medium",
        config.textColor,
        config.bgColor,
        config.borderColor,
        "border rounded-full",
        sizeClasses[size]
      )}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span>{config.label}</span>
      {currentStock !== undefined && (
        <span className="text-xs ml-1 opacity-80">({currentStock})</span>
      )}
    </div>
  );
}
