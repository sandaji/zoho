"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, BarChart3, PieChart, DollarSign } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { fetchFinancialKPIs } from "@/app/dashboard/finance/lib/api";
import type { FinancialKPIs } from "@/app/dashboard/finance/types";

interface KPIMetric {
  label: string;
  value: number;
  icon: React.ReactNode;
  format?: "currency" | "percent" | "number";
  trend?: "up" | "down" | "neutral";
  valueClass: string;
  iconClass: string;
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
        if (response.success && response.data) {
          const kpisData = response.data.kpis || response.data;
          setKpis(kpisData);
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
      <Card className="border-destructive/30 bg-destructive/10">
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">{error}</p>
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
      valueClass: kpis.netProfitMargin >= 10 ? "text-success" : "text-warning",
      iconClass: kpis.netProfitMargin >= 10 ? "text-success bg-success/10" : "text-warning bg-warning/10",
    },
    {
      label: "Gross Profit Margin",
      value: kpis.grossProfitMargin,
      format: "percent",
      icon: <BarChart3 className="h-5 w-5" />,
      trend: kpis.grossProfitMargin >= 30 ? "up" : "neutral",
      valueClass: kpis.grossProfitMargin >= 30 ? "text-info" : "text-muted-foreground",
      iconClass: kpis.grossProfitMargin >= 30 ? "text-info bg-info/10" : "text-muted-foreground bg-muted",
    },
    {
      label: "Expense Ratio",
      value: kpis.expenseRatio,
      format: "percent",
      icon: <PieChart className="h-5 w-5" />,
      trend: kpis.expenseRatio <= 50 ? "up" : "down",
      valueClass: kpis.expenseRatio <= 50 ? "text-success" : "text-destructive",
      iconClass: kpis.expenseRatio <= 50 ? "text-success bg-success/10" : "text-destructive bg-destructive/10",
    },
    {
      label: "Cash Position",
      value: kpis.cashPosition,
      format: "currency",
      icon: <DollarSign className="h-5 w-5" />,
      valueClass: kpis.cashPosition > 0 ? "text-success" : "text-destructive",
      iconClass: kpis.cashPosition > 0 ? "text-success bg-success/10" : "text-destructive bg-destructive/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, idx) => (
        <Card key={idx} className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground">{metric.label}</CardTitle>
            <div className={cn("rounded-full p-2", metric.iconClass)}>
              {metric.icon}
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", metric.valueClass)}>
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
                    <TrendingUp className="h-3 w-3 text-success" />
                    <span className="text-success">Healthy</span>
                  </>
                ) : metric.trend === "down" ? (
                  <>
                    <TrendingDown className="h-3 w-3 text-destructive" />
                    <span className="text-destructive">Needs attention</span>
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
