"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
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
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Period Trends</CardTitle>
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
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Period Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error || "Failed to load data"}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIndicator = (change: number) => {
    if (change > 0) {
      return {
        icon: TrendingUp,
        color: "text-green-600",
        sign: "+",
      };
    } else if (change < 0) {
      return {
        icon: TrendingDown,
        color: "text-red-600",
        sign: "",
      };
    }
    return {
      icon: null,
      color: "text-gray-600",
      sign: "",
    };
  };

  const revenueTrend = getTrendIndicator(data.revenueGrowth);
  const expenseTrend = getTrendIndicator(data.expenseChange);
  const profitTrend = getTrendIndicator(data.profitChange);
  const marginTrend = getTrendIndicator(data.marginTrend);

  const RevenueTrendIcon = revenueTrend.icon;
  const ExpenseTrendIcon = expenseTrend.icon;
  const ProfitTrendIcon = profitTrend.icon;
  const MarginTrendIcon = marginTrend.icon;

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Period Comparison Trends</CardTitle>
        <p className="mt-1 text-sm text-gray-600">Last {data.trends.length} periods analysis</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Trend Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Revenue Growth */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue Growth</p>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {data.revenueGrowth.toFixed(2)}%
                </p>
              </div>
              {RevenueTrendIcon && <RevenueTrendIcon className={`h-5 w-5 ${revenueTrend.color}`} />}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Current: {formatCurrencyCompact(data.currentPeriod.revenue)}
            </p>
          </div>

          {/* Expense Change */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Expense Change</p>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {data.expenseChange.toFixed(2)}%
                </p>
              </div>
              {ExpenseTrendIcon && <ExpenseTrendIcon className={`h-5 w-5 ${expenseTrend.color}`} />}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Current: {formatCurrencyCompact(data.currentPeriod.expenses)}
            </p>
          </div>

          {/* Profit Change */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Profit Change</p>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {data.profitChange.toFixed(2)}%
                </p>
              </div>
              {ProfitTrendIcon && <ProfitTrendIcon className={`h-5 w-5 ${profitTrend.color}`} />}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Current: {formatCurrencyCompact(data.currentPeriod.profit)}
            </p>
          </div>

          {/* Margin Trend */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Margin Trend</p>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {data.marginTrend.toFixed(2)}%
                </p>
              </div>
              {MarginTrendIcon && <MarginTrendIcon className={`h-5 w-5 ${marginTrend.color}`} />}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Current: {data.currentPeriod.margin.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Period Comparison */}
        <div className="space-y-2 rounded-lg bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-900">Period Comparison</p>

          <div className="grid grid-cols-1 gap-3">
            {/* Current vs Previous */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-2 last:border-0">
              <span className="text-sm text-gray-600">Current Period</span>
              <div className="text-right">
                <p className="font-medium text-gray-900">
                  Revenue: {formatCurrencyCompact(data.currentPeriod.revenue)}
                </p>
                <p className="text-xs text-gray-500">
                  Profit: {formatCurrencyCompact(data.currentPeriod.profit)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Previous Period</span>
              <div className="text-right">
                <p className="font-medium text-gray-900">
                  Revenue: {formatCurrencyCompact(data.previousPeriod.revenue)}
                </p>
                <p className="text-xs text-gray-500">
                  Profit: {formatCurrencyCompact(data.previousPeriod.profit)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mini Trend Chart */}
        {data.trends.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-900">Recent Trend</p>
            <div className="grid grid-cols-12 gap-1">
              {data.trends.slice(-12).map((trend, idx) => {
                const normalizedProfit = Math.max(
                  trend.profit,
                  Math.max(...data.trends.map((t) => t.profit)) * 0.1
                );
                const maxProfit = Math.max(...data.trends.map((t) => t.profit));
                const height = (normalizedProfit / maxProfit) * 100 || 10;

                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center gap-1"
                    title={`${trend.period}: ${formatCurrency(trend.profit)}`}
                  >
                    <div
                      className="w-full rounded-t bg-blue-500"
                      style={{ height: `${Math.max(height, 12)}px` }}
                    />
                    <span className="text-xs text-gray-500">{trend.period.slice(0, 3)}</span>
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
