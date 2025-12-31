"use client";

import { useState } from "react";
import { MdPerson, MdTrendingUp, MdBarChart, MdPayments, MdRefresh } from "react-icons/md";
import { StatCard, BarChart, LineChart } from "@/components/ui/chart";
import { PayslipAccordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

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

/**
 * Payroll Dashboard - Comprehensive payroll management interface
 */
export default function PayrollDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "payslips" | "analytics">("overview");

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
        <p className="text-gray-600 text-sm mt-1">
          Track and manage employee payroll, salaries, and compensation
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 flex gap-8">
          {[
            { id: "overview", label: "Overview", icon: MdBarChart },
            { id: "payslips", label: "Payslips", icon: MdPayments },
            { id: "analytics", label: "Analytics", icon: MdTrendingUp },
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
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
                icon={<MdPerson />}
              />
              <StatCard
                label="Total Payroll Cost"
                value={analytics.total_cost}
                color="purple"
                icon={<MdPayments />}
              />
              <StatCard
                label="Average Salary"
                value={analytics.average_salary}
                color="green"
                icon={<MdTrendingUp />}
              />
              <StatCard
                label="Status Summary"
                value={`${payrolls.filter((p) => p.status === "paid").length}/${payrolls.length} Paid`}
                color="yellow"
                subtext={`${payrolls.filter((p) => p.status === "failed").length} Failed`}
              />
            </div>

            {/* Current Month Status */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
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
                    className={`bg-${stat.color}-50 p-4 rounded border border-${stat.color}-200`}
                  >
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.count}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Breakdown Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <BarChart
                  data={departmentCost}
                  title="Payroll Cost by Department"
                  colors={["#3b82f6"]}
                />
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Salary Range Analysis</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Minimum</span>
                      <span className="font-semibold">
                        ${analytics.salary_range.min.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
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
                      <span className="text-gray-600">Median</span>
                      <span className="font-semibold">
                        ${analytics.salary_range.median.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${(analytics.salary_range.median / analytics.salary_range.max) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Maximum</span>
                      <span className="font-semibold">
                        ${analytics.salary_range.max.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: "100%" }} />
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
              <h2 className="text-xl font-semibold text-gray-900">Employee Payslips</h2>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <MdRefresh className="mr-2" />
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
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <LineChart data={monthlyTrend} title="Monthly Payroll Cost Trend" color="#10b981" />
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <BarChart
                  data={salaryDistribution}
                  title="Salary Distribution"
                  colors={["#3b82f6"]}
                />
              </div>
            </div>

            {/* Department Breakdown Table */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Department Analysis</h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Department
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Employees</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Total Cost
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Average Salary
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        % of Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.department_breakdown.map((dept) => (
                      <tr
                        key={dept.department}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 font-medium text-gray-900">{dept.department}</td>
                        <td className="py-3 px-4 text-gray-600">{dept.employee_count} employees</td>
                        <td className="py-3 px-4 font-semibold text-gray-900">
                          ${dept.total_cost.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          ${dept.average_salary.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {((dept.total_cost / analytics.total_cost) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
