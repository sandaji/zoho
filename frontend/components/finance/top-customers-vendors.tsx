"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, AlertCircle, User } from "lucide-react";
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
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Top Customers & Vendors</CardTitle>
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
          <CardTitle className="text-lg font-semibold">Top Customers & Vendors</CardTitle>
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

  const displayData = activeTab === "customers" ? data.topCustomers : data.topVendors;
  const totalAmount =
    activeTab === "customers" ? data.totalCustomerRevenue : data.totalVendorExpenses;

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Top Customers & Vendors</CardTitle>
        <p className="mt-1 text-sm text-gray-600">
          Period: {data.periodStart} to {data.periodEnd}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("customers")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "customers"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Top Customers ({data.topCustomers.length})
          </button>
          <button
            onClick={() => setActiveTab("vendors")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "vendors"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Top Vendors ({data.topVendors.length})
          </button>
        </div>

        {/* Summary */}
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            {activeTab === "customers" ? "Total Customer Revenue" : "Total Vendor Expenses"}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
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
                  className="flex items-start justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.customerName}</p>
                        <p className="text-xs text-gray-600">
                          {item.invoiceCount} {activeTab === "customers" ? "invoices" : "purchases"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrencyCompact(item.totalRevenue)}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-xs">
                      <TrendIcon
                        className={`h-3 w-3 ${trendPositive ? "text-green-600" : "text-red-600"}`}
                      />
                      <span className={trendPositive ? "text-green-600" : "text-red-600"}>
                        {trendPositive ? "+" : ""}
                        {item.trend.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-sm text-gray-600">
              No {activeTab === "customers" ? "customers" : "vendors"} found
            </p>
          )}
        </div>

        {/* Additional Info */}
        {displayData.length > 0 && (
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-blue-50 p-4">
            <div>
              <p className="text-xs text-blue-700">
                Avg. Per {activeTab === "customers" ? "Customer" : "Vendor"}
              </p>
              <p className="mt-1 font-semibold text-blue-900">
                {formatCurrencyCompact(
                  displayData.reduce((sum, item) => sum + item.totalRevenue, 0) / displayData.length
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-700">Avg. Invoice Value</p>
              <p className="mt-1 font-semibold text-blue-900">
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
