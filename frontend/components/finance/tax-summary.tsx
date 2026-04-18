"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Check, Clock, TrendingUp, Calendar } from "lucide-react";
import { fetchTaxSummary } from "@/app/dashboard/finance/lib/api";
import { formatCurrency } from "@/app/dashboard/finance/lib/api";
import type { TaxSummaryResponse } from "@/app/dashboard/finance/types";

export function TaxSummary() {
  const [data, setData] = useState<TaxSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTaxSummary = async () => {
      try {
        setError(null);
        const result = await fetchTaxSummary();
        if (result.success && result.data) {
          setData(result.data);
        } else {
          setError("Failed to load tax summary");
        }
      } catch (err) {
        console.error("Error loading tax summary:", err);
        setError("Failed to load tax summary");
      } finally {
        setLoading(false);
      }
    };

    loadTaxSummary();
  }, []);

  if (loading) {
    return (
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Tax Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Tax Summary</CardTitle>
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

  const filingStatusConfig = {
    filed: { badge: "secondary", icon: Check, label: "Filed" },
    pending: { badge: "outline", icon: Clock, label: "Pending" },
    due: { badge: "destructive", icon: AlertCircle, label: "Due" },
    overdue: { badge: "destructive", icon: AlertCircle, label: "Overdue" },
  };

  const statusConfig = filingStatusConfig[data.filingStatus as keyof typeof filingStatusConfig];
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg font-semibold">Tax Summary</CardTitle>
          <p className="mt-1 text-sm text-gray-600">{data.period}</p>
        </div>
        <Badge variant={statusConfig.badge as any} className="gap-1">
          <StatusIcon className="h-3 w-3" />
          {statusConfig.label}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Total Tax & Rate */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Tax Amount</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(data.totalTax)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Effective Rate</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {data.effectiveRate.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Taxable Base */}
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-sm text-gray-600">Taxable Base Amount</p>
          <p className="mt-1 font-semibold text-gray-900">{formatCurrency(data.totalTaxable)}</p>
        </div>

        {/* Tax Categories */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-900">Tax Categories</p>
          {data.categories.map((category, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{category.category}</span>
                <span className="text-sm font-medium text-gray-900">
                  {category.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  Base: {formatCurrency(category.baseAmount)} | Rate: {category.rate.toFixed(2)}%
                </span>
                <span className="font-medium text-gray-700">
                  {formatCurrency(category.taxAmount)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${Math.min(category.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Filing Deadline */}
        {data.filingDeadline && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <Calendar className="h-4 w-4 text-amber-600" />
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-900">Filing Deadline</p>
              <p className="text-sm text-amber-800">{data.filingDeadline}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
