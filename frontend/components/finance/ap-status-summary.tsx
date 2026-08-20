"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Clock } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { fetchAPStatusSummary } from "@/app/dashboard/finance/lib/api";
import type { APStatusItem } from "@/app/dashboard/finance/types";

const StatusIconMap: Record<string, React.ReactNode> = {
  outstanding: <AlertCircle className="h-4 w-4 text-destructive" />,
  partial:     <Clock className="h-4 w-4 text-warning" />,
  scheduled:   <Clock className="h-4 w-4 text-info" />,
  paid:        <span className="text-success text-sm font-bold">✓</span>,
};

// Uses semantic token classes so it works in both light and dark modes
const StatusColorMap: Record<string, string> = {
  outstanding: "bg-destructive/10 border-destructive/30 text-destructive",
  partial:     "bg-warning-muted border-warning-border text-warning-foreground",
  scheduled:   "bg-info-muted border-info-border text-info",
  paid:        "bg-success/10 border-success/20 text-success",
};

export const APStatusSummary = () => {
  const [items, setItems] = useState<APStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPayables, setTotalPayables] = useState(0);
  const [upcomingPayments, setUpcomingPayments] = useState(0);
  const [overdueAmount, setOverdueAmount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const response = await fetchAPStatusSummary();
        if (response.success && response.data) {
          setItems(response.data.items);
          setTotalPayables(response.data.totalPayables);
          setUpcomingPayments(response.data.upcomingPayments);
          setOverdueAmount(response.data.overdueAmount);
        } else {
          setError(response.error?.message || "Failed to load AP data");
        }
      } catch (err) {
        console.error("Error loading AP status:", err);
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
          <CardTitle>AP Status Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(4)].map((_, i) => (
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
        <CardTitle>AP Status Summary</CardTitle>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="rounded-lg bg-muted border border-border p-2">
            <p className="text-xs text-muted-foreground">Total Payables</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(totalPayables)}</p>
          </div>
          <div className="rounded-lg bg-info-muted border border-info-border p-2">
            <p className="text-xs text-info">Upcoming (30d)</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(upcomingPayments)}</p>
          </div>
          {overdueAmount > 0 && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-2 col-span-2">
              <p className="text-xs text-destructive">Overdue Amount</p>
              <p className="text-sm font-semibold text-destructive">{formatCurrency(overdueAmount)}</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No payables</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.status}
              className={cn(
                "rounded-lg border p-3 flex items-center justify-between",
                StatusColorMap[item.status] || "bg-muted border-border"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="shrink-0">{StatusIconMap[item.status]}</div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.count} bills</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{formatCurrency(item.totalAmount)}</p>
                <p className="text-xs text-muted-foreground">{item.percentage.toFixed(0)}%</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
