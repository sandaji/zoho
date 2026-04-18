"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Clock } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { fetchAPStatusSummary } from "@/app/dashboard/finance/lib/api";
import type { APStatusItem } from "@/app/dashboard/finance/types";

const StatusIconMap: Record<string, React.ReactNode> = {
  outstanding: <AlertCircle className="h-4 w-4" />,
  partial: <Clock className="h-4 w-4" />,
  scheduled: <Clock className="h-4 w-4" />,
  paid: <span className="text-green-600">✓</span>,
};

const StatusColorMap: Record<string, string> = {
  outstanding: "bg-red-100 text-red-800 border-red-200",
  partial: "bg-amber-100 text-amber-800 border-amber-200",
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  paid: "bg-green-100 text-green-800 border-green-200",
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
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">AP Status Summary</CardTitle>
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
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">{error}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">AP Status Summary</CardTitle>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="rounded-lg bg-gray-50 p-2">
            <p className="text-xs text-gray-600">Total Payables</p>
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(totalPayables)}</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-2">
            <p className="text-xs text-blue-700">Upcoming (30d)</p>
            <p className="text-sm font-semibold text-blue-900">
              {formatCurrency(upcomingPayments)}
            </p>
          </div>
          {overdueAmount > 0 && (
            <div className="rounded-lg bg-red-50 p-2 col-span-2">
              <p className="text-xs text-red-700">Overdue Amount</p>
              <p className="text-sm font-semibold text-red-900">{formatCurrency(overdueAmount)}</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500">No payables</p>
          </div>
        ) : (
          <>
            {items.map((item) => (
              <div
                key={item.status}
                className={cn(
                  "rounded-lg border p-3 flex items-center justify-between",
                  StatusColorMap[item.status] || "bg-gray-50 border-gray-200"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0">{StatusIconMap[item.status]}</div>
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs opacity-75">{item.count} bills</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(item.totalAmount)}</p>
                  <p className="text-xs opacity-75">{item.percentage.toFixed(0)}%</p>
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
};
