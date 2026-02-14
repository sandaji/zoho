"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailySummary } from "@/lib/admin-api";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  DollarSign,
  Receipt,
  Tag,
  Package,
  Users,
  Store,
  AlertCircle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  MoreHorizontal
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { fetchDailySummary } from "@/lib/admin-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Safe number formatter utility
const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};

const formatNumber = (value: any): string => {
  return safeNumber(value).toLocaleString();
};

export default function AdminOverview() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchDailySummary(token);
      setSummary(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      console.error("Failed to fetch summary:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const refreshData = () => {
    loadData();
  };

  if (loading && !summary) {
    return <LoadingSkeleton />;
  }

  if (error && !summary) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Failed to Load Data
          </h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <Button onClick={refreshData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No Data Available
          </h3>
          <p className="text-slate-600 mb-4">
            There's no data to display for the current period.
          </p>
          <Button onClick={refreshData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Safe data access with defaults
  const safeSummary = {
    total_sales: safeNumber(summary?.total_sales),
    total_revenue: safeNumber(summary?.total_revenue),
    total_tax: safeNumber(summary?.total_tax),
    total_discount: safeNumber(summary?.total_discount),
    top_products: Array.isArray(summary?.top_products)
      ? summary.top_products.map(product => ({
        productId: product?.productId || 'Unknown',
        name: product?.name || 'Unknown Product',
        quantity: safeNumber(product?.quantity)
      }))
      : []
  };

  const kpis = [
    {
      title: "Total Sales",
      value: formatNumber(safeSummary.total_sales),
      subtitle: "Transactions",
      icon: Receipt,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      trend: safeSummary.total_sales > 0 ? "up" : "neutral",
    },
    {
      title: "Total Revenue",
      value: formatCurrency(safeSummary.total_revenue),
      subtitle: "Today's revenue",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      trend: safeSummary.total_revenue > 0 ? "up" : "neutral",
    },
    {
      title: "Total Tax",
      value: formatCurrency(safeSummary.total_tax),
      subtitle: "Tax collected",
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      trend: safeSummary.total_tax > 0 ? "up" : "neutral",
    },
    {
      title: "Total Discount",
      value: formatCurrency(safeSummary.total_discount),
      subtitle: "Discounts applied",
      icon: Tag,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      trend: safeSummary.total_discount > 0 ? "up" : "neutral",
    },
  ];

  const totalProductsSold = safeSummary.top_products.reduce((acc, product) =>
    acc + safeNumber(product.quantity), 0
  );

  const additionalMetrics = [
    {
      title: "Average Order Value",
      value: safeSummary.total_sales > 0
        ? formatCurrency(safeSummary.total_revenue / safeSummary.total_sales)
        : formatCurrency(0),
      icon: DollarSign,
    },
    {
      title: "Products Sold",
      value: formatNumber(totalProductsSold),
      icon: Package,
    },
  ];

  return (
    <div className="space-y-6 pb-6 pr-4">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Today's Overview</h2>
          {lastUpdated && (
            <p className="text-sm text-emerald-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button
          onClick={refreshData}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const TrendIcon = kpi.trend === 'up' ? ArrowUp : kpi.trend === 'down' ? ArrowDown : null;

          return (
            <Card key={kpi.title} className="relative overflow-hidden bg-emerald-500 ">
              <div className={`absolute top-0 right-0 w-20 h-20 ${kpi.bgColor} rounded-full -mr-10 -mt-10 opacity-50`}></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {kpi.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${kpi.bgColor}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 mb-1">
                  {kpi.value}
                </div>
                <div className="flex items-center text-xs text-slate-500">
                  <span>{kpi.subtitle}</span>
                  {TrendIcon && (
                    <TrendIcon className={`h-3 w-3 ml-1 ${kpi.trend === 'up' ? 'text-green-500' : 'text-red-500'
                      }`} />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Metrics and Top Products */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Additional Metrics */}
        <Card className="lg:col-span-1   ">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-slate-600" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {additionalMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.title} className=" flex items-center justify-between p-3 bg-slate-5 rounded-lg">
                  <div className="flex items-center">
                    <Icon className="h-4 w-4 text-slate-500 mr-2" />
                    <span className="text-sm font-medium text-slate-700">{metric.title}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{metric.value}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="lg:col-span-2 ">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top Selling Products</CardTitle>
            <Badge variant="secondary">
              {safeSummary.top_products.length} products
            </Badge>
          </CardHeader>
          <CardContent>
            {safeSummary.top_products.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Quantity Sold</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safeSummary.top_products.slice(0, 8).map((product, index) => {
                    const quantity = safeNumber(product.quantity);
                    const productStatus = quantity > 20 ? "Hot" : quantity > 10 ? "Popular" : "Regular";

                    return (
                      <TableRow key={product.productId} className="group">
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center mr-3">
                              <span className="text-xs font-semibold text-slate-600">
                                #{index + 1}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">
                                {product.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                SKU: {product.productId.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={quantity > 10 ? "default" : "secondary"}
                            className={
                              quantity > 20
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : quantity > 10
                                  ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                                  : "bg-slate-100 text-slate-800 hover:bg-slate-100"
                            }
                          >
                            {productStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-semibold text-slate-900">
                            {formatNumber(quantity)}
                          </div>
                          <div className="text-xs text-slate-500">units</div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>View Product</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No sales data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <div className="text-sm text-slate-600">Active Users</div>
                <div className="text-lg font-semibold">-</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Store className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <div className="text-sm text-slate-600">Active Branches</div>
                <div className="text-lg font-semibold">-</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <div className="text-sm text-slate-600">Low Stock Items</div>
                <div className="text-lg font-semibold">-</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Enhanced Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 bg-slate-200 rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-slate-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="h-9 bg-slate-200 rounded w-24 animate-pulse"></div>
      </div>

      {/* KPI Skeletons */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-slate-200 rounded w-20"></div>
              <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-slate-200 rounded w-24 mb-1"></div>
              <div className="h-3 bg-slate-200 rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Skeletons */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 animate-pulse">
          <CardHeader>
            <div className="h-6 bg-slate-200 rounded w-32"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-slate-200 rounded"></div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 animate-pulse">
          <CardHeader>
            <div className="h-6 bg-slate-200 rounded w-40"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-slate-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 