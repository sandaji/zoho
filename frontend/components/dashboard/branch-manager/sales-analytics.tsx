import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { SalesData } from "@/lib/dashboard.service";

const categoryData = [
  { name: "Electronics", value: 35, color: "#0088FE" },
  { name: "Beverages", value: 25, color: "#00C49F" },
  { name: "Fitness", value: 20, color: "#FFBB28" },
  { name: "Home", value: 15, color: "#FF8042" },
  { name: "Other", value: 5, color: "#8884D8" },
];

export function SalesAnalytics({ salesData, timeRange, loading }: { salesData: SalesData[], timeRange: string, loading: boolean }) {
  if (loading) return <div className="h-80 bg-gray-100 animate-pulse rounded-lg" />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Line Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Sales Trend</CardTitle>
          <CardDescription>Performance over {timeRange}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip formatter={(value) => [`KES ${Number(value).toLocaleString()}`, "Revenue"]} />
                <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pie Chart */}
      <Card>
        <CardHeader><CardTitle>Sales by Category</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                  {categoryData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart */}
      <Card>
        <CardHeader><CardTitle>Transaction Volume</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}