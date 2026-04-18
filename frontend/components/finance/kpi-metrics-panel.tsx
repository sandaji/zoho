"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, BarChart3, PieChart, Percent, DollarSign } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { fetchFinancialKPIs } from "@/app/dashboard/finance/lib/api";
import type { FinancialKPIs } from "@/app/dashboard/finance/types";

interface KPIMetric {
  label: string;
  value: number;
  icon: React.ReactNode;
  format?: "currency" | "percent" | "number";
  trend?: "up" | "down" | "neutral";
  color: string;
}

export const KPIMetricsPanel = () => {
  const [kpis, setKpis] = useState<FinancialKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadKPIs = async () => {
      try {
        setError(null);
        const response = await fetchFinancialKPIs();
        if (response.success && response.data?.kpis) {
          setKpis(response.data.kpis);
        } else {
          setError(response.error?.message || "Failed to load KPIs");
        }
      } catch (err) {
        console.error("Error loading KPIs:", err);
        setError("An error occurred while loading KPIs");
      } finally {
        setLoading(false);
      }
    };

    loadKPIs();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="pt-6">
          <p className="text-sm text-red-800">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!kpis) return null;

  const metrics: KPIMetric[] = [
    {
      label: "Net Profit Margin",
      value: kpis.netProfitMargin,
      format: "percent",
      icon: <TrendingUp className="h-5 w-5" />,
      trend: kpis.netProfitMargin >= 10 ? "up" : "down",
      color: kpis.netProfitMargin >= 10 ? "text-green-600" : "text-orange-600",
    },
    {
      label: "Gross Profit Margin",
      value: kpis.grossProfitMargin,
      format: "percent",
      icon: <BarChart3 className="h-5 w-5" />,
      trend: kpis.grossProfitMargin >= 30 ? "up" : "neutral",
      color: kpis.grossProfitMargin >= 30 ? "text-blue-600" : "text-slate-600",
    },
    {
      label: "Expense Ratio",
      value: kpis.expenseRatio,
      format: "percent",
      icon: <PieChart className="h-5 w-5" />,
      trend: kpis.expenseRatio <= 50 ? "up" : "down",
      color: kpis.expenseRatio <= 50 ? "text-green-600" : "text-red-600",
    },
    {
      label: "Cash Position",
      value: kpis.cashPosition,
      format: "currency",
      icon: <DollarSign className="h-5 w-5" />,
      color: kpis.cashPosition > 0 ? "text-green-600" : "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, idx) => (
        <Card
          key={idx}
          className="border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{metric.label}</CardTitle>
            <div className={cn("rounded-full bg-gray-100 p-2", `${metric.color}`)}>
              {metric.icon}
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", metric.color)}>
              {metric.format === "currency"
                ? formatCurrency(metric.value)
                : metric.format === "percent"
                  ? `${metric.value.toFixed(1)}%`
                  : metric.value.toFixed(2)}
            </div>
            {metric.trend && (
              <div className="mt-2 flex items-center gap-1 text-xs">
                {metric.trend === "up" ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">Healthy</span>
                  </>
                ) : metric.trend === "down" ? (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-600" />
                    <span className="text-red-600">Needs attention</span>
                  </>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
