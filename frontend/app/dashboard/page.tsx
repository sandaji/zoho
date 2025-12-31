"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useHasPermission } from "@/hooks/use-permissions";
import { getRoleDashboardRoute } from "@/lib/role-routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MdBarChart, MdPeople, MdInventory2, MdLocalShipping } from "react-icons/md";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const { hasPermission } = useHasPermission();
  const router = useRouter();

  // Redirect based on role (only for roles with specific dashboards)
  // This ensures users don't see the generic dashboard if they have a specialized one
  useEffect(() => {
    if (!isLoading && user) {
      const roleDashboard = getRoleDashboardRoute(user.role);
      
      // Only redirect if the role-specific dashboard is NOT /dashboard
      // This prevents redirect loops for managers who should stay on /dashboard
      if (roleDashboard !== "/dashboard") {
        router.replace(roleDashboard);
      }
    }
  }, [user, isLoading, router]);

  // If user should be redirected, show loading state
  if (!isLoading && user) {
    const roleDashboard = getRoleDashboardRoute(user.role);
    if (roleDashboard !== "/dashboard") {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">Redirecting to your dashboard...</p>
          </div>
        </div>
      );
    }
  }

  const stats = [
    {
      title: "Total Sales",
      value: "ksh 125,430",
      icon: <MdBarChart className="w-8 h-8 text-blue-600" />,
      trend: "+12.5%",
    },
    {
      title: "Inventory Items",
      value: "1,234",
      icon: <MdInventory2 className="w-8 h-8 text-purple-600" />,
      trend: "+5.2%",
    },
    {
      title: "Active Deliveries",
      value: "42",
      icon: <MdLocalShipping className="w-8 h-8 text-orange-600" />,
      trend: "+8.1%",
    },
    {
      title: "Team Members",
      value: "24",
      icon: <MdPeople className="w-8 h-8 text-green-600" />,
      trend: "+2.0%",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Welcome back, {user?.name}!</h1>
        <p className="text-slate-600 mt-2">Here's what's happening with your business today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-green-600 mt-1">{stat.trend} from last month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New sales order created</p>
                  <p className="text-xs text-slate-500">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="w-2 h-2 rounded-full bg-green-600"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Delivery completed</p>
                  <p className="text-xs text-slate-500">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-orange-600"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Inventory updated</p>
                  <p className="text-xs text-slate-500">6 hours ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hasPermission('sales.order.create') && (
                <button 
                  onClick={() => router.push('/dashboard/pos')}
                  className="w-full text-left px-4 py-2 rounded-lg hover:bg-blue-50 text-sm font-medium text-blue-600 border border-blue-200"
                >
                  Create Sales Order
                </button>
              )}
              {hasPermission('inventory.product.view') && (
                <button 
                  onClick={() => router.push('/dashboard/inventory')}
                  className="w-full text-left px-4 py-2 rounded-lg hover:bg-purple-50 text-sm font-medium text-purple-600 border border-purple-200"
                >
                  Check Inventory
                </button>
              )}
              {hasPermission('sales.order.manage') && (
                <button 
                  onClick={() => router.push('/dashboard/fleet')}
                  className="w-full text-left px-4 py-2 rounded-lg hover:bg-green-50 text-sm font-medium text-green-600 border border-green-200"
                >
                  Track Delivery
                </button>
              )}
              {hasPermission('finance.report.aging') && (
                <button 
                  onClick={() => router.push('/dashboard/reports')}
                  className="w-full text-left px-4 py-2 rounded-lg hover:bg-orange-50 text-sm font-medium text-orange-600 border border-orange-200"
                >
                  View Reports
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
