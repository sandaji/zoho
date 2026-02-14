"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ChevronDown,
  DollarSign,
  Wallet,
  FileText,
  CreditCard,
  Target,
  TrendingUpIcon,
  Download,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// Import new components
import { CreditCardWidget } from "../../../components/finance/credit-card-widget";
import { CashflowChart } from "../../../components/finance/cashflow-chart";
import { ExpenseDonutChart } from "../../../components/finance/expense-donut-chart";
import { RecentTransactions } from "../../../components/finance/recent-transactions";
import { DailyLimitProgress } from "../../../components/finance/daily-limit-progress";
import { SavingPlans } from "../../../components/finance/saving-plans";

// Types
import type { Transaction, SavingsGoal } from "./types";

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

interface ChartData {
  name: string;
  month: number;
  revenue: number;
  expenses: number;
  profit: number;
}

const FinanceDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [activeSection, setActiveSection] = useState("Dashboard");

  const formatCompact = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: "compact",
    }).format(amount);
  };

  // TODO: Replace with actual expense categories API endpoint
  const mockExpenseCategories = [
    { category: "Operating", amount: summary?.expenses ? summary.expenses * 0.4 : 0, count: 45, percentage: 40, color: "#104f38" },
    { category: "Payroll", amount: summary?.payrollExpenses || 0, count: 12, percentage: 30, color: "#1a6e50" },
    { category: "Marketing", amount: summary?.expenses ? summary.expenses * 0.15 : 0, count: 8, percentage: 15, color: "#2d8a66" },
    { category: "Utilities", amount: summary?.expenses ? summary.expenses * 0.1 : 0, count: 20, percentage: 10, color: "#4da57d" },
    { category: "Other", amount: summary?.expenses ? summary.expenses * 0.1 : 0, count: 15, percentage: 5, color: "#cff07d" },
  ];

  // TODO: Replace with actual transactions API endpoint
  const mockTransactions: Transaction[] = [
    {
      id: "1",
      type: "expense" as const,
      category: "food" as const,
      amount: 12500,
      date: "2026-02-05",
      description: "Restaurant Supplies",
    },
    {
      id: "2",
      type: "income" as const,
      category: "income" as const,
      amount: 45000,
      date: "2026-02-04",
      description: "Customer Payment",
    },
    {
      id: "3",
      type: "expense" as const,
      category: "utilities" as const,
      amount: 8200,
      date: "2026-02-03",
      description: "Electricity Bill",
    },
    {
      id: "4",
      type: "expense" as const,
      category: "shopping" as const,
      amount: 25000,
      date: "2026-02-02",
      description: "Office Supplies",
    },
    {
      id: "5",
      type: "expense" as const,
      category: "internet" as const,
      amount: 5500,
      date: "2026-02-01",
      description: "Internet Service",
    },
  ];

  // TODO: Replace with actual savings goals API endpoint
  const mockSavingPlans: SavingsGoal[] = [
    {
      id: "1",
      name: "Emergency Fund",
      description: "6 months operating expenses",
      targetAmount: 1000000,
      currentAmount: 450000,
      remaining: 550000,
      percentage: 45,
      deadline: "2026-12-31",
      status: "active",
      createdAt: "2026-01-01",
      updatedAt: "2026-02-07",
      color: "bg-blue-500 text-white",
    },
    {
      id: "2",
      name: "Equipment Upgrade",
      description: "New production equipment",
      targetAmount: 500000,
      currentAmount: 280000,
      remaining: 220000,
      percentage: 56,
      deadline: "2026-06-30",
      status: "active",
      createdAt: "2026-01-15",
      updatedAt: "2026-02-07",
      color: "bg-purple-500 text-white",
    },
  ];

  const fetchAllData = async () => {
    try {
      const [summaryRes, chartRes] = await Promise.all([
        apiClient.request<FinancialSummary>("/v1/finance/summary", "GET"),
        apiClient.request<ChartData[]>("/v1/finance/revenue-expense-chart", "GET"),
      ]);

      if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data);
      if (chartRes.success && chartRes.data) setChartData(chartRes.data);
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
      <div className="flex h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-[#104f38]"></div>
      </div>
    );
  }

  // Calculate savings (simplified as profit)
  const savings = summary?.profit || 0;

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6">
      {/* Header with Navigation Dropdown */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Finance</h1>
          
          {/* Navigation Dropdown (replaces sidebar) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <span className="font-medium">{activeSection}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => setActiveSection("Dashboard")}>
                <Wallet className="mr-2 h-4 w-4" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveSection("Payments")}>
                <DollarSign className="mr-2 h-4 w-4" />
                Payments
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveSection("Transactions")}>
                <TrendingUpIcon className="mr-2 h-4 w-4" />
                Transactions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveSection("Invoices")}>
                <FileText className="mr-2 h-4 w-4" />
                Invoices
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveSection("Cards")}>
                <CreditCard className="mr-2 h-4 w-4" />
                Cards
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveSection("Savings")}>
                <Target className="mr-2 h-4 w-4" />
                Savings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button className="bg-[#104f38] hover:bg-[#0d3f2d]">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-8">
          {/* Top Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Income Card */}
            <Card className="border-gray-200 bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Income</CardTitle>
                <div className="rounded-full bg-green-100 p-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCompact(summary?.revenue || 0)}
                </div>
                <p className="mt-1 text-xs text-green-600">
                  +{summary?.salesCount || 0} transactions
                </p>
              </CardContent>
            </Card>

            {/* Expense Card */}
            <Card className="border-gray-200 bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Expense</CardTitle>
                <div className="rounded-full bg-red-100 p-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCompact(summary?.expenses || 0)}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {((summary?.expenses || 0) / (summary?.revenue || 1) * 100).toFixed(1)}% of revenue
                </p>
              </CardContent>
            </Card>

            {/* Savings Card */}
            <Card className="border-gray-200 bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Savings</CardTitle>
                <div className="rounded-full bg-blue-100 p-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCompact(savings)}
                </div>
                <p className="mt-1 text-xs text-blue-600">
                  {summary?.netMargin.toFixed(1)}% margin
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cashflow Chart */}
          <CashflowChart
            data={chartData.map((item) => ({
              name: item.name,
              revenue: item.revenue,
              expenses: item.expenses,
            }))}
          />

          {/* Recent Transactions */}
          <RecentTransactions transactions={mockTransactions} />
        </div>

        {/* Right Column */}
        <div className="space-y-6 lg:col-span-4">
          {/* Credit Card Widget */}
          <CreditCardWidget
            balance={summary?.cashBalance || 0}
            holderName="Business Account"
          />

          {/* Expense Statistics */}
          <ExpenseDonutChart data={mockExpenseCategories} />

          {/* Daily Limit */}
          <DailyLimitProgress
            spent={summary?.expenses ? summary.expenses * 0.15 : 0}
            limit={50000}
          />

          {/* Saving Plans */}
          <SavingPlans plans={mockSavingPlans} />
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboardPage;
