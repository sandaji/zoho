"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  MdAttachMoney,
  MdTrendingUp,
  MdPeople,
  MdWarehouse,
  MdDirectionsCar,
  MdShoppingCart,
  MdPercent,
  MdRefresh,
  MdFileDownload,
  MdSettings,
} from "react-icons/md";
import { StatCard, StatCardGrid } from "@/components/ui/stats";
import { LineChart } from "@/components/ui/chart";
import { QuickActionButtons } from "@/components/ui/quick-action-buttons";
import { API_ENDPOINTS, getApiUrl, getAuthHeaders } from "@/lib/api-config";

interface BranchDashboardData {
  branch_id: string;
  branch_name: string;
  branch_code?: string;
  location?: string;
  manager_name?: string;
  kpis: any;
  sales_metrics: any;
  operations_metrics: any;
  payroll_metrics: any;
  recent_sales: any[];
  recent_deliveries: any[];
  alerts: any[];
}

/**
 * Branch Dashboard Page
 * Displays comprehensive branch KPIs, metrics, and operations overview
 */
export default function BranchDashboard() {
  const params = useParams();
  const branchId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "sales" | "operations" | "payroll">(
    "overview"
  );
  const [dashboard, setDashboard] = useState<BranchDashboardData | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(getApiUrl(API_ENDPOINTS.BRANCH_DASHBOARD(branchId)), {
          headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (data.success) {
          setDashboard(data.data);
        } else {
          console.error("Failed to fetch dashboard:", data.message);
        }
      } catch (error) {
        console.error("Error fetching dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (branchId) {
      fetchDashboard();
    }
  }, [branchId]);

  const quickActions = [
    { label: "Refresh", icon: <MdRefresh size={16} />, onClick: () => window.location.reload() },
    {
      label: "Export Report",
      icon: <MdFileDownload size={16} />,
      onClick: () => alert("Export functionality coming soon"),
    },
    {
      label: "Settings",
      icon: <MdSettings size={16} />,
      onClick: () => alert("Branch settings coming soon"),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading branch dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Failed to load branch dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{dashboard.branch_name}</h1>
              <p className="text-gray-600 mt-1">
                {dashboard.branch_code} • {dashboard.location} • Manager: {dashboard.manager_name}
              </p>
            </div>
            <QuickActionButtons actions={quickActions} />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {dashboard.alerts.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          {dashboard.alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border mb-3 flex items-center justify-between ${
                alert.severity === "critical"
                  ? "bg-red-50 border-red-200"
                  : alert.severity === "warning"
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-blue-50 border-blue-200"
              }`}
            >
              <p className={alert.severity === "warning" ? "text-yellow-700" : "text-blue-700"}>
                {alert.message}
              </p>
              <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                {alert.action}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-8 border-b border-gray-200 mb-8">
          {(["overview", "sales", "operations", "payroll"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-1 font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Key KPIs */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Key Performance Indicators</h2>
              <StatCardGrid cols={4}>
                <StatCard
                  title="Total Revenue"
                  value={dashboard.kpis.total_revenue}
                  icon={<MdAttachMoney />}
                  variant="success"
                  prefix="ksh"
                  trend={{ value: dashboard.kpis.sales_growth_percentage, direction: "up" }}
                />
                <StatCard
                  title="Monthly Sales"
                  value={dashboard.kpis.sales_this_month}
                  icon={<MdShoppingCart />}
                  variant="info"
                  prefix="ksh"
                />
                <StatCard
                  title="Employees"
                  value={dashboard.kpis.active_employees}
                  icon={<MdPeople />}
                  variant="info"
                  subtext={`${dashboard.kpis.total_employees} total`}
                />
                <StatCard
                  title="Profit Margin"
                  value={dashboard.kpis.profit_margin}
                  icon={<MdPercent />}
                  variant="success"
                  suffix="%"
                />
              </StatCardGrid>
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Financial Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Revenue</span>
                    <span className="font-semibold">
                      ksh {dashboard.kpis.total_revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Expenses</span>
                    <span className="font-semibold text-red-600">
                      -ksh {dashboard.kpis.total_expenses.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payroll Cost</span>
                    <span className="font-semibold text-red-600">
                      -ksh {dashboard.kpis.total_payroll.toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-semibold">Net Profit</span>
                    <span className="font-bold text-green-600">
                      ksh {dashboard.kpis.net_profit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Operations Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Inventory Value</span>
                    <span className="font-semibold">
                      ksh {dashboard.kpis.total_inventory_value.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Trucks</span>
                    <span className="font-semibold">{dashboard.kpis.total_trucks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Success Rate</span>
                    <span className="font-semibold text-green-600">
                      {dashboard.kpis.delivery_success_rate}%
                    </span>
                  </div>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-semibold">Pending Deliveries</span>
                    <span className="font-bold">{dashboard.kpis.active_deliveries}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === "sales" && (
          <div className="space-y-8">
            <StatCardGrid cols={3}>
              <StatCard
                title="Total Sales"
                value={dashboard.sales_metrics.total_sales}
                icon={<MdShoppingCart />}
                variant="info"
              />
              <StatCard
                title="Total Revenue"
                value={dashboard.sales_metrics.total_revenue}
                icon={<MdAttachMoney />}
                variant="success"
                prefix="$"
              />
              <StatCard
                title="Avg Order Value"
                value={dashboard.sales_metrics.average_order_value}
                icon={<MdTrendingUp />}
                variant="info"
                prefix="$"
              />
            </StatCardGrid>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Daily Sales Trend</h3>
              <LineChart
                data={dashboard.sales_metrics.daily_sales_trend.map((d: any) => ({
                  label: d.date,
                  value: d.revenue,
                }))}
                title="Revenue Trend (Last 30 Days)"
                height={300}
              />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top Customers</h3>
              <div className="space-y-3">
                {dashboard.sales_metrics.top_customers.map((customer: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{customer.customer_name}</p>
                      <p className="text-sm text-gray-600">{customer.order_count} orders</p>
                    </div>
                    <span className="font-bold">ksh {customer.total_spent.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Operations Tab */}
        {activeTab === "operations" && (
          <div className="space-y-8">
            <StatCardGrid cols={4}>
              <StatCard
                title="Total Employees"
                value={dashboard.operations_metrics.active_employees}
                icon={<MdPeople />}
                variant="info"
                subtext={`${dashboard.operations_metrics.employee_attendance_rate}% attendance`}
              />
              <StatCard
                title="Inventory Value"
                value={dashboard.operations_metrics.total_inventory_value}
                icon={<MdWarehouse />}
                variant="warning"
                prefix="$"
              />
              <StatCard
                title="Active Trucks"
                value={dashboard.operations_metrics.active_trucks}
                icon={<MdDirectionsCar />}
                variant="default"
                subtext={`${dashboard.operations_metrics.utilization_rate}% utilized`}
              />
              <StatCard
                title="Fuel Cost"
                value={dashboard.operations_metrics.fuel_cost_total}
                icon={<MdAttachMoney />}
                variant="danger"
                prefix="$"
              />
            </StatCardGrid>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Inventory Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Items</span>
                    <span className="font-semibold">
                      {dashboard.operations_metrics.total_items_in_stock}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Low Stock Items</span>
                    <span className="font-semibold text-yellow-600">
                      {dashboard.operations_metrics.low_stock_items}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Out of Stock</span>
                    <span className="font-semibold text-red-600">
                      {dashboard.operations_metrics.out_of_stock_items}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Warehouse Capacity</h3>
                <div className="space-y-3">
                  {dashboard.operations_metrics.warehouse_capacity_utilization.map(
                    (wh: any, idx: number) => (
                      <div key={idx}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {wh.warehouse_name}
                          </span>
                          <span className="text-sm font-semibold">
                            {wh.utilization_percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              wh.utilization_percentage > 80
                                ? "bg-red-500"
                                : wh.utilization_percentage > 60
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            }`}
                            style={{ width: `${wh.utilization_percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payroll Tab */}
        {activeTab === "payroll" && (
          <div className="space-y-8">
            <StatCardGrid cols={4}>
              <StatCard
                title="Payroll Cost"
                value={dashboard.payroll_metrics.total_payroll_cost}
                icon={<MdAttachMoney />}
                variant="danger"
                prefix="$"
              />
              <StatCard
                title="Avg Salary"
                value={dashboard.payroll_metrics.average_salary}
                icon={<MdTrendingUp />}
                variant="info"
                prefix="$"
              />
              <StatCard
                title="Paid"
                value={dashboard.payroll_metrics.paid_count}
                icon={<MdPeople />}
                variant="success"
              />
              <StatCard
                title="Pending"
                value={dashboard.payroll_metrics.pending_count}
                icon={<MdPeople />}
                variant="warning"
              />
            </StatCardGrid>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Payroll Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Employees</span>
                  <span className="font-semibold">
                    {dashboard.payroll_metrics.total_employees_on_payroll}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Salary Range</span>
                  <span className="font-semibold">
                    ${dashboard.payroll_metrics.lowest_salary.toLocaleString()} - $
                    {dashboard.payroll_metrics.highest_salary.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Allowances</span>
                  <span className="font-semibold text-green-600">
                    +${dashboard.payroll_metrics.total_allowances.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Deductions</span>
                  <span className="font-semibold text-red-600">
                    -${dashboard.payroll_metrics.total_deductions.toLocaleString()}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-semibold">Net Payroll Cost</span>
                  <span className="font-bold">
                    ${dashboard.payroll_metrics.total_payroll_cost.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
