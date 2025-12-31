import { DollarSign, ShoppingCart, Users, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BranchMetrics } from "@/lib/dashboard.service";

export function KpiGrid({ metrics, loading }: { metrics: BranchMetrics | null, loading: boolean }) {
  if (loading || !metrics) return <div className="h-24 bg-gray-100 animate-pulse rounded-lg" />;

  const kpis = [
    {
      title: "Total Revenue",
      value: `KES ${metrics.totalRevenue.toLocaleString()}`,
      change: "+12.5%",
      trend: "up",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Total Sales",
      value: metrics.totalSales.toLocaleString(),
      change: "+8.2%",
      trend: "up",
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
        title: "Customer Count",
        value: metrics.customerCount.toLocaleString(),
        change: "+5.3%",
        trend: "up",
        icon: Users,
        color: "text-purple-600",
        bgColor: "bg-purple-50",
    },
    {
        title: "Avg Transaction",
        value: `KES ${metrics.averageTransaction.toLocaleString()}`,
        change: "+2.1%",
        trend: "up",
        icon: TrendingUp,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const TrendIcon = kpi.trend === "up" ? TrendingUp : TrendingDown;
        return (
          <Card key={kpi.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{kpi.title}</CardTitle>
              <div className={`p-2 rounded-full ${kpi.bgColor}`}>
                <Icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{kpi.value}</div>
              <div className={`flex items-center text-sm mt-1 ${kpi.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                <TrendIcon className="h-4 w-4 mr-1" />
                <span>{kpi.change}</span>
                <span className="text-slate-500 ml-1">from last period</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}