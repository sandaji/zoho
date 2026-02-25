import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SalesData } from "@/lib/dashboard.service";

// Payment-type proxy data (static until payment-type API is available)
const paymentData = [
  { name: "Cash",   value: 38, color: "#059669" /* emerald-600 */ },
  { name: "M-Pesa", value: 32, color: "#d97706" /* yellow-600  */ },
  { name: "Card",   value: 20, color: "#0d9488" /* teal-600    */ },
  { name: "Credit", value: 10, color: "#6ee7b7" /* emerald-300 */ },
];

interface SalesAnalyticsProps {
  salesData: SalesData[];
  timeRange: string;
  loading: boolean;
}

// Custom tooltip for the area chart
function AreaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-emerald-100 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-emerald-800">{label}</p>
      <p className="text-emerald-600">
        KES {Number(payload[0].value).toLocaleString()}
      </p>
    </div>
  );
}

export function SalesAnalytics({ salesData, timeRange, loading }: SalesAnalyticsProps) {
  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="h-72 animate-pulse rounded-xl bg-emerald-50 lg:col-span-8" />
        <div className="h-72 animate-pulse rounded-xl bg-emerald-50 lg:col-span-4" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* ── Row 3 Left: Area Chart (8 cols) ─────────────────────────── */}
      <Card className="rounded-xl border border-emerald-100 bg-white shadow-sm lg:col-span-8">
        <CardHeader>
          <CardTitle className="text-emerald-900">Sales Trend</CardTitle>
          <CardDescription className="text-emerald-500 capitalize">
            Performance over {timeRange}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                <XAxis
                  dataKey="date"
                  stroke="#6ee7b7"
                  tick={{ fill: "#065f46", fontSize: 11 }}
                />
                <YAxis
                  stroke="#6ee7b7"
                  tick={{ fill: "#065f46", fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<AreaTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fill="url(#salesGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Row 3 Right: Donut Chart (4 cols) ────────────────────────── */}
      <Card className="rounded-xl border border-emerald-100 bg-white shadow-sm lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-emerald-900">Payment Types</CardTitle>
          <CardDescription className="text-emerald-500">By transaction share</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value}%`, name]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #d1fae5",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            {paymentData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-emerald-700">
                  {d.name}{" "}
                  <span className="font-semibold text-emerald-900">{d.value}%</span>
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
