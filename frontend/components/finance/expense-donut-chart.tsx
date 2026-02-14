"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { ExpenseCategory } from "../../app/dashboard/finance/types";
import { formatCurrency, formatCurrencyCompact } from "../../app/dashboard/finance/lib/api";

interface ExpenseDonutChartProps {
  data: ExpenseCategory[];
}

const DEFAULT_COLORS = ["#104f38", "#1a6e50", "#2d8a66", "#4da57d", "#cff07d"];

export function ExpenseDonutChart({ data }: ExpenseDonutChartProps) {
  if (data.length === 0) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Expense Statistics
          </CardTitle>
          <p className="text-sm text-gray-500">Breakdown by category</p>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">No expense data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalExpenses = data.reduce((sum, item) => sum + item.amount, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg">
          <p className="mb-1 text-sm font-semibold text-gray-900">{data.category}</p>
          <p className="text-sm text-gray-600">{formatCurrency(data.amount)}</p>
          <p className="text-xs text-gray-500">{data.percentage.toFixed(1)}% of total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Expense Statistics
        </CardTitle>
        <p className="text-sm text-gray-500">Breakdown by category</p>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={2}
                dataKey="amount"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center Text */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrencyCompact(totalExpenses)}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 space-y-2">
          {data.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg bg-gray-50 p-2"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor:
                      item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
                  }}
                />
                <span className="text-sm text-gray-700">{item.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrencyCompact(item.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
