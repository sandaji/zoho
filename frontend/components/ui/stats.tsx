"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Warehouse,
  Users,
  Truck,
  ShoppingCart,
  Percent,
  DollarSign,
} from "lucide-react";
import { getStatusColor } from "../../lib/statusColors";
import { getModuleAccent } from "../../lib/moduleColors";
import { StatCard as StatCardData } from "../../lib/utils/stat-card";
import { formatCurrency } from "../../lib/utils/money";

export interface StatCardProps {
  title?: string;
  value?: number | string;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "emerald" | "amber" | "sky" | "rose";
  subtext?: string;
  trend?: { value: number; direction: "up" | "down" | "neutral" };
  prefix?: string;
  suffix?: string;
  size?: "sm" | "md" | "lg";
  cardData?: StatCardData;
}

/**
 * Standard StatCard Component
 * Consumes StatCardData or props to render unified KPI metrics across Admin, Finance, Inventory, and Dashboard.
 */
export function StatCard({
  title,
  value,
  icon,
  variant = "default",
  subtext,
  trend,
  prefix = "",
  suffix = "",
  size = "md",
  cardData,
}: StatCardProps) {
  const cardTitle = cardData ? cardData.title : title;
  const cardValue = cardData ? cardData.value : value;
  const cardChange = cardData ? cardData.change : trend?.value;
  const cardTrendDirection = cardData ? cardData.trend : trend?.direction;
  const cardColor = cardData ? cardData.color : variant;
  const cardTooltip = cardData ? cardData.tooltip : subtext;

  const accent = getModuleAccent(cardColor || "home");

  const sizeStyles = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  const titleSizeStyles = {
    sm: "text-xs font-medium",
    md: "text-sm font-medium",
    lg: "text-base font-medium",
  };

  const valueSizeStyles = {
    sm: "text-lg font-bold",
    md: "text-2xl font-bold",
    lg: "text-3xl font-bold",
  };

  return (
    <div
      className={`border rounded-xl shadow-sm ${accent.bg} ${accent.border} ${sizeStyles[size]} flex flex-col justify-between transition-all hover:shadow-md`}
      title={cardTooltip}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`text-muted-foreground ${titleSizeStyles[size]}`}>{cardTitle}</span>
        {icon && (
          <div className={`${accent.badge} p-2 rounded-lg`}>
            {React.cloneElement(icon as React.ReactElement<any>, {
              size: 20,
              className: accent.icon,
            })}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className={`${valueSizeStyles[size]} tracking-tight ${accent.text}`}>
          {prefix}
          {typeof cardValue === "number" ? cardValue.toLocaleString() : cardValue}
          {suffix}
        </span>

        {cardChange !== undefined && cardChange !== 0 && (
          <div
            className={`flex items-center text-xs font-semibold px-2 py-0.5 rounded-md ${
              cardTrendDirection === "up"
                ? "bg-success-muted text-success"
                : cardTrendDirection === "down"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {cardTrendDirection === "up" && <TrendingUp size={12} className="mr-1 inline" />}
            {cardTrendDirection === "down" && <TrendingDown size={12} className="mr-1 inline" />}
            {cardTrendDirection === "neutral" && <Minus size={12} className="mr-1 inline" />}
            {cardChange > 0 ? `+${cardChange}%` : `${cardChange}%`}
          </div>
        )}
      </div>

      {cardTooltip && <p className="mt-2 text-xs text-muted-foreground">{cardTooltip}</p>}
    </div>
  );
}

export interface StatCardGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export function StatCardGrid({ children, cols = 4, className = "" }: StatCardGridProps) {
  const colStyles: Record<number, string> = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5",
    6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-6",
  };

  return (
    <div className={`grid gap-4 ${colStyles[cols] || colStyles[4]} ${className}`}>
      {children}
    </div>
  );
}

