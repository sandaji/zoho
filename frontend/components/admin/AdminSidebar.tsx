/**
 * AdminSidebar – standalone variant (used by external consumers).
 * The admin page now has its own inline sidebar for full layout control.
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
  Shield,
  ChevronRight,
  Crown,
} from "lucide-react";

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  userName?: string;
}

const NAV_GROUPS = [
  {
    label: "Command Center",
    items: [{ id: "overview", label: "Overview", icon: LayoutDashboard }],
  },
  {
    label: "Infrastructure",
    items: [
      { id: "branches",   label: "Branches",   icon: Building2 },
      { id: "warehouses", label: "Warehouses",  icon: Warehouse },
    ],
  },
  {
    label: "People",
    items: [
      { id: "users",   label: "Users",   icon: Users   },
      { id: "payroll", label: "Payroll",  icon: Wallet  },
      { id: "roles",   label: "Roles",    icon: Shield  },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "products",   label: "Products",   icon: Package      },
      { id: "sales",      label: "Sales",       icon: ShoppingCart },
      { id: "deliveries", label: "Deliveries",  icon: Truck        },
      { id: "finance",    label: "Finance",     icon: DollarSign   },
    ],
  },
];

export function AdminSidebar({ activeSection, onSectionChange, userName }: AdminSidebarProps) {
  return (
    <aside className="flex h-full w-60 flex-col bg-emerald-900">
      {/* Identity */}
      <div className="border-b border-emerald-800/40 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-400">
            <Crown className="h-5 w-5 text-emerald-900" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none text-white">Super Admin</p>
            {userName && (
              <p className="mt-0.5 text-[11px] text-emerald-300">{userName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ id, label, icon: Icon }) => {
                const active = activeSection === id;
                return (
                  <button
                    key={id}
                    onClick={() => onSectionChange(id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-emerald-600 text-white"
                        : "text-emerald-200 hover:bg-emerald-800/50 hover:text-white"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-emerald-400")} />
                    <span className="flex-1 text-left">{label}</span>
                    {active && <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-emerald-800/30 px-5 py-4">
        <p className="text-[10px] text-emerald-500">Zoho ERP · Admin Console</p>
      </div>
    </aside>
  );
}
