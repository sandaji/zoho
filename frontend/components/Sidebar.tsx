"use client";

import { useRouter, usePathname } from "next/navigation";
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

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { hasPermission, hasAnyPermission } = useHasPermission();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [stats, setStats] = useState<Stats>({});

  // Fetch stats for badges
  useEffect(() => {
    if (!user || (!hasPermission('admin.branch.manage') && !hasPermission('hr.employee.view'))) return;

    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token || !isMounted) return;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/admin/stats`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (response.ok && isMounted) {
          const data = await response.json();
          setStats(data.data || {});
          retryCount = 0; // Reset retry count on success
        }
      } catch (error) {
        if (!isMounted) return;
        
        // Only log error if we've exceeded retries to reduce console spam
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.warn(`Failed to fetch stats (attempt ${retryCount}/${MAX_RETRIES}):`, error);
        } else if (retryCount === MAX_RETRIES) {
          console.error("Failed to fetch stats after multiple attempts. Server may be down.");
          retryCount++; // Increment to prevent repeated logging
        }
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Refresh every minute

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  if (!user) return null;

  /**
   * Define comprehensive menu items based on role
   * Each role sees only the modules they have permission to access
   */
  const getMenuItems = (): MenuItem[] => {
    const items: MenuItem[] = [];

    // ========================================
    // DASHBOARD - Permission-specific home page
    // ========================================
    if (hasAnyPermission(['admin.user.manage', 'admin.branch.manage'])) {
      items.push({
        label: "Admin Dashboard",
        href: "/dashboard/admin",
        icon: LayoutDashboard,
      });
    } else if (hasPermission('hr.employee.view')) {
      items.push({
        label: "Management System",
        href: "/dashboard/branch/manager",
        icon: TrendingUp,
      });
    } else if (hasAnyPermission(['inventory.product.view', 'sales.order.view_all', 'finance.gl.view'])) {
      items.push({
        label: "Dashboard",
        href: "/dashboard",
        icon: Home,
      });
    } else if (hasPermission('finance.gl.view')) {
      items.push({
        label: "Finance Dashboard",
        href: "/dashboard/finance",
        icon: DollarSign,
      });
    } else if (hasPermission('hr.employee.view')) {
      items.push({
        label: "HR Dashboard",
        href: "/dashboard/hr",
        icon: LayoutDashboard,
      });
    } else if (hasPermission('sales.order.create')) {
      items.push({
        label: "POS Dashboard",
        href: "/dashboard/pos",
        icon: ShoppingCart,
      });
    } else if (hasPermission('inventory.product.view')) {
      items.push({
        label: "Inventory Dashboard",
        href: "/dashboard/inventory",
        icon: Package,
      });
    } else if (hasPermission('sales.order.view_all')) {
      items.push({
        label: "Deliveries",
        href: "/dashboard/fleet",
        icon: Truck,
      });
    } else {
      items.push({
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      });
    }

    // ========================================
    // SALES MODULES
    // ========================================

    // Point of Sale - Any role that can create orders or view them
    if (hasAnyPermission(['sales.order.create', 'sales.order.view_all'])) {
      items.push({
        label: "Point of Sale",
        href: "/dashboard/pos",
        icon: ShoppingCart,
      });
    }

    // ========================================
    // INVENTORY MODULES
    // ========================================

    // Inventory Management
    if (hasAnyPermission(['inventory.product.view', 'inventory.stock.adjust'])) {
      items.push({
        label: "Inventory",
        href: "/dashboard/inventory",
        icon: Package,
        badge: stats.lowStockItems,
      });
    }

    // Products
    if (hasAnyPermission(['inventory.product.view', 'inventory.product.manage'])) {
      items.push({
        label: "Products",
        href: "/dashboard/products",
        icon: Package2,
      });
    }

    // Warehouse Management
    if (hasAnyPermission(['inventory.warehouse.manage', 'inventory.stock.view'])) {
      items.push({
        label: "Warehouses",
        href: "/dashboard/warehouse",
        icon: Warehouse,
      });
    }

    // ========================================
    // LOGISTICS MODULES
    // ========================================

    // Fleet & Deliveries
    if (hasAnyPermission(['sales.order.view_all', 'sales.order.manage'])) {
      items.push({
        label: "Fleet & Deliveries",
        href: "/dashboard/fleet",
        icon: Truck,
        badge: stats.pendingDeliveries,
      });
    }

    // ========================================
    // PURCHASING MODULES
    // ========================================

    if (hasAnyPermission(['admin.branch.manage', 'purchasing.order.view_all', 'purchasing.vendor.view'])) {
      items.push({
        label: "Purchasing",
        href: "/dashboard/purchasing",
        icon: ShoppingCart,
        children: [
           { label: "Vendors", href: "/dashboard/purchasing/vendors", icon: Users },
           { label: "Purchase Orders", href: "/dashboard/purchasing/orders", icon: BookOpen },
        ]
      });
    }

    // ========================================
    // ORGANIZATION MODULES
    // ========================================

    // Branch Management
    if (hasPermission('admin.branch.manage')) {
      items.push({
        label: "Branches",
        href: "/dashboard/branches",
        icon: Building2,
        badge: stats.totalBranches,
      });
    }

    // Employee Management
    if (hasAnyPermission(['hr.employee.view', 'hr.employee.manage'])) {
      items.push({
        label: "Employees",
        href: "/dashboard/employees",
        icon: Users,
        badge: stats.totalUsers,
      });
    }

    // HR Module
    if (hasAnyPermission(['hr.recruitment.manage', 'hr.performance.manage', 'hr.benefits.manage', 'hr.leave.approve'])) {
      if (hasPermission('hr.recruitment.manage')) {
        items.push({
          label: "Recruitment",
          href: "/dashboard/hr/recruitment",
          icon: Briefcase,
        });
      }
      if (hasPermission('hr.performance.manage')) {
        items.push({
          label: "Performance",
          href: "/dashboard/hr/performance",
          icon: TrendingUp,
        });
      }
      if (hasPermission('hr.benefits.manage')) {
        items.push({
          label: "Benefits",
          href: "/dashboard/hr/benefits",
          icon: Heart,
        });
      }
      if (hasPermission('hr.leave.approve')) {
        items.push({
          label: "Leave Management",
          href: "/dashboard/hr/leave",
          icon: Calendar,
        });
      }
    }

    // ========================================
    // FINANCIAL MODULES
    // ========================================

    // Payroll
    if (hasPermission('hr.payroll.run')) {
      items.push({
        label: "Payroll",
        href: "/dashboard/payroll",
        icon: Wallet,
      });
    }

    // Finance
    if (hasAnyPermission(['finance.gl.view', 'finance.gl.create', 'finance.report.aging'])) {
      const financeChildren: MenuItem[] = [];
      
      if (hasPermission('finance.gl.view')) {
        financeChildren.push({ label: "Overview", href: "/dashboard/finance", icon: LayoutDashboard });
        financeChildren.push({ label: "General Ledger", href: "/dashboard/finance/gl", icon: BookOpen });
        financeChildren.push({ label: "Accounts Receivable", href: "/dashboard/finance/ar", icon: ArrowUpRight });
        financeChildren.push({ label: "Accounts Payable", href: "/dashboard/finance/ap", icon: ArrowDownLeft });
        financeChildren.push({ label: "Bank & Cash", href: "/dashboard/finance/bank", icon: Wallet });
        financeChildren.push({ label: "Reconciliation", href: "/dashboard/finance/reconciliation", icon: RefreshCw });
      }
      
      if (hasPermission('finance.settings.periods')) {
        financeChildren.push({ label: "Settings", href: "/dashboard/finance/settings", icon: Settings });
      }

      items.push({
        label: "Finance",
        href: "/dashboard/finance",
        icon: DollarSign,
        children: financeChildren
      });
    }

    // ========================================
    // ANALYTICS & REPORTING
    // ========================================

    // Reports
    if (hasAnyPermission(['finance.report.aging', 'sales.order.view_all'])) {
      items.push({
        label: "Reports",
        href: "/dashboard/reports",
        icon: BarChart3,
      });
    }

    // ========================================
    // SYSTEM SETTINGS
    // ========================================

    // Settings - Available to all authenticated users
    items.push({
      label: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    });

    return items;
  };

  const menuItems = getMenuItems();

  const handleLogout = async () => {
    try {
      logout();
      // Ensure localStorage is cleared even if logout function misses something
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      
      // Attempt router push first for smooth transition
      router.push("/auth/login");
      
      // Fallback redirect after a short delay if router fails
      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 500);
    } catch (error) {
      console.error("Logout failed:", error);
      // Absolute fallback
      localStorage.clear();
      window.location.href = "/auth/login";
    }
  };

  const toggleMobile = () => setIsOpen(!isOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  /**
   * Check if a menu item is currently active
   * Handles exact matches and prefix matches for nested routes
   */
  const isActive = (href: string) => {
    const baseHref = href.split("?")[0] || "";
    const basePathname = pathname || "";

    // Exact match for specific routes to avoid conflicts
    if (baseHref === "/dashboard/branch/manager") {
      return basePathname === "/dashboard/branch/manager";
    }
    if (baseHref === "/dashboard/admin") {
      return basePathname === "/dashboard/admin" || basePathname.startsWith("/dashboard/admin/");
    }
    if (baseHref === "/dashboard") {
      return basePathname === "/dashboard";
    }

    // Prefix match for other routes
    return basePathname.startsWith(baseHref);
  };

  /**
   * Get display name for user role
   */
  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: "Admin",
      branch_manager: "Branch Manager",
      manager: "MD",
      accountant: "Accountant",
      hr: "HR",
      cashier: "POS MANAGER",
      warehouse_staff: "WH STAFF",
      driver: "Driver",
      user: "User",
    };
    return roleMap[role] || role;
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8">
            <Image
              src="/logo.svg"
              alt="Zoho ERP"
              fill
              className="object-contain"
            />
          </div>
        </div>
        <button
          onClick={toggleMobile}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 bg-slate-900 text-white transition-all duration-300 lg:static lg:h-screen border-r border-slate-800",
          isCollapsed ? "w-20" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-slate-800">
            {!isCollapsed && (
              <div className="flex space-between items-center gap-3">
                <div className="relative w-10 h-10">
                  <Image
                    src="/logo.svg"
                    alt="Zoho ERP"
                    fill
                    className="object-contain"
                  />                 
                 
                </div>
                    <div className="flex text-sky-500"><span>ZOHO ERP</span></div> 
              </div>
            )}
            {isCollapsed && (
              <div className="relative w-10 h-10 mx-auto">
                <Image
                  src="/logo.svg"
                  alt="Zoho ERP"
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <button
              onClick={toggleCollapse}
              className="hidden lg:block p-2 hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              {isCollapsed ? (
                <Menu className="w-4 h-4 text-sky-500" />
              ) : (
                <Menu className="w-4 h-4 text-sky-500" />
              )}
            </button>
          </div>

          {/* User Info Section */}
          {!isCollapsed && (
            <div className="px-6 py-4 border-b border-slate-800">
              <p className="font-medium text-sm truncate">{user.name}</p>
              {/* <p className="text-xs text-slate-400 truncate">{user.email}</p> */}
              <div className="mt-2 inline-block px-2 py-1 bg-emerald-400 text-white rounded text-xs font-medium">
                {getRoleDisplay(user.role)}
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="px-3 py-4 border-b border-slate-800">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold text-sm mx-auto">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          {/* Navigation Menu */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-hide">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const hasChildren = item.children && item.children.length > 0;

              return (
                <div key={item.href} className="space-y-1">
                  <Link
                    href={item.href}
                    onClick={() => !hasChildren && setIsOpen(false)}
                    className={cn(
                      "flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-emerald-500 text-slate-50"
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
                    {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute right-2 top-2 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </Link>

                  {/* Render children if expanded and not collapsed */}
                  {!isCollapsed && hasChildren && active && (
                    <div className="ml-4 pl-4 border-l border-slate-800 space-y-1 pt-1 pb-2">
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

          {/* Logout Button */}
          <div className="border-t border-slate-800 p-4">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className={cn(
                "w-full text-slate-300 hover:text-white hover:bg-red-600/20 hover:border-red-600/50 transition-all duration-200",
                isCollapsed ? "justify-center px-0" : "justify-start"
              )}
            >
              <LogOut className="w-4 h-4" />
              {!isCollapsed && <span className="ml-2">Logout</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
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
