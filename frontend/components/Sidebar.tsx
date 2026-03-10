"use client";

import { useRouter, usePathname } from "next/navigation";
import { frontendEnv } from "@/lib/env";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState, useEffect } from "react";
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
  Settings,
  LogOut,
  Menu,
  X,
  Package2,
  BarChart3,
  TrendingUp,
  Home,
  Briefcase,
  Calendar,
  Heart,
  BookOpen,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Crown,
  Shield,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions?: string[];
  badge?: number;
  children?: MenuItem[];
}

interface Stats {
  totalBranches?: number;
  totalWarehouses?: number;
  totalUsers?: number;
  totalProducts?: number;
  pendingDeliveries?: number;
  lowStockItems?: number;
}

// ── Admin sub-sections: rendered as a grouped dropdown in the sidebar ────────
const ADMIN_SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, description: "System snapshot" },
  { id: "branches", label: "Branches", icon: Building2, description: "Locations" },
  { id: "warehouses", label: "Warehouses", icon: Warehouse, description: "Storage" },
  { id: "users", label: "Users", icon: Users, description: "Staff" },
  { id: "products", label: "Products", icon: Package, description: "Catalog" },
  { id: "sales", label: "Sales", icon: ShoppingCart, description: "Orders" },
  { id: "deliveries", label: "Deliveries", icon: Truck, description: "Fleet" },
  { id: "finance", label: "Finance", icon: DollarSign, description: "Ledger" },
  { id: "payroll", label: "Payroll", icon: Wallet, description: "Salaries" },
  { id: "roles", label: "Roles & Perms", icon: Shield, description: "Access" },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { hasPermission, hasAnyPermission } = useHasPermission();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [stats, setStats] = useState<Stats>({});
  // Track which admin sub-section is active (for the dropdown items)
  const [adminOpen, setAdminOpen] = useState(false);

  const isAdminRoute = pathname?.startsWith("/dashboard/admin");

  // Auto-open admin dropdown if on an admin route
  useEffect(() => {
    if (isAdminRoute) setAdminOpen(true);
  }, [isAdminRoute]);

  // ── Stats fetch (unchanged) ────────────────────────────────────────────────
  useEffect(() => {
    if (!user || (!hasPermission("admin.branch.manage") && !hasPermission("hr.employee.view"))) return;

    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token || !isMounted) return;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(
          `${frontendEnv.NEXT_PUBLIC_API_URL}/v1/admin/stats`,
          { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }
        );

        clearTimeout(timeoutId);

        if (response.ok && isMounted) {
          const data = await response.json();
          setStats(data.data || {});
          retryCount = 0;
        }
      } catch (error) {
        if (!isMounted) return;
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.warn(`Failed to fetch stats (attempt ${retryCount}/${MAX_RETRIES}):`, error);
        } else if (retryCount === MAX_RETRIES) {
          console.error("Failed to fetch stats after multiple attempts.");
          retryCount++;
        }
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [user]);

  if (!user) return null;

  const isAdminUser = hasAnyPermission(["admin.user.manage", "admin.branch.manage"]);

  // ── Menu items (unchanged logic) ──────────────────────────────────────────
  const getMenuItems = (): MenuItem[] => {
    const items: MenuItem[] = [];
    const isCashier = user?.role === "cashier";

    if (!isCashier) {
      if (isAdminUser) {
        // Admin dashboard entry point — the dropdown handles sub-navigation
        items.push({ label: "Admin Dashboard", href: "/dashboard/admin", icon: Crown });
      } else if (hasPermission("hr.employee.view")) {
        items.push({ label: "Management System", href: "/dashboard/branch/manager", icon: TrendingUp });
      } else if (hasAnyPermission(["inventory.product.view", "sales.order.view_all", "finance.gl.view"])) {
        items.push({ label: "Dashboard", href: "/dashboard", icon: Home });
      } else if (hasPermission("finance.gl.view")) {
        items.push({ label: "Finance Dashboard", href: "/dashboard/finance", icon: DollarSign });
      } else if (hasPermission("hr.employee.view")) {
        items.push({ label: "HR Dashboard", href: "/dashboard/hr", icon: LayoutDashboard });
      } else if (hasPermission("sales.order.create")) {
        items.push({ label: "POS Dashboard", href: "/dashboard/pos", icon: ShoppingCart });
      } else if (hasPermission("inventory.product.view")) {
        items.push({ label: "Inventory Dashboard", href: "/dashboard/inventory", icon: Package });
      } else if (hasPermission("sales.order.view_all")) {
        items.push({ label: "Deliveries", href: "/dashboard/fleet", icon: Truck });
      } else {
        items.push({ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard });
      }
    }

    if (hasAnyPermission(["sales.order.create", "sales.order.view_all"])) {
      items.push({ label: "Point of Sale", href: "/dashboard/pos", icon: ShoppingCart });
    }
    if (hasAnyPermission(["inventory.product.view", "inventory.stock.adjust"])) {
      items.push({ label: "Inventory", href: "/dashboard/inventory", icon: Package, badge: stats.lowStockItems });
    }
    if (hasAnyPermission(["inventory.product.view", "inventory.product.manage"])) {
      items.push({ label: "Products", href: "/dashboard/products", icon: Package2 });
    }
    if (hasAnyPermission(["inventory.warehouse.manage", "inventory.stock.view"])) {
      items.push({ label: "Warehouses", href: "/dashboard/warehouse", icon: Warehouse });
    }
    if (hasAnyPermission(["sales.order.view_all", "sales.order.manage"])) {
      items.push({ label: "Fleet & Deliveries", href: "/dashboard/fleet", icon: Truck, badge: stats.pendingDeliveries });
    }
    if (hasAnyPermission(["admin.branch.manage", "purchasing.order.view_all", "purchasing.vendor.view"])) {
      items.push({
        label: "Purchasing",
        href: "/dashboard/purchasing",
        icon: ShoppingCart,
        children: [
          { label: "Vendors", href: "/dashboard/purchasing/vendors", icon: Users },
          { label: "Purchase Orders", href: "/dashboard/purchasing/orders", icon: BookOpen },
        ],
      });
    }
    if (hasPermission("admin.branch.manage")) {
      items.push({ label: "Branches", href: "/dashboard/branches", icon: Building2, badge: stats.totalBranches });
    }
    if (hasAnyPermission(["hr.employee.view", "hr.employee.manage"])) {
      items.push({ label: "Employees", href: "/dashboard/employees", icon: Users, badge: stats.totalUsers });
    }
    if (hasPermission("hr.recruitment.manage")) {
      items.push({ label: "Recruitment", href: "/dashboard/hr/recruitment", icon: Briefcase });
    }
    if (hasPermission("hr.performance.manage")) {
      items.push({ label: "Performance", href: "/dashboard/hr/performance", icon: TrendingUp });
    }
    if (hasPermission("hr.benefits.manage")) {
      items.push({ label: "Benefits", href: "/dashboard/hr/benefits", icon: Heart });
    }
    if (hasPermission("hr.leave.approve")) {
      items.push({ label: "Leave Management", href: "/dashboard/hr/leave", icon: Calendar });
    }
    if (hasPermission("hr.payroll.run")) {
      items.push({ label: "Payroll", href: "/dashboard/payroll", icon: Wallet });
    }
    if (hasPermission("finance.gl.view")) {
      const financeChildren: MenuItem[] = [];
      if (hasPermission("finance.gl.view")) {
        financeChildren.push({ label: "Overview", href: "/dashboard/finance", icon: LayoutDashboard });
        financeChildren.push({ label: "General Ledger", href: "/dashboard/finance/gl", icon: BookOpen });
        financeChildren.push({ label: "Accounts Receivable", href: "/dashboard/finance/ar", icon: ArrowUpRight });
        financeChildren.push({ label: "Accounts Payable", href: "/dashboard/finance/ap", icon: ArrowDownLeft });
        financeChildren.push({ label: "Bank & Cash", href: "/dashboard/finance/bank", icon: Wallet });
        financeChildren.push({ label: "Reconciliation", href: "/dashboard/finance/reconciliation", icon: RefreshCw });
      }
      if (hasPermission("finance.settings.periods")) {
        financeChildren.push({ label: "Settings", href: "/dashboard/finance/settings", icon: Settings });
      }
      items.push({ label: "Finance", href: "/dashboard/finance", icon: DollarSign, children: financeChildren });
    }
    if (
      user?.role === "admin" ||
      user?.role === "super_admin" ||
      hasPermission("finance.report.aging")
    ) {
      items.push({ label: "Reports & Analytics", href: "/dashboard/reports", icon: BarChart3 });
    }
    if (!isCashier) {
      items.push({ label: "Settings", href: "/dashboard/settings", icon: Settings });
    }

    return items;
  };

  const menuItems = getMenuItems();

  const handleLogout = async () => {
    try {
      logout();
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      router.push("/auth/login");
      setTimeout(() => { window.location.href = "/auth/login"; }, 500);
    } catch {
      localStorage.clear();
      window.location.href = "/auth/login";
    }
  };

  const toggleMobile = () => setIsOpen(!isOpen);
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) setAdminOpen(false); // close dropdown when collapsing
  };

  const isActive = (href: string) => {
    const baseHref = href.split("?")[0] || "";
    const basePathname = pathname || "";
    if (baseHref === "/dashboard/branch/manager") return basePathname === "/dashboard/branch/manager";
    if (baseHref === "/dashboard/admin") return basePathname === "/dashboard/admin" || basePathname.startsWith("/dashboard/admin");
    if (baseHref === "/dashboard") return basePathname === "/dashboard";
    return basePathname.startsWith(baseHref);
  };

  // Which admin section query param is currently active
  const activeAdminSection = (() => {
    if (!isAdminRoute) return "";
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("section") || "overview";
    }
    return "overview";
  })();

  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: "Admin", super_admin: "Super Admin", branch_manager: "Branch Manager",
      manager: "MD", accountant: "Accountant", hr: "HR", cashier: "POS MANAGER",
      warehouse_staff: "WH STAFF", driver: "Driver", user: "User",
    };
    return roleMap[role] || role;
  };

  // ── Shared sidebar body (used for both desktop and mobile) ────────────────
  const SidebarBody = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9">
              <Image src="/logo.svg" alt="Zoho ERP" fill className="object-contain" />
            </div>
            <span className="text-sky-400 font-bold tracking-wide text-sm">ZOHO ERP</span>
          </div>
        )}
        {isCollapsed && (
          <div className="relative w-9 h-9 mx-auto">
            <Image src="/logo.svg" alt="Zoho ERP" fill className="object-contain" />
          </div>
        )}
        <button
          onClick={toggleCollapse}
          className="hidden lg:block p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-4 h-4 text-sky-400" />
        </button>
      </div>

      {/* User info */}
      {!isCollapsed ? (
        <div className="px-5 py-3.5 border-b border-slate-800">
          <p className="font-semibold text-sm text-white truncate">{user.name}</p>
          <div className={cn(
            "mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold",
            isAdminUser
              ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/30"
              : "bg-emerald-500/20 text-emerald-300"
          )}>
            {isAdminUser && <Crown className="w-3 h-3" />}
            {getRoleDisplay(user.role)}
          </div>
        </div>
      ) : (
        <div className="px-3 py-3.5 border-b border-slate-800">
          <div className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center font-bold text-sm mx-auto text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5 scrollbar-hide">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const hasChildren = item.children && item.children.length > 0;

          // ── ADMIN DASHBOARD: special expandable group ──────────────────
          if (item.href === "/dashboard/admin" && isAdminUser) {
            return (
              <div key="admin-group">
                {/* Admin header row */}
                <button
                  onClick={() => {
                    if (isCollapsed) {
                      router.push("/dashboard/admin");
                    } else {
                      setAdminOpen((prev) => !prev);
                      if (!adminOpen) router.push("/dashboard/admin");
                    }
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isAdminRoute
                      ? "bg-yellow-400/15 text-yellow-300 border border-yellow-400/20"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                  title={isCollapsed ? "Admin Dashboard" : undefined}
                >
                  <div className="flex items-center gap-3">
                    <Crown className={cn(
                      "h-5 w-5 shrink-0",
                      isAdminRoute ? "text-yellow-400" : "text-slate-400"
                    )} />
                    {!isCollapsed && <span>Admin Dashboard</span>}
                  </div>
                  {!isCollapsed && (
                    <ChevronDown className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-200",
                      adminOpen ? "rotate-180" : "",
                      isAdminRoute ? "text-yellow-400" : "text-slate-500"
                    )} />
                  )}
                </button>

                {/* Admin sub-section list */}
                {!isCollapsed && adminOpen && (
                  <div className="mt-1 ml-3 border-l-2 border-yellow-400/20 pl-3 space-y-0.5 pb-2">
                    {/* Group labels */}
                    {[
                      {
                        groupLabel: "Command Center",
                        sections: ["overview"],
                      },
                      {
                        groupLabel: "Infrastructure",
                        sections: ["branches", "warehouses"],
                      },
                      {
                        groupLabel: "People",
                        sections: ["users", "payroll", "roles"],
                      },
                      {
                        groupLabel: "Operations",
                        sections: ["products", "sales", "deliveries", "finance"],
                      },
                    ].map(({ groupLabel, sections }) => (
                      <div key={groupLabel} className="pt-2">
                        <p className="px-2 mb-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                          {groupLabel}
                        </p>
                        {ADMIN_SECTIONS.filter((s) => sections.includes(s.id)).map((section) => {
                          const SIcon = section.icon;
                          const sectionActive = isAdminRoute && activeAdminSection === section.id;
                          return (
                            <button
                              key={section.id}
                              onClick={() => {
                                router.push(`/dashboard/admin?section=${section.id}`);
                                setIsOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-xs font-medium transition-all duration-150",
                                sectionActive
                                  ? "bg-emerald-600 text-white"
                                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
                              )}
                            >
                              <SIcon className={cn(
                                "h-3.5 w-3.5 shrink-0",
                                sectionActive ? "text-white" : "text-slate-500"
                              )} />
                              <span className="flex-1 text-left">{section.label}</span>
                              {sectionActive && <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // ── Regular items with optional children ───────────────────────
          return (
            <div key={`${item.label}-${item.href}`} className="space-y-0.5">
              <Link
                href={item.href}
                onClick={() => !hasChildren && setIsOpen(false)}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-emerald-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full shrink-0 font-semibold">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>

              {/* Children */}
              {!isCollapsed && hasChildren && active && (
                <div className="ml-4 pl-3 border-l border-slate-800 space-y-0.5 pt-1 pb-2">
                  {item.children?.map((child) => {
                    const ChildIcon = child.icon;
                    const childActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200",
                          childActive
                            ? "bg-slate-800 text-white"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        )}
                      >
                        <ChildIcon className="h-4 w-4 shrink-0" />
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-800 p-3">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className={cn(
            "w-full text-slate-400 hover:text-white hover:bg-red-600/20 transition-all duration-200",
            isCollapsed ? "justify-center px-0" : "justify-start"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3 sticky top-0 z-50 shadow-lg border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="relative w-7 h-7">
            <Image src="/logo.svg" alt="Zoho ERP" fill className="object-contain" />
          </div>
          <span className="text-sky-400 font-bold text-sm tracking-wide">ZOHO ERP</span>
        </div>
        <button
          onClick={toggleMobile}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 bg-slate-900 text-white transition-all duration-300 lg:static lg:h-screen border-r border-slate-800",
          isCollapsed ? "w-[72px]" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <SidebarBody />
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
          aria-label="Close menu"
        />
      )}
    </>
  );
}
