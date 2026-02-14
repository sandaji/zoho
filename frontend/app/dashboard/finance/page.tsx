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
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import new API functions
import {
  fetchAllDashboardData,
  formatCurrencyCompact,
} from "./lib/api";

// Import types
import type {
  FinancialSummary,
  ChartData,
  Transaction,
  ExpenseCategory,
  DailySpending,
  SavingsGoal,
} from "./types";

// Import components
import { CreditCardWidget } from "../../../components/finance/credit-card-widget";
import { CashflowChart } from "../../../components/finance/cashflow-chart";
import { ExpenseDonutChart } from "../../../components/finance/expense-donut-chart";
import { RecentTransactions } from "../../../components/finance/recent-transactions";
import { DailyLimitProgress } from "../../../components/finance/daily-limit-progress";
import { SavingPlans } from "../../../components/finance/saving-plans";

interface DashboardState {
  summary: FinancialSummary | null;
  chartData: ChartData[];
  transactions: Transaction[];
  expenseCategories: ExpenseCategory[];
  dailySpending: DailySpending | null;
  savingsGoals: SavingsGoal[];
}

const FinanceDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("Dashboard");

  const [data, setData] = useState<DashboardState>({
    summary: null,
    chartData: [],
    transactions: [],
    expenseCategories: [],
    dailySpending: null,
    savingsGoals: [],
  });

  const loadDashboardData = async () => {
    try {
      setError(null);
      const result = await fetchAllDashboardData();

      setData({
        summary: result.summary || null,
        chartData: result.chartData || [],
        transactions: result.transactions || [],
        expenseCategories: result.expenseCategories || [],
        dailySpending: result.dailySpending || null,
        savingsGoals: result.savingsGoals || [],
      });

      // Log any errors but don't block the UI
      const errors = Object.entries(result.errors).filter(([_, err]) => err !== null);
      if (errors.length > 0) {
        console.warn("Some data failed to load:", result.errors);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Calculate savings (profit)
  const savings = data.summary?.profit || 0;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8f9fa]">
        <div className="text-center">
          <div className="mx-auto h-32 w-32 animate-spin rounded-full border-b-4 border-[#104f38]"></div>
          <p className="mt-4 text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6">
      {/* Header with Navigation Dropdown */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button className="gap-2 bg-[#104f38] hover:bg-[#0d3f2d]">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

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
                  {data.summary ? formatCurrencyCompact(data.summary.revenue) : "—"}
                </div>
                <p className="mt-1 text-xs text-green-600">
                  {data.summary ? `+${data.summary.salesCount} transactions` : "Loading..."}
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
                  {data.summary ? formatCurrencyCompact(data.summary.expenses) : "—"}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {data.summary
                    ? `${((data.summary.expenses / data.summary.revenue) * 100).toFixed(1)}% of revenue`
                    : "Loading..."}
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
                  {data.summary ? formatCurrencyCompact(savings) : "—"}
                </div>
                <p className="mt-1 text-xs text-blue-600">
                  {data.summary ? `${data.summary.netMargin.toFixed(1)}% margin` : "Loading..."}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cashflow Chart */}
          <CashflowChart
            data={data.chartData.map((item) => ({
              name: item.name,
              revenue: item.revenue,
              expenses: item.expenses,
            }))}
          />

          {/* Recent Transactions */}
          <RecentTransactions
            transactions={data.transactions}
            onViewAll={() => setActiveSection("Transactions")}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6 lg:col-span-4">
          {/* Credit Card Widget */}
          <CreditCardWidget
            balance={data.summary?.cashBalance || 0}
            holderName="Business Account"
          />

          {/* Expense Statistics */}
          <ExpenseDonutChart data={data.expenseCategories} />

          {/* Daily Limit */}
          {data.dailySpending && (
            <DailyLimitProgress
              spent={data.dailySpending.spent}
              limit={data.dailySpending.limit}
            />
          )}

          {/* Saving Plans */}
          <SavingPlans
            plans={data.savingsGoals}
            onAddGoal={() => {
              // TODO: Implement add goal modal
              console.log("Add savings goal");
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboardPage;
