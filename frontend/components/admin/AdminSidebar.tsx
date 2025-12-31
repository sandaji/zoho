/**
 * Admin Dashboard Sidebar
 */

"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Warehouse,
  Users,
  Package,
  ShoppingCart,
  Truck,
  DollarSign,
  Wallet,
} from "lucide-react";

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const sections = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "branches", label: "Branches", icon: Building2 },
  { id: "warehouses", label: "Warehouses", icon: Warehouse },
  { id: "users", label: "Users", icon: Users },
  { id: "products", label: "Products", icon: Package },
  { id: "sales", label: "Sales", icon: ShoppingCart },
  { id: "deliveries", label: "Deliveries", icon: Truck },
  { id: "finance", label: "Finance", icon: DollarSign },
  { id: "payroll", label: "Payroll", icon: Wallet },
];

export function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  return (
    <aside className="w-64 border-r bg-card h-[calc(100vh-4rem)] sticky top-16">
      <nav className="p-4 space-y-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                activeSection === section.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {section.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
