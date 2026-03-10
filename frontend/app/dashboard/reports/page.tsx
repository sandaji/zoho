'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, TrendingUp, DollarSign, Package } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

import { frontendEnv } from "@/lib/env";

const API_URL = frontendEnv.NEXT_PUBLIC_API_URL;

interface InventoryValueMetric {
  totalValue: string | number;
  totalBatches: number;
  totalQuantity: number;
}

interface MonthlyRevenueMetric {
  revenue: string | number;
  cogs: string | number;
  grossProfit: string | number;
  grossProfitMargin: number;
  orderCount: number;
}

interface HighMarginOrder {
  id: string;
  soNumber: string;
  customerId: string;
  customerName: string;
  totalAmount: string | number;
  cogs: string | number;
  revenue: string | number;
  profitAmount: string | number;
  profitMargin: number;
  dispatchedAt: string;
}

interface FinancialReport {
  inventoryValue: InventoryValueMetric;
  monthlyRevenue: MonthlyRevenueMetric;
  highMarginOrders: HighMarginOrder[];
  generatedAt: string;
}

/**
 * Format currency to KES notation with proper decimals
 */
function formatCurrency(value: string | number): string {
  const numValue =
    typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
  }).format(numValue);
}

/**
 * Format percentage with one decimal place
 */
function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default function FinancialDashboardPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<FinancialReport | null>(null);

  // RBAC Check
  useEffect(() => {
    if (
      user &&
      user.role !== 'admin' &&
      user.role !== 'super_admin'
    ) {
      showToast('error', 'You do not have access to this page');
      router.push('/dashboard');
    }
  }, [user, router, showToast]);

  // Fetch financial data
  useEffect(() => {
    const fetchReport = async () => {
      try {
        if (!token) {
          router.push('/auth/login');
          return;
        }

        const response = await fetch(
          `${API_URL}/v1/reports/financials`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch financial report');
        }

        const result = await response.json();
        setReport(result.data);
      } catch (error) {
        console.error('Error fetching report:', error);
        showToast('error', 'Failed to load financial data');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [token, router, showToast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            No Financial Data Available
          </h1>
          <p className="text-slate-600">
            Complete some sales transactions to view financial metrics.
          </p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const revenueVsCOGSData = [
    {
      name: 'This Month',
      Revenue: parseFloat(
        typeof report.monthlyRevenue.revenue === 'string'
          ? report.monthlyRevenue.revenue
          : report.monthlyRevenue.revenue.toString()
      ),
      COGS: parseFloat(
        typeof report.monthlyRevenue.cogs === 'string'
          ? report.monthlyRevenue.cogs
          : report.monthlyRevenue.cogs.toString()
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Financial Analysis
        </h1>
        <p className="text-slate-600 mt-1">
          Executive dashboard with key financial metrics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Inventory Value Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Inventory Value
            </CardTitle>
            <Package className="w-5 h-5 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(report.inventoryValue.totalValue)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {report.inventoryValue.totalQuantity} units in{' '}
              {report.inventoryValue.totalBatches} batches
            </p>
          </CardContent>
        </Card>

        {/* Revenue Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Month Revenue
            </CardTitle>
            <DollarSign className="w-5 h-5 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(report.monthlyRevenue.revenue)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {report.monthlyRevenue.orderCount} orders
            </p>
          </CardContent>
        </Card>

        {/* Gross Profit Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gross Profit
            </CardTitle>
            <TrendingUp className="w-5 h-5 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(report.monthlyRevenue.grossProfit)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {formatPercentage(
                report.monthlyRevenue.grossProfitMargin
              )}{' '}
              margin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue vs COGS Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue vs Cost of Goods Sold</CardTitle>
          <CardDescription>
            Monthly financial performance comparison
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.monthlyRevenue.revenue === '0' ||
            report.monthlyRevenue.revenue === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500">
              No revenue data available for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueVsCOGSData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  formatter={(value: any) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    color: '#f1f5f9',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="Revenue"
                  fill="#10b981"
                  name="Revenue"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="COGS"
                  fill="#f59e0b"
                  name="Cost of Goods Sold"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* High-Margin Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 High-Margin Orders</CardTitle>
          <CardDescription>
            Recent orders sorted by profitability
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.highMarginOrders.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No orders dispatched yet
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Order Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">COGS</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.highMarginOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.soNumber}
                      </TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(order.revenue)}
                      </TableCell>
                      <TableCell className="text-right text-amber-600">
                        {formatCurrency(order.cogs)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">
                        {formatCurrency(order.profitAmount)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className="inline-block px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-sm">
                          {formatPercentage(order.profitMargin)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-right text-xs text-slate-500">
        Last updated:{' '}
        {new Date(report.generatedAt).toLocaleString('en-KE', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
}
