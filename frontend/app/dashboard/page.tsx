"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useHasPermission } from "@/hooks/use-permissions";
import { getRoleDashboardRoute } from "@/lib/role-routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, Package, Truck, TrendingUp, ShoppingCart, FileText } from "lucide-react";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const { hasPermission } = useHasPermission();
  const router = useRouter();

  // Redirect based on role – only for roles with a dedicated dashboard
  useEffect(() => {
    if (!isLoading && user) {
      const roleDashboard = getRoleDashboardRoute(user.role);
      if (roleDashboard !== "/dashboard") {
        router.replace(roleDashboard);
      }
    }
  }, [user, isLoading, router]);

  // Show redirect loading state
  if (!isLoading && user) {
    const roleDashboard = getRoleDashboardRoute(user.role);
    if (roleDashboard !== "/dashboard") {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
            <p className="font-medium text-primary">Redirecting to your dashboard…</p>
          </div>
        </div>
      );
    }
  }

  // ── Static KPI cards (no backend data on generic dashboard) ──────────────
  const stats = [
    {
      title: "Total Sales",
      value: "KES 125,430",
      icon: BarChart3,
      trend: "+12.5%",
    },
    {
      title: "Inventory Items",
      value: "1,234",
      icon: Package,
      trend: "+5.2%",
    },
    {
      title: "Active Deliveries",
      value: "42",
      icon: Truck,
      trend: "+8.1%",
    },
    {
      title: "Team Members",
      value: "24",
      icon: Users,
      trend: "+2.0%",
    },
  ];

  const quickActions = [
    {
      label: "Create Sales Order",
      icon: ShoppingCart,
      permission: "sales.order.create",
      route: "/dashboard/pos",
    },
    {
      label: "Check Inventory",
      icon: Package,
      permission: "inventory.product.view",
      route: "/dashboard/inventory",
    },
    {
      label: "Track Delivery",
      icon: Truck,
      permission: "sales.order.manage",
      route: "/dashboard/fleet",
    },
    {
      label: "View Reports",
      icon: FileText,
      permission: "finance.report.aging",
      route: "/dashboard/reports",
    },
  ];

  return (
    <div className="p-6">
      <div className="mx-auto max-w-screen-xl space-y-6">
        {/* Header */}
        <div className="rounded-xl border border-border bg-card px-6 py-5 shadow-sm">
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {user?.name}!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's happening with your business today.
          </p>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
                    <TrendingUp className="h-3 w-3" />
                    {stat.trend} from last month
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bottom row */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Recent Activity */}
          <Card className="rounded-xl border border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  {
                    label: "New sales order created",
                    time: "2 hours ago",
                    color: "bg-emerald-500",
                  },
                  { label: "Delivery completed", time: "4 hours ago", color: "bg-emerald-400" },
                  { label: "Inventory updated", time: "6 hours ago", color: "bg-yellow-400" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 border-b border-border pb-3 last:border-0"
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="rounded-xl border border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {quickActions.map((action) => {
                  if (!hasPermission(action.permission)) return null;
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      onClick={() => router.push(action.route)}
                      className="flex w-full items-center gap-3 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground"
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
