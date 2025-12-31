// app/dashboard/inventory/components/quick-actions.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Download,
  Settings
} from "lucide-react";
import { AddProductDialog } from "./add-product-dialog";



const recentActivities = [
  {
    id: 1,
    action: "Laptop Dell XPS 13 restocked",
    user: "John Doe",
    time: "2 hours ago",
    type: "restock" as const,
  },
  {
    id: 2,
    action: "Wireless Mouse stock updated",
    user: "Jane Smith",
    time: "4 hours ago",
    type: "update" as const,
  },
  {
    id: 3,
    action: "Monthly inventory count completed",
    user: "System",
    time: "1 day ago",
    type: "system" as const,
  },
];

const getActivityColor = (type: string) => {
  switch (type) {
    case "restock":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "update":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "system":
      return "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400";
    default:
      return "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400";
  }
};

export function QuickActions({ onProductAdded }: { onProductAdded?: () => void }) {
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  const handleProductAdded = () => {
    setIsAddProductOpen(false);
    onProductAdded?.();
  };

  const actions = [
    {
      id: 1,
      title: "Add New Item",
      icon: Plus,
      description: "Create new inventory item",
      variant: "default" as const,
      onClick: () => setIsAddProductOpen(true),
      color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    },
    {
      id: 2,
      title: "Restock Items",
      icon: ShoppingCart,
      description: "Process inventory restock",
      variant: "outline" as const,
      onClick: () => console.log("Restock Items clicked"),
      color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    },
    {
      id: 3,
      title: "Generate Report",
      icon: BarChart3,
      description: "Create inventory report",
      variant: "outline" as const,
      onClick: () => console.log("Generate Report clicked"),
      color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    },
    {
      id: 4,
      title: "Export Data",
      icon: Download,
      description: "Export to CSV/Excel",
      variant: "outline" as const,
      onClick: () => console.log("Export Data clicked"),
      color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <>
      <AddProductDialog
        open={isAddProductOpen}
        onOpenChange={setIsAddProductOpen}
        onProductAdded={handleProductAdded}
      />
      
      <div className="space-y-6">
      {/* Quick Actions Card */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
        <CardHeader className="pb-4">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              Quick Actions
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Common inventory tasks
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant={action.variant}
                  onClick={action.onClick}
                  className="h-auto py-4 flex flex-col items-center gap-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200"
                >
                  <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 text-center">
                    <span className="text-xs font-medium block">{action.title}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                      {action.description}
                    </span>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities Card */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
        <CardHeader className="pb-4">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              Recent Activities
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Latest inventory updates
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start space-x-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="shrink-0">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <Package className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {activity.action}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${getActivityColor(activity.type)}`}
                    >
                      {activity.type}
                    </Badge>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      by {activity.user}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* View All Button */}
          <Button
            variant="ghost"
            className="w-full mt-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300"
          >
            View All Activities
          </Button>
        </CardContent>
      </Card>

      {/* System Status Card */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
        <CardHeader className="pb-4">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <Settings className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              System Status
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Inventory Sync</span>
              <Badge variant="default" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                Active
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">API Connection</span>
              <Badge variant="default" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                Stable
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Last Backup</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">2 hours ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}