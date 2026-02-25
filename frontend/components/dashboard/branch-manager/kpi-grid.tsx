import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { BranchMetrics } from "@/lib/dashboard.service";

// ── CVA variant for the icon badge ──────────────────────────────────────────
const iconBadge = cva("flex h-10 w-10 items-center justify-center rounded-full", {
  variants: {
    color: {
      emerald: "bg-emerald-100 text-emerald-700",
      yellow: "bg-yellow-100 text-yellow-700",
      teal: "bg-teal-100 text-teal-700",
      sky: "bg-sky-100 text-sky-700",
    },
  },
  defaultVariants: { color: "emerald" },
});

// ── CVA variant for trend pill ───────────────────────────────────────────────
const trendPill = cva("mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", {
  variants: {
    direction: {
      up: "bg-emerald-50 text-emerald-700",
      down: "bg-red-50 text-red-600",
    },
  },
  defaultVariants: { direction: "up" },
});

interface KpiGridProps {
  metrics: BranchMetrics | null;
  loading: boolean;
}

export function KpiGrid({ metrics, loading }: KpiGridProps) {
  if (loading || !metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-emerald-50" />
        ))}
      </div>
    );
  }

  const kpis = [
    {
      title: "Gross Revenue",
      value: `KES ${metrics.totalRevenue.toLocaleString()}`,
      change: "+12.5%",
      direction: "up" as const,
      icon: DollarSign,
      color: "emerald" as const,
    },
    {
      title: "Transaction Volume",
      value: metrics.totalSales.toLocaleString(),
      change: "+8.2%",
      direction: "up" as const,
      icon: ShoppingCart,
      color: "yellow" as const,
    },
    {
      title: "Customer Count",
      value: metrics.customerCount.toLocaleString(),
      change: "+5.3%",
      direction: "up" as const,
      icon: Users,
      color: "teal" as const,
    },
    {
      title: "Avg Transaction",
      value: `KES ${metrics.averageTransaction.toLocaleString()}`,
      change: "+2.1%",
      direction: "up" as const,
      icon: Activity,
      color: "sky" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const TrendIcon = kpi.direction === "up" ? TrendingUp : TrendingDown;
        return (
          <Card
            key={kpi.title}
            className="rounded-xl border border-emerald-100 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">{kpi.title}</CardTitle>
              <div className={cn(iconBadge({ color: kpi.color }))}>
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-900">{kpi.value}</p>
              <span className={cn(trendPill({ direction: kpi.direction }))}>
                <TrendIcon className="h-3 w-3" />
                {kpi.change} vs last period
              </span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
