import type { ComponentType } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  Crown,
  DollarSign,
  LayoutDashboard,
  Package,
  RefreshCw,
  Settings,
  ShoppingCart,
  Shield,
  Truck,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";

export type NavigationIcon = ComponentType<{ className?: string }>;

export interface NavigationStats {
  lowStockItems?: number;
  pendingDeliveries?: number;
}

export interface NavigationPage {
  id: string;
  label: string;
  href: string;
  icon: NavigationIcon;
  permissions?: string[];
  roles?: string[];
}

export interface NavigationModule {
  id: string;
  label: string;
  icon: NavigationIcon;
  accent: {
    text: string;
    icon: string;
    active: string;
    line: string;
  };
  section: "operations" | "reports" | "system" | "settings";
  permissions?: string[];
  roles?: string[];
  pages: NavigationPage[];
  summary?: (stats: NavigationStats) => string | undefined;
}

export interface AdminNavigationGroup {
  label: string;
  pages: NavigationPage[];
}

const sharedAccent = (text: string, icon: string, active: string, line: string) => ({ text, icon, active, line });

export const NAVIGATION_MODULES: NavigationModule[] = [
  {
    id: "home",
    label: "Home",
    icon: LayoutDashboard,
    section: "operations",
    accent: sharedAccent("text-slate-200", "text-slate-300", "bg-slate-700 text-white", "bg-slate-300"),
    roles: ["branch_manager", "manager", "accountant", "hr", "warehouse_staff", "driver", "procurement", "user"],
    pages: [{ id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    id: "sales",
    label: "Sales",
    icon: ShoppingCart,
    section: "operations",
    accent: sharedAccent("text-emerald-300", "text-emerald-400", "bg-emerald-500/15 text-emerald-200", "bg-emerald-400"),
    permissions: ["sales.order.create", "sales.order.view_all"],
    pages: [
      { id: "pos", label: "Point of Sale", href: "/dashboard/pos", icon: ShoppingCart },
      { id: "customers", label: "Customers", href: "/dashboard/crm/customers", icon: Users },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    section: "operations",
    accent: sharedAccent("text-sky-300", "text-sky-400", "bg-sky-500/15 text-sky-200", "bg-sky-400"),
    permissions: ["inventory.product.view", "inventory.stock.adjust", "inventory.product.manage"],
    summary: (stats) => stats.lowStockItems ? `${stats.lowStockItems} low stock` : undefined,
    pages: [
      { id: "inventory-overview", label: "Inventory Overview", href: "/dashboard/inventory", icon: Package },
      { id: "products", label: "Products", href: "/dashboard/products", icon: Package, permissions: ["inventory.product.view", "inventory.product.manage"] },
    ],
  },
  {
    id: "procurement",
    label: "Procurement",
    icon: BookOpen,
    section: "operations",
    accent: sharedAccent("text-violet-300", "text-violet-400", "bg-violet-500/15 text-violet-200", "bg-violet-400"),
    permissions: ["procurement.vendor.view", "procurement.order.view", "admin.branch.manage"],
    pages: [
      { id: "purchasing", label: "Purchasing Overview", href: "/dashboard/purchasing", icon: BookOpen },
      { id: "vendors", label: "Vendors", href: "/dashboard/purchasing/vendors", icon: Users, permissions: ["procurement.vendor.view", "admin.branch.manage"] },
      { id: "purchase-orders", label: "Purchase Orders", href: "/dashboard/purchasing/orders", icon: BookOpen, permissions: ["procurement.order.view", "admin.branch.manage"] },
      { id: "purchase-approvals", label: "Approvals", href: "/dashboard/purchasing/approvals", icon: Shield, permissions: ["procurement.order.view", "admin.branch.manage"] },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: DollarSign,
    section: "operations",
    accent: sharedAccent("text-amber-300", "text-amber-400", "bg-amber-400/15 text-amber-200", "bg-amber-400"),
    permissions: ["finance.gl.view"],
    pages: [
      { id: "finance-overview", label: "Finance Overview", href: "/dashboard/finance", icon: LayoutDashboard },
      { id: "general-ledger", label: "General Ledger", href: "/dashboard/finance/gl", icon: BookOpen },
      { id: "accounts-receivable", label: "Accounts Receivable", href: "/dashboard/finance/ar", icon: DollarSign },
      { id: "accounts-payable", label: "Accounts Payable", href: "/dashboard/finance/ap", icon: Wallet },
      { id: "reconciliation", label: "Reconciliation", href: "/dashboard/finance/reconciliation", icon: RefreshCw },
    ],
  },
  {
    id: "human-resources",
    label: "Human Resources",
    icon: Users,
    section: "operations",
    accent: sharedAccent("text-fuchsia-300", "text-fuchsia-400", "bg-fuchsia-500/15 text-fuchsia-200", "bg-fuchsia-400"),
    permissions: ["hr.employee.view", "hr.employee.manage", "hr.payroll.view", "hr.payroll.manage"],
    pages: [
      { id: "employees", label: "Employees", href: "/dashboard/employees", icon: Users, permissions: ["hr.employee.view", "hr.employee.manage"] },
      { id: "hr-overview", label: "HR Overview", href: "/dashboard/hr", icon: Users, permissions: ["hr.employee.view", "hr.employee.manage"] },
      { id: "payroll", label: "Payroll", href: "/dashboard/payroll", icon: Wallet, permissions: ["hr.payroll.view", "hr.payroll.manage"] },
    ],
  },
  {
    id: "fleet",
    label: "Fleet & Logistics",
    icon: Truck,
    section: "operations",
    accent: sharedAccent("text-orange-300", "text-orange-400", "bg-orange-500/15 text-orange-200", "bg-orange-400"),
    permissions: ["sales.order.view_all", "sales.order.manage"],
    roles: ["driver"],
    summary: (stats) => stats.pendingDeliveries ? `${stats.pendingDeliveries} pending deliveries` : undefined,
    pages: [{ id: "fleet-overview", label: "Fleet Overview", href: "/dashboard/fleet", icon: Truck }],
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    section: "reports",
    accent: sharedAccent("text-cyan-300", "text-cyan-400", "bg-cyan-500/15 text-cyan-200", "bg-cyan-400"),
    permissions: ["finance.reports.view", "admin.branch.manage"],
    pages: [{ id: "reports-overview", label: "Reports", href: "/dashboard/reports", icon: BarChart3 }],
  },
  {
    id: "system",
    label: "System Administration",
    icon: Crown,
    section: "system",
    accent: sharedAccent("text-yellow-200", "text-yellow-400", "bg-yellow-400/15 text-yellow-200", "bg-yellow-400"),
    roles: ["admin", "super_admin"],
    pages: [{ id: "admin", label: "Admin Dashboard", href: "/dashboard/admin", icon: Crown }],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    section: "settings",
    accent: sharedAccent("text-slate-300", "text-slate-400", "bg-slate-700 text-white", "bg-slate-400"),
    roles: ["admin", "super_admin", "branch_manager", "manager", "accountant", "hr", "warehouse_staff", "driver", "procurement", "user"],
    pages: [{ id: "settings", label: "Settings", href: "/dashboard/settings", icon: Settings }],
  },
];

export const ADMIN_NAVIGATION_GROUPS: AdminNavigationGroup[] = [
  { label: "System", pages: [{ id: "overview", label: "Overview", href: "/dashboard/admin?section=overview", icon: LayoutDashboard }] },
  { label: "Infrastructure", pages: [
    { id: "branches", label: "Branches", href: "/dashboard/admin?section=branches", icon: Building2 },
    { id: "warehouses", label: "Warehouses", href: "/dashboard/admin?section=warehouses", icon: Warehouse },
  ] },
  { label: "Security & Users", pages: [
    { id: "users", label: "Users", href: "/dashboard/admin?section=users", icon: Users },
    { id: "roles", label: "Roles & Permissions", href: "/dashboard/admin?section=roles", icon: Shield },
  ] },
  { label: "Business Operations", pages: [
    { id: "products", label: "Products", href: "/dashboard/admin?section=products", icon: Package },
    { id: "sales", label: "Sales", href: "/dashboard/admin?section=sales", icon: ShoppingCart },
    { id: "deliveries", label: "Deliveries", href: "/dashboard/admin?section=deliveries", icon: Truck },
  ] },
  { label: "Finance", pages: [
    { id: "finance", label: "Finance", href: "/dashboard/admin?section=finance", icon: DollarSign },
    { id: "payroll", label: "Payroll", href: "/dashboard/admin?section=payroll", icon: Wallet },
    { id: "credit-notes", label: "Credit Notes", href: "/dashboard/admin?section=credit_notes", icon: RefreshCw },
  ] },
];

export function canAccessNavigationItem(
  item: Pick<NavigationModule | NavigationPage, "permissions" | "roles">,
  role: string,
  hasAnyPermission: (permissions: string[]) => boolean,
) {
  return (!item.permissions?.length || hasAnyPermission(item.permissions))
    && (!item.roles?.length || item.roles.includes(role));
}
