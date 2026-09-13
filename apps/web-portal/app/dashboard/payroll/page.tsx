"use client";

import { useMemo, useState } from "react";
import { User, TrendingUp, BarChart3, CreditCard, RotateCw } from "lucide-react";
import { StatCard, BarChart, LineChart } from "@/components/ui/chart";
import { PayslipAccordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTable, createColumnHelper, type SortingState } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { tableFeaturesConfig, type AppTableFeatures } from "@/lib/table/table-features";

interface Payroll {
  id: string;
  payroll_no: string;
  employee_id: string;
  employee_name: string;
  department: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  status: "draft" | "processed" | "paid" | "failed";
  period: string;
  paid_date?: string;
}

interface PayrollAnalytics {
  total_employees: number;
  total_cost: number;
  average_salary: number;
  salary_range: {
    min: number;
    max: number;
    median: number;
  };
  department_breakdown: Array<{
    department: string;
    employee_count: number;
    total_cost: number;
    average_salary: number;
  }>;
}

type DepartmentBreakdown = PayrollAnalytics["department_breakdown"][number];

const departmentColumnHelper = createColumnHelper<AppTableFeatures, DepartmentBreakdown>();

// `totalCost` is closed over so the "% of Total" column can be computed per
// row without threading extra props through the row/cell context.
function buildDepartmentColumns(totalCost: number) {
  return departmentColumnHelper.columns([
    departmentColumnHelper.accessor((row) => row.department, {
      id: "department",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Department" />,
      cell: (ctx) => <span className="font-medium text-foreground">{ctx.getValue()}</span>,
      sortFn: "text",
    }),
    departmentColumnHelper.accessor((row) => row.employee_count, {
      id: "employee_count",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Employees" />,
      cell: (ctx) => <span className="text-muted-foreground">{ctx.getValue()} employees</span>,
      sortFn: "alphanumeric",
    }),
    departmentColumnHelper.accessor((row) => row.total_cost, {
      id: "total_cost",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total Cost" />,
      cell: (ctx) => (
        <span className="font-semibold text-foreground">${ctx.getValue().toLocaleString()}</span>
      ),
      sortFn: "alphanumeric",
    }),
    departmentColumnHelper.accessor((row) => row.average_salary, {
      id: "average_salary",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Average Salary" />,
      cell: (ctx) => <span className="text-muted-foreground">${ctx.getValue().toLocaleString()}</span>,
      sortFn: "alphanumeric",
    }),
    departmentColumnHelper.display({
      id: "percent_of_total",
      header: "% of Total",
      enableSorting: false,
      cell: (ctx) => (
        <span className="text-muted-foreground">
          {((ctx.row.original.total_cost / totalCost) * 100).toFixed(1)}%
        </span>
      ),
    }),
  ]);
}

/**
 * Payroll Dashboard - Comprehensive payroll management interface
 */
export default function PayrollDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "payslips" | "analytics">("overview");
  const [departmentSorting, setDepartmentSorting] = useState<SortingState>([]);

  // Mock payroll analytics
  const analytics: PayrollAnalytics = {
    total_employees: 15,
    total_cost: 87500,
    average_salary: 5833,
    salary_range: {
      min: 3500,
      max: 8000,
      median: 5500,
    },
    department_breakdown: [
      {
        department: "Sales",
        employee_count: 5,
        total_cost: 28000,
        average_salary: 5600,
      },
      {
        department: "Engineering",
        employee_count: 6,
        total_cost: 38000,
        average_salary: 6333,
      },
      {
        department: "HR",
        employee_count: 2,
        total_cost: 10000,
        average_salary: 5000,
      },
      {
        department: "Finance",
        employee_count: 2,
        total_cost: 11500,
        average_salary: 5750,
      },
    ],
  };

  // Mock payroll data
  const [payrolls] = useState<Payroll[]>([
    {
      id: "p1",
      payroll_no: "PAY-2025-11-01",
      employee_id: "emp1",
      employee_name: "John Doe",
      department: "Sales",
      base_salary: 5000,
      allowances: 750,
      deductions: 500,
      net_salary: 5250,
      status: "paid",
      period: "November 2025",
      paid_date: "2025-11-05",
    },
    {
      id: "p2",
      payroll_no: "PAY-2025-11-02",
      employee_id: "emp2",
      employee_name: "Jane Smith",
      department: "Engineering",
      base_salary: 6500,
      allowances: 975,
      deductions: 650,
      net_salary: 6825,
      status: "processed",
      period: "November 2025",
    },
    {
      id: "p3",
      payroll_no: "PAY-2025-11-03",
      employee_id: "emp3",
      employee_name: "Bob Johnson",
      department: "Engineering",
      base_salary: 6000,
      allowances: 900,
      deductions: 600,
      net_salary: 6300,
      status: "paid",
      period: "November 2025",
      paid_date: "2025-11-05",
    },
    {
      id: "p4",
      payroll_no: "PAY-2025-11-04",
      employee_id: "emp4",
      employee_name: "Alice Brown",
      department: "HR",
      base_salary: 5000,
      allowances: 750,
      deductions: 500,
      net_salary: 5250,
      status: "failed",
      period: "November 2025",
    },
  ]);

  // Chart data
  const departmentCost = [
    { label: "Sales", value: 28000 },
    { label: "Engineering", value: 38000 },
    { label: "HR", value: 10000 },
    { label: "Finance", value: 11500 },
  ];

  const salaryDistribution = [
    { label: "3-4k", value: 2 },
    { label: "4-5k", value: 5 },
    { label: "5-6k", value: 4 },
    { label: "6-7k", value: 3 },
    { label: "7-8k", value: 1 },
  ];

  const monthlyTrend = [
    { label: "Sep", value: 82000 },
    { label: "Oct", value: 85000 },
    { label: "Nov", value: 87500 },
    { label: "Dec", value: 87500 },
  ];

  // Small, fully client-side dataset (a handful of departments) - sorting is
  // useful, but there's nothing to paginate, so this follows the same
  // pattern as leave-requests-table.tsx: render via getPrePaginatedRowModel()
  // rather than getRowModel(), since the latter would silently truncate to
  // the default page size.
  const departmentColumns = useMemo(
    () => buildDepartmentColumns(analytics.total_cost),
    [analytics.total_cost]
  );
  const departmentTable = useTable({
    features: tableFeaturesConfig,
    data: analytics.department_breakdown,
    columns: departmentColumns,
    onSortingChange: setDepartmentSorting,
    state: { sorting: departmentSorting },
  });

  // Maps each status to a fixed set of Tailwind classes. Building these as
  // template strings (e.g. `bg-${stat.color}-50`) is a common Tailwind trap:
  // the JIT compiler can't see dynamically-built class names at build time,
  // so they get purged and the status boxes render unstyled in production.
  const STATUS_STYLES: Record<string, { box: string; count: string }> = {
    gray: { box: "bg-muted border-border", count: "text-foreground" },
    blue: { box: "bg-blue-50 border-blue-200", count: "text-blue-600" },
    green: { box: "bg-emerald-50 border-emerald-200", count: "text-emerald-600" },
    red: { box: "bg-red-50 border-red-200", count: "text-red-600" },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <h1 className="text-3xl font-bold text-foreground">Payroll Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track and manage employee payroll, salaries, and compensation
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 flex gap-8">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "payslips", label: "Payslips", icon: CreditCard },
            { id: "analytics", label: "Analytics", icon: TrendingUp },
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <IconComponent size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Total Employees"
                value={analytics.total_employees}
                color="blue"
                icon={<User />}
              />
              <StatCard
                label="Total Payroll Cost"
                value={analytics.total_cost}
                color="purple"
                icon={<CreditCard />}
              />
              <StatCard
                label="Average Salary"
                value={analytics.average_salary}
                color="green"
                icon={<TrendingUp />}
              />
              <StatCard
                label="Status Summary"
                value={`${payrolls.filter((p) => p.status === "paid").length}/${payrolls.length} Paid`}
                color="yellow"
                subtext={`${payrolls.filter((p) => p.status === "failed").length} Failed`}
              />
            </div>

            {/* Current Month Status */}
            <div className="bg-card p-6 rounded-lg border border-border mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Current Month Payroll Status
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: "Draft",
                    count: payrolls.filter((p) => p.status === "draft").length,
                    color: "gray",
                  },
                  {
                    label: "Processed",
                    count: payrolls.filter((p) => p.status === "processed").length,
                    color: "blue",
                  },
                  {
                    label: "Paid",
                    count: payrolls.filter((p) => p.status === "paid").length,
                    color: "green",
                  },
                  {
                    label: "Failed",
                    count: payrolls.filter((p) => p.status === "failed").length,
                    color: "red",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`p-4 rounded border ${STATUS_STYLES[stat.color]!.box}`}
                  >
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className={`text-2xl font-bold ${STATUS_STYLES[stat.color]!.count}`}>{stat.count}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Breakdown Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card p-6 rounded-lg border border-border">
                <BarChart
                  data={departmentCost}
                  title="Payroll Cost by Department"
                  colors={["#3b82f6"]}
                />
              </div>

              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Salary Range Analysis</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Minimum</span>
                      <span className="font-semibold">
                        ${analytics.salary_range.min.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${(analytics.salary_range.min / analytics.salary_range.max) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Median</span>
                      <span className="font-semibold">
                        ${analytics.salary_range.median.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full"
                        style={{
                          width: `${(analytics.salary_range.median / analytics.salary_range.max) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Maximum</span>
                      <span className="font-semibold">
                        ${analytics.salary_range.max.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-violet-500 h-2 rounded-full" style={{ width: "100%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAYSLIPS TAB */}
        {activeTab === "payslips" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-foreground">Employee Payslips</h2>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <RotateCw className="mr-2" />
                Export All
              </Button>
            </div>

            <div className="space-y-4">
              {payrolls.map((p) => (
                <PayslipAccordion
                  key={p.id}
                  payroll_no={p.payroll_no}
                  employee_name={p.employee_name}
                  period={p.period}
                  details={{
                    baseSalary: p.base_salary,
                    allowances: p.allowances,
                    deductions: p.deductions,
                    netSalary: p.net_salary,
                    notes: `Department: ${p.department}`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-card p-6 rounded-lg border border-border">
                <LineChart data={monthlyTrend} title="Monthly Payroll Cost Trend" color="#10b981" />
              </div>

              <div className="bg-card p-6 rounded-lg border border-border">
                <BarChart
                  data={salaryDistribution}
                  title="Salary Distribution"
                  colors={["#3b82f6"]}
                />
              </div>
            </div>

            {/* Department Breakdown Table */}
            <div className="bg-card p-6 rounded-lg border border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">Department Analysis</h2>

              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    {departmentTable.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} className="font-semibold text-foreground">
                            {header.isPlaceholder ? null : <departmentTable.FlexRender header={header} />}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {departmentTable.getPrePaginatedRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/50">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            <departmentTable.FlexRender cell={cell} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
