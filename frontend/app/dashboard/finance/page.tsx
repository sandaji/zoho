"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, TrendingDown, RefreshCw, Download, Wallet } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

// Types
interface FinancialSummary {
  cashBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
  revenue: number;
  profit: number;
  expenses: number;
  grossMargin: number;
  netMargin: number;
  salesCount: number;
  activeProducts: number;
  lowStockProducts: number;
  payrollExpenses: number;
}

interface IncomeStatement {
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  payrollExpenses: number;
  totalExpenses: number;
  taxes: number;
  netIncome: number;
  grossMargin: number;
  netMargin: number;
}

interface ChartData {
  name: string;
  month: number;
  revenue: number;
  expenses: number;
  profit: number;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  unit_price: number;
  category: string;
  totalQuantity: number;
  totalRevenue: number;
}

interface PaymentMethodData {
  method: string;
  total: number;
  count: number;
  [key: string]: string | number;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

const FinanceDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [topProducts, setTopProducts] = useState<Product[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  const fetchAllData = async () => {
    try {
      const [summaryRes, incomeRes, chartRes, productsRes, paymentRes] = await Promise.all([
        apiClient.request<FinancialSummary>("/v1/finance/summary", "GET"),
        apiClient.request<IncomeStatement>("/v1/finance/income-statement", "GET"),
        apiClient.request<ChartData[]>("/v1/finance/revenue-expense-chart", "GET"),
        apiClient.request<Product[]>("/v1/finance/top-products?limit=5", "GET"),
        apiClient.request<PaymentMethodData[]>("/v1/finance/sales-by-payment", "GET"),
      ]);

      if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data);
      if (incomeRes.success && incomeRes.data) setIncomeStatement(incomeRes.data);
      if (chartRes.success && chartRes.data) setChartData(chartRes.data);
      if (productsRes.success && productsRes.data) setTopProducts(productsRes.data);
      if (paymentRes.success && paymentRes.data) setPaymentMethods(paymentRes.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-gray-500 mt-1">Real-time financial insights and analytics</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="income">Income Statement</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary?.cashBalance || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Current liquid assets</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary?.revenue || 0)}</div>
                <p className="text-xs text-green-600 mt-1">
                  {summary?.salesCount || 0} sales transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary?.expenses || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Incl. {formatCurrency(summary?.payrollExpenses || 0)} payroll
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary?.profit || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary?.netMargin.toFixed(1)}% net margin
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue & Expense Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue & Expense Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Expenses"
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Profit"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Additional Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Accounts Receivable</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary?.accountsReceivable || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pending customer payments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Active Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(summary?.activeProducts || 0)}
                </div>
                <p className="text-xs text-yellow-600 mt-1">
                  {summary?.lowStockProducts || 0} low stock items
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Gross Margin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.grossMargin.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">Profitability ratio</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Income Statement Tab */}
        <TabsContent value="income" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Income Statement</CardTitle>
              <p className="text-sm text-muted-foreground">Year to Date Performance</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-semibold">Revenue</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(incomeStatement?.revenue || 0)}
                  </span>
                </div>

                <div className="pl-4">
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="text-muted-foreground">Less: Cost of Goods Sold</span>
                    <span className="text-red-600">
                      ({formatCurrency(incomeStatement?.cogs || 0)})
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center border-b pb-2 bg-gray-50 p-2 rounded">
                  <span className="font-semibold">Gross Profit</span>
                  <span className="font-bold">
                    {formatCurrency(incomeStatement?.grossProfit || 0)}
                  </span>
                </div>

                <div className="pl-4 space-y-1">
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="text-muted-foreground">Operating Expenses</span>
                    <span className="text-red-600">
                      ({formatCurrency(incomeStatement?.operatingExpenses || 0)})
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="text-muted-foreground">Payroll Expenses</span>
                    <span className="text-red-600">
                      ({formatCurrency(incomeStatement?.payrollExpenses || 0)})
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="text-muted-foreground">Taxes</span>
                    <span className="text-red-600">
                      ({formatCurrency(incomeStatement?.taxes || 0)})
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t-2 pt-4 bg-blue-50 p-3 rounded">
                  <span className="font-bold text-lg">Net Income</span>
                  <span className="font-bold text-lg text-blue-600">
                    {formatCurrency(incomeStatement?.netIncome || 0)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t">
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <p className="text-sm text-muted-foreground">Gross Margin</p>
                    <p className="text-2xl font-bold text-green-600">
                      {incomeStatement?.grossMargin.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <p className="text-sm text-muted-foreground">Net Margin</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {incomeStatement?.netMargin.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Monthly Profit Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Profit Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="profit" fill="#3b82f6" name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Sales by Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Sales by Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={paymentMethods}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ method, total }: any) =>
                        `${method}: ${formatCurrency(Number(total))}`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total"
                    >
                      {paymentMethods.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
              <p className="text-sm text-muted-foreground">Best performers by revenue</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-full font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          SKU: {product.sku} | {product.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(product.totalRevenue)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(product.totalQuantity)} units sold
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinanceDashboardPage;
