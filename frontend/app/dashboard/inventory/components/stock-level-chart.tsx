// app/dashboard/inventory/components/stock-level-chart.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  lastRestocked: string;
  status: "in_stock" | "low_stock" | "out_of_stock";
  branch: string;
}

interface StockLevelChartProps {
  items: InventoryItem[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
        <p className="font-medium text-slate-900 dark:text-slate-100">{label}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Stock: <span className="font-medium">{item.currentStock} {item.unit}</span>
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Min: {item.minStock} | Max: {item.maxStock}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Status: <span className={`font-medium ${
            item.status === 'in_stock' ? 'text-emerald-600' : 
            item.status === 'low_stock' ? 'text-amber-600' : 'text-rose-600'
          }`}>
            {item.status.replace('_', ' ')}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

const getBarColor = (status: string) => {
  switch (status) {
    case "in_stock":
      return "#10b981"; // emerald
    case "low_stock":
      return "#f59e0b"; // amber
    case "out_of_stock":
      return "#ef4444"; // rose
    default:
      return "#6b7280"; // gray
  }
};

export function StockLevelChart({ items }: StockLevelChartProps) {
  const chartData = items.slice(0, 10).map(item => ({
    name: item.itemCode.length > 15 ? item.itemCode.substring(0, 15) + '...' : item.itemCode,
    stock: item.currentStock,
    minStock: item.minStock,
    maxStock: item.maxStock,
    status: item.status,
    fullName: item.itemCode,
    unit: item.unit
  }));

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
      <CardHeader className="pb-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <BarChart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            Stock Levels
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Current stock levels for top 10 items
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              stroke="#64748b"
              fontSize={11}
              className="dark:stroke-slate-400"
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              className="dark:stroke-slate-400"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="stock"
              radius={[4, 4, 0, 0]}
              name="Current Stock"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        {/* Legend */}
        <div className="flex justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-400">In Stock</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-amber-500" />
            <span className="text-slate-600 dark:text-slate-400">Low Stock</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-rose-500" />
            <span className="text-slate-600 dark:text-slate-400">Out of Stock</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}