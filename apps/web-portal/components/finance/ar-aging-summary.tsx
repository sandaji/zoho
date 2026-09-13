"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { fetchARAgingSummary } from "@/app/dashboard/finance/lib/api";
import type { ARAgingBucket } from "@/app/dashboard/finance/types";

export const ARAgingSummary = () => {
  const [buckets, setBuckets] = useState<ARAgingBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [criticalOverdue, setCriticalOverdue] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const response = await fetchARAgingSummary();
        if (response.success && response.data) {
          setBuckets(response.data.buckets);
          setTotalOutstanding(response.data.totalOutstanding);
          setCriticalOverdue(response.data.criticalOverdue);
        } else {
          setError(response.error?.message || "Failed to load AR aging data");
        }
      } catch (err) {
        console.error("Error loading AR aging:", err);
        setError("An error occurred");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AR Aging Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/10">
        <CardContent className="pt-6 flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{error}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>AR Aging Summary</CardTitle>
          {criticalOverdue > 0 && (
            <div className="flex items-center gap-1 bg-destructive/10 border border-destructive/30 px-2 py-1 rounded text-xs text-destructive font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              {formatCurrency(criticalOverdue)} overdue
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Total Outstanding:{" "}
          <span className="font-semibold text-foreground">{formatCurrency(totalOutstanding)}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {buckets.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No outstanding invoices</p>
          </div>
        ) : (
          buckets.map((bucket) => {
            const isOverdue = bucket.bucket !== "current";
            const isVeryOverdue = bucket.bucket === "over_90_days";

            return (
              <div
                key={bucket.bucket}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  isVeryOverdue
                    ? "bg-destructive/10 border-destructive/30"
                    : isOverdue
                      ? "bg-warning-muted border-warning-border"
                      : "bg-muted border-border"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{bucket.label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isVeryOverdue
                              ? "bg-destructive"
                              : isOverdue
                                ? "bg-warning"
                                : "bg-success"
                          )}
                          style={{ width: `${bucket.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {bucket.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(bucket.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{bucket.count} invoices</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
