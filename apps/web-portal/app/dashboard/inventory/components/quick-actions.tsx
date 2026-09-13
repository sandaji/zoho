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
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 gap-3">
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
                   
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}