// app/dashboard/inventory/components/category-distribution.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

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

interface CategoryDistributionProps {
  items: InventoryItem[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
        <p className="font-medium text-slate-900 dark:text-slate-100">{data.name}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Items: <span className="font-medium">{data.value}</span>
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Percentage: <span className="font-medium">{data.percentage}%</span>
        </p>
      </div>
    );
  }
  return null;
};

const renderLegend = (props: any) => {
  const { payload } = props;
  return (
    <div className="flex flex-wrap justify-center gap-3 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={`legend-${index}`} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-slate-600 dark:text-slate-300">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export function CategoryDistribution({ items }: CategoryDistributionProps) {
  // Calculate category distribution
  const categoryData = items.reduce((acc: any[], item) => {
    const existingCategory = acc.find(cat => cat.name === item.category);
    if (existingCategory) {
      existingCategory.value += 1;
    } else {
      acc.push({ name: item.category, value: 1 });
    }
    return acc;
  }, []);

  // Calculate percentages
  const totalItems = items.length;
  const categoryDataWithPercentage = categoryData.map(cat => ({
    ...cat,
    percentage: ((cat.value / totalItems) * 100).toFixed(1)
  }));

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
      <CardHeader className="pb-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <PieChart className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            Category Distribution
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Inventory items by category
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {categoryData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryDataWithPercentage}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ payload }) => {
                    if (parseFloat(payload.percentage) > 5) {
                      return `${payload.percentage}%`;
                    }
                    return "";
                  }}
                  outerRadius={80}
                  innerRadius={50}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
                >
                  {categoryDataWithPercentage.map((_entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <Legend content={renderLegend} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
            <PieChart className="h-12 w-12 mb-3 opacity-50" />
            <p>No category data available</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mt-4 text-center">
          <div className="space-y-1 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {categoryData.length}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Categories
            </p>
          </div>
          <div className="space-y-1 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {totalItems}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total Items
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}