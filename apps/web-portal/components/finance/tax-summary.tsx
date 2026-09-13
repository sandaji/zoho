"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Check, Clock, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
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
      <Card>
        <CardHeader>
          <CardTitle>Tax Summary</CardTitle>
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
      <Card>
        <CardHeader>
          <CardTitle>Tax Summary</CardTitle>
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

  const filingStatusConfig = {
    filed:   { badge: "success" as const,     icon: Check,         label: "Filed"    },
    pending: { badge: "secondary" as const,   icon: Clock,         label: "Pending"  },
    due:     { badge: "warning" as const,     icon: AlertCircle,   label: "Due"      },
    overdue: { badge: "destructive" as const, icon: AlertCircle,   label: "Overdue"  },
  };

  const statusConfig = filingStatusConfig[data.filingStatus as keyof typeof filingStatusConfig]
    ?? filingStatusConfig.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle>Tax Summary</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{data.period}</p>
        </div>
        <Badge variant={statusConfig.badge} className="gap-1">
          <StatusIcon className="h-3 w-3" />
          {statusConfig.label}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Total Tax & Rate */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Tax Amount</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(data.totalTax)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Effective Rate</p>
            <p className="mt-1 text-2xl font-bold text-info">
              {data.effectiveRate.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Taxable Base */}
        <div className="rounded-lg bg-muted border border-border p-3">
          <p className="text-xs text-muted-foreground">Taxable Base Amount</p>
          <p className="mt-1 font-semibold text-foreground">{formatCurrency(data.totalTaxable)}</p>
        </div>

        {/* Tax Categories */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Tax Categories</p>
          {data.categories.map((category, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{category.category}</span>
                <span className="text-xs font-medium text-foreground">
                  {category.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Base: {formatCurrency(category.baseAmount)} | Rate: {category.rate.toFixed(2)}%
                </span>
                <span className="font-medium text-foreground">
                  {formatCurrency(category.taxAmount)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full bg-primary/70 transition-all duration-500"
                  style={{ width: `${Math.min(category.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Filing Deadline */}
        {data.filingDeadline && (
          <div className="flex items-center gap-2 rounded-lg border border-warning-border bg-warning-muted p-3">
            <Calendar className="h-4 w-4 text-warning shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-warning-foreground">Filing Deadline</p>
              <p className="text-sm text-foreground">{data.filingDeadline}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
