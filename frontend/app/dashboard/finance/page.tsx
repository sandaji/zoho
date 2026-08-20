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
  Landmark,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Real GL-backed financial summary
import { fetchFinancialSummary, formatCurrencyCompact } from "./lib/api";
import type { FinancialSummary } from "./types";

// Core dashboard components (all backed by real Chart of Accounts / GL data)
import { KPIMetricsPanel } from "../../../components/finance/kpi-metrics-panel";
import { FinancialAlerts } from "../../../components/finance/financial-alerts";
import { PeriodSelector } from "../../../components/finance/period-selector";
import { QuickActions } from "../../../components/finance/quick-actions";
import { ARAgingSummary } from "../../../components/finance/ar-aging-summary";
import { APStatusSummary } from "../../../components/finance/ap-status-summary";
import { BankAccountsSummary } from "../../../components/finance/bank-accounts-summary";
import { PLQuickPreview } from "../../../components/finance/pl-quick-preview";
import { TaxSummary } from "../../../components/finance/tax-summary";
import { ReconciliationStatus } from "../../../components/finance/reconciliation-status";
import { PeriodTrends } from "../../../components/finance/period-trends";
import { TopCustomersVendors } from "../../../components/finance/top-customers-vendors";

const FinanceDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [summary, setSummary] = useState<FinancialSummary | null>(null);

  const loadDashboardData = async () => {
    try {
      setError(null);
      const result = await fetchFinancialSummary();

      if (result.success) {
        setSummary(result.data || null);
      } else {
        console.warn("Failed to load financial summary:", result.error);
        setError(result.error?.message || "Failed to load financial summary.");
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

  const netAR = (summary?.accountsReceivable || 0) - (summary?.accountsPayable || 0);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-32 w-32 animate-spin rounded-full border-b-4 border-primary"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header with Navigation Dropdown */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">Finance</h1>

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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:w-48">
            <PeriodSelector />
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
            <Button className="gap-2 bg-primary hover:bg-primary/90">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Executive Summary Strip - real GL data via /v1/finance/summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {/* Revenue */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Revenue</CardTitle>
            <div className="rounded-full bg-success/10 p-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {summary ? formatCurrencyCompact(summary.revenue) : "—"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary ? `${summary.salesCount} sales` : "Loading..."}
            </p>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Expenses</CardTitle>
            <div className="rounded-full bg-destructive/10 p-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {summary ? formatCurrencyCompact(summary.expenses) : "—"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary && summary.revenue > 0
                ? `${((summary.expenses / summary.revenue) * 100).toFixed(1)}% of revenue`
                : "Loading..."}
            </p>
          </CardContent>
        </Card>

        {/* Net Income */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Net Income</CardTitle>
            <div className="rounded-full bg-info/10 p-1.5">
              <DollarSign className="h-3.5 w-3.5 text-info" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {summary ? formatCurrencyCompact(summary.profit) : "—"}
            </div>
            <p className="mt-1 text-xs text-info">
              {summary ? `${summary.netMargin.toFixed(1)}% margin` : "Loading..."}
            </p>
          </CardContent>
        </Card>

        {/* Cash Position */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Cash Position</CardTitle>
            <div className="rounded-full bg-primary/10 p-1.5">
              <Landmark className="h-3.5 w-3.5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {summary ? formatCurrencyCompact(summary.cashBalance) : "—"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Across bank accounts</p>
          </CardContent>
        </Card>

        {/* AR Outstanding */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">AR Outstanding</CardTitle>
            <div className="rounded-full bg-warning/10 p-1.5">
              <Receipt className="h-3.5 w-3.5 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {summary ? formatCurrencyCompact(summary.accountsReceivable) : "—"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Owed to you</p>
          </CardContent>
        </Card>

        {/* AP Outstanding */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">AP Outstanding</CardTitle>
            <div className="rounded-full bg-secondary p-1.5">
              <FileText className="h-3.5 w-3.5 text-secondary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {summary ? formatCurrencyCompact(summary.accountsPayable) : "—"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary ? `Net ${netAR >= 0 ? "+" : ""}${formatCurrencyCompact(netAR)}` : "Loading..."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Metrics Panel */}
      <div className="mb-6">
        <KPIMetricsPanel />
      </div>

      {/* Alerts & Quick Actions Row */}
      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FinancialAlerts maxAlerts={4} onViewAll={() => setActiveSection("Dashboard")} />
        </div>
        <QuickActions />
      </div>

      {/* AR / AP Aging Detail Row */}
      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        <ARAgingSummary />
        <APStatusSummary />
      </div>

      {/* Bank Accounts & P&L Row */}
      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        <BankAccountsSummary />
        <PLQuickPreview />
      </div>

      {/* Tax & Reconciliation Row */}
      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        <TaxSummary />
        <ReconciliationStatus />
      </div>

      {/* Period Trends & Top Customers/Vendors Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PeriodTrends />
        <TopCustomersVendors />
      </div>
    </div>
  );
};

export default FinanceDashboardPage;
