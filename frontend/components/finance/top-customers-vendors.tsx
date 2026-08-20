"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, AlertCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchTopCustomersVendors } from "@/app/dashboard/finance/lib/api";
import { formatCurrency, formatCurrencyCompact } from "@/app/dashboard/finance/lib/api";
import type { TopCustomersVendorsResponse } from "@/app/dashboard/finance/types";

export function TopCustomersVendors() {
  const [data, setData] = useState<TopCustomersVendorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"customers" | "vendors">("customers");

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const result = await fetchTopCustomersVendors(5);
        if (result.success && result.data) {
          setData(result.data);
        } else {
          setError("Failed to load data");
        }
      } catch (err) {
        console.error("Error loading top customers/vendors:", err);
        setError("Failed to load data");
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
          <CardTitle>Top Customers &amp; Vendors</CardTitle>
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
          <CardTitle>Top Customers &amp; Vendors</CardTitle>
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

  const displayData = activeTab === "customers" ? data.topCustomers : data.topVendors;
  const totalAmount =
    activeTab === "customers" ? data.totalCustomerRevenue : data.totalVendorExpenses;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Customers &amp; Vendors</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Period: {data.periodStart} to {data.periodEnd}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          {(["customers", "vendors"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-xs font-medium transition-colors",
                activeTab === tab
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Top {tab === "customers" ? "Customers" : "Vendors"} (
              {tab === "customers" ? data.topCustomers.length : data.topVendors.length})
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="rounded-lg bg-muted border border-border p-4">
          <p className="text-xs text-muted-foreground">
            {activeTab === "customers" ? "Total Customer Revenue" : "Total Vendor Expenses"}
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(totalAmount)}</p>
        </div>

        {/* Items List */}
        <div className="space-y-3">
          {displayData.length > 0 ? (
            displayData.map((item, idx) => {
              const trendPositive = item.trend >= 0;
              const TrendIcon = trendPositive ? TrendingUp : TrendingDown;
              return (
                <div
                  key={idx}
                  className="flex items-start justify-between rounded-lg border border-border p-3 hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{item.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.invoiceCount} {activeTab === "customers" ? "invoices" : "purchases"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <p className="font-semibold text-foreground text-sm">
                      {formatCurrencyCompact(item.totalRevenue)}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-xs">
                      <TrendIcon
                        className={cn("h-3 w-3", trendPositive ? "text-success" : "text-destructive")}
                      />
                      <span className={trendPositive ? "text-success" : "text-destructive"}>
                        {trendPositive ? "+" : ""}
                        {item.trend.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              No {activeTab === "customers" ? "customers" : "vendors"} found
            </p>
          )}
        </div>

        {/* Aggregates */}
        {displayData.length > 0 && (
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-primary/5 border border-primary/10 p-4">
            <div>
              <p className="text-xs text-muted-foreground">
                Avg. Per {activeTab === "customers" ? "Customer" : "Vendor"}
              </p>
              <p className="mt-1 font-semibold text-foreground text-sm">
                {formatCurrencyCompact(
                  displayData.reduce((sum, item) => sum + item.totalRevenue, 0) / displayData.length
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg. Invoice Value</p>
              <p className="mt-1 font-semibold text-foreground text-sm">
                {formatCurrencyCompact(
                  displayData.reduce((sum, item) => sum + item.averageInvoiceValue, 0) /
                    displayData.length
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
