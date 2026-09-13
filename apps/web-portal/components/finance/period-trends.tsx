"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchPeriodComparisonTrends } from "@/app/dashboard/finance/lib/api";
import { formatCurrency, formatCurrencyCompact } from "@/app/dashboard/finance/lib/api";
import type { PeriodComparisonTrendsResponse } from "@/app/dashboard/finance/types";

export function PeriodTrends() {
  const [data, setData] = useState<PeriodComparisonTrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTrends = async () => {
      try {
        setError(null);
        const result = await fetchPeriodComparisonTrends(12);
        if (result.success && result.data) {
          setData(result.data);
        } else {
          setError("Failed to load trends");
        }
      } catch (err) {
        console.error("Error loading trends:", err);
        setError("Failed to load trends");
      } finally {
        setLoading(false);
      }
    };

    loadTrends();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Period Trends</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Period Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error || "Failed to load data"}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIndicator = (change: number) => {
    if (change > 0) return { icon: TrendingUp,   colorClass: "text-success",     sign: "+" };
    if (change < 0) return { icon: TrendingDown, colorClass: "text-destructive", sign: ""  };
    return              { icon: null,            colorClass: "text-muted-foreground", sign: "" };
  };

  const revenueTrend = getTrendIndicator(data.revenueGrowth);
  const expenseTrend = getTrendIndicator(data.expenseChange);
  const profitTrend  = getTrendIndicator(data.profitChange);
  const marginTrend  = getTrendIndicator(data.marginTrend);

  const trendCells = [
    { label: "Revenue Growth",  value: data.revenueGrowth,  trend: revenueTrend, sub: formatCurrencyCompact(data.currentPeriod.revenue) },
    { label: "Expense Change",  value: data.expenseChange,  trend: expenseTrend, sub: formatCurrencyCompact(data.currentPeriod.expenses) },
    { label: "Profit Change",   value: data.profitChange,   trend: profitTrend,  sub: formatCurrencyCompact(data.currentPeriod.profit) },
    { label: "Margin Trend",    value: data.marginTrend,    trend: marginTrend,  sub: `${data.currentPeriod.margin.toFixed(2)}%` },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Period Comparison Trends</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Last {data.trends.length} periods analysis
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Trend Metrics Grid — uses Card component so tokens apply */}
        <div className="grid grid-cols-2 gap-3">
          {trendCells.map(({ label, value, trend, sub }) => {
            const TrendIcon = trend.icon;
            return (
              <div key={label} className="rounded-lg border border-border bg-muted p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {value.toFixed(2)}%
                    </p>
                  </div>
                  {TrendIcon && <TrendIcon className={cn("h-4 w-4 mt-0.5", trend.colorClass)} />}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">Current: {sub}</p>
              </div>
            );
          })}
        </div>

        {/* Period Comparison */}
        <div className="space-y-2 rounded-lg bg-muted border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Period Comparison</p>

          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs text-muted-foreground">Current Period</span>
              <div className="text-right">
                <p className="font-medium text-foreground text-xs">
                  Revenue: {formatCurrencyCompact(data.currentPeriod.revenue)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Profit: {formatCurrencyCompact(data.currentPeriod.profit)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Previous Period</span>
              <div className="text-right">
                <p className="font-medium text-foreground text-xs">
                  Revenue: {formatCurrencyCompact(data.previousPeriod.revenue)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Profit: {formatCurrencyCompact(data.previousPeriod.profit)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mini Bar Chart */}
        {data.trends.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Recent Trend</p>
            <div className="grid grid-cols-12 gap-1">
              {data.trends.slice(-12).map((trend, idx) => {
                const maxProfit = Math.max(...data.trends.map((t) => t.profit));
                const height = maxProfit > 0 ? (Math.max(trend.profit, 0) / maxProfit) * 100 : 10;
                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center gap-1"
                    title={`${trend.period}: ${formatCurrency(trend.profit)}`}
                  >
                    <div
                      className="w-full rounded-t bg-primary/70 transition-all duration-300"
                      style={{ height: `${Math.max(height, 12)}px` }}
                    />
                    <span className="text-[9px] text-muted-foreground">{trend.period.slice(0, 3)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
