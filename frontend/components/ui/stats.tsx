"use client";

import React from "react";
import {
  TrendingUp,
  Warehouse,
  Users,
  Truck,
  ShoppingCart,
  Percent,
  DollarSign,
  User,
  Car,
} from "lucide-react";

export interface StatCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  subtext?: string;
  trend?: { value: number; direction: "up" | "down" };
  prefix?: string;
  suffix?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * StatCard Component
 * Displays a single KPI statistic with icon, value, and optional trend
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
}: StatCardProps) {
  const variantStyles: Record<string, string> = {
    default: "bg-blue-50 border-blue-200",
    success: "bg-green-50 border-green-200",
    warning: "bg-yellow-50 border-yellow-200",
    danger: "bg-red-50 border-red-200",
    info: "bg-purple-50 border-purple-200",
  };

  const iconColorStyles: Record<string, string> = {
    default: "text-blue-600",
    success: "text-green-600",
    warning: "text-yellow-600",
    danger: "text-red-600",
    info: "text-purple-600",
  };

  const sizeStyles: Record<string, string> = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  const iconSizeStyles: Record<string, number> = {
    sm: 20,
    md: 28,
    lg: 36,
  };

  const titleSizeStyles: Record<string, string> = {
    sm: "text-xs font-medium",
    md: "text-sm font-medium",
    lg: "text-base font-medium",
  };

  const valueSizeStyles: Record<string, string> = {
    sm: "text-lg font-bold",
    md: "text-2xl font-bold",
    lg: "text-3xl font-bold",
  };

  return (
    <div className={`border rounded-lg ${variantStyles[variant]} ${sizeStyles[size]} flex gap-4`}>
      {icon && (
        <div className="flex items-center justify-center">
          <div className={`${iconColorStyles[variant]}`}>
            {React.cloneElement(icon as React.ReactElement<any>, {
              size: iconSizeStyles[size],
            })}
          </div>
        </div>
      )}

      <div className="flex-1">
        <p className={`text-gray-600 ${titleSizeStyles[size]}`}>{title}</p>
        <div className="flex items-end gap-2 mt-1">
          <p className={`${valueSizeStyles[size]} text-gray-900`}>
            {prefix}
            {typeof value === "number"
              ? value.toLocaleString("en-KE", {
                maximumFractionDigits: 2,
              })
              : value}
            {suffix}
          </p>

          {trend && (
            <span
              className={`text-xs font-semibold mb-1 ${trend.direction === "up" ? "text-green-600" : "text-red-600"
                }`}
            >
              {trend.direction === "up" ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
          )}
        </div>

        {subtext && <p className="text-xs text-gray-500 mt-2">{subtext}</p>}
      </div>
    </div>
  );
}

/**
 * StatCardGrid Component
 * Container for multiple stat cards in a responsive grid
 */
export interface StatCardGridProps {
  children: React.ReactNode;
  cols?: number;
}

export function StatCardGrid({ children, cols = 4 }: StatCardGridProps) {
  const gridColsStyles: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    6: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  };

  return (
    <div className={`grid gap-4 ${gridColsStyles[cols] || gridColsStyles[4]}`}>{children}</div>
  );
}

/**
 * Predefined Stats for common KPIs
 */

export function SalesStatCard(props: Partial<StatCardProps>) {
  return (
    <StatCard
      title="Total Sales"
      value={0}
      icon={<ShoppingCart />}
      variant="info"
      prefix="KES "
      {...props}
    />
  );
}

export function RevenueStatCard(props: Partial<StatCardProps>) {
  return (
    <StatCard
      title="Revenue"
      value={0}
      icon={<DollarSign />}
      variant="success"
      prefix="ksh"
      {...props}
    />
  );
}

export function ExpenseStatCard(props: Partial<StatCardProps>) {
  return (
    <StatCard
      title="Expenses"
      value={0}
      icon={<DollarSign />}
      variant="danger"
      prefix="KES "
      {...props}
    />
  );
}

export function ProfitStatCard(props: Partial<StatCardProps>) {
  return (
    <StatCard
      title="Net Profit"
      value={0}
      icon={<TrendingUp />}
      variant="success"
      prefix="KES "
      {...props}
    />
  );
}

export function EmployeeStatCard(props: Partial<StatCardProps>) {
  return <StatCard title="Employees" value={0} icon={<Users />} variant="info" {...props} />;
}

export function InventoryStatCard(props: Partial<StatCardProps>) {
  return (
    <StatCard
      title="Inventory Value"
      value={0}
      icon={<Warehouse />}
      variant="warning"
      prefix="KES "
      {...props}
    />
  );
}

export function FleetStatCard(props: Partial<StatCardProps>) {
  return (
    <StatCard
      title="Active Trucks"
      value={0}
      icon={<Car />}
      variant="default"
      {...props}
    />
  );
}

export function PercentageStatCard(props: Partial<StatCardProps>) {
  return (
    <StatCard
      title="Profit Margin"
      value={0}
      icon={<Percent />}
      variant="success"
      suffix="%"
      {...props}
    />
  );
}
