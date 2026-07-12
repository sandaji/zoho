"use client";

import { useRouter, usePathname } from "next/navigation";
import { frontendEnv } from "@/lib/env";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Building2, Warehouse, Users, Package,
  ShoppingCart, Truck, DollarSign, Wallet, Settings, LogOut,
  Menu, X, BarChart3, Crown, Shield, ChevronDown, ChevronRight,
  ChevronsUpDown, Check, RefreshCw, BookOpen,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  label:        string;
  href:         string;
  icon:         React.ComponentType<{ className?: string }>;
  badge?:       number;
  children?:    NavItem[];
}

interface SwitcherBranch {
  id:   string;
  name: string;
  code: string;
}

// ─── Role-based nav map ────────────────────────────────────────────────────────
// Each role gets a clean, flat list of routes it can see.
// Permissions are the source of truth; role string is only used as a fallback
// for the admin-only Crown section.

function buildNavItems(
  role: string,
  hasPerm: (code: string) => boolean,
  hasAny: (codes: string[]) => boolean,
  stats: { lowStockItems?: number; pendingDeliveries?: number }
): NavItem[] {
  const items: NavItem[] = [];

  // ── 1. Home / Dashboard ──────────────────────────────────────────────────
  if (role === "admin" || role === "super_admin") {
    // Admin gets the Crown section — no generic dashboard link
  } else if (role === "cashier") {
    items.push({ label: "POS", href: "/dashboard/pos", icon: ShoppingCart });
  } else {
    items.push({ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard });
  }

  // ── 2. POS ───────────────────────────────────────────────────────────────
  if (role !== "cashier" && hasAny(["sales.order.create", "sales.order.view_all"])) {
    items.push({ label: "Point of Sale", href: "/dashboard/pos", icon: ShoppingCart });
  }

  // ── 3. Inventory (merged — no duplicate Products entry) ──────────────────
  if (hasAny(["inventory.product.view", "inventory.stock.adjust", "inventory.product.manage"])) {
    items.push({
      label: "Inventory",
      href:  "/dashboard/inventory",
      icon:  Package,
      badge: stats.lowStockItems,
    });
  }

  // ── 4. Purchasing ─────────────────────────────────────────────────────────
  if (hasAny(["procurement.vendor.view", "procurement.order.view", "admin.branch.manage"])) {
    items.push({
      label:    "Purchasing",
      href:     "/dashboard/purchasing",
      icon:     ShoppingCart,
      children: [
        { label: "Vendors",         href: "/dashboard/purchasing/vendors", icon: Users    },
        { label: "Purchase Orders", href: "/dashboard/purchasing/orders",  icon: BookOpen },
      ],
    });
  }

  // ── 5. Fleet & Deliveries ─────────────────────────────────────────────────
  if (hasAny(["sales.order.view_all", "sales.order.manage"]) || role === "driver") {
    items.push({
      label: "Fleet & Deliveries",
      href:  "/dashboard/fleet",
      icon:  Truck,
      badge: stats.pendingDeliveries,
    });
  }

  // ── 6. Employees ─────────────────────────────────────────────────────────
  if (hasAny(["hr.employee.view", "hr.employee.manage"])) {
    items.push({ label: "Employees", href: "/dashboard/employees", icon: Users });
  }

  // ── 7. Finance (with sub-routes) ──────────────────────────────────────────
  if (hasPerm("finance.gl.view")) {
    items.push({
      label:    "Finance",
      href:     "/dashboard/finance",
      icon:     DollarSign,
      children: [
        { label: "Overview",           href: "/dashboard/finance",                icon: LayoutDashboard },
        { label: "General Ledger",     href: "/dashboard/finance/gl",             icon: BookOpen        },
        { label: "Accounts Receivable",href: "/dashboard/finance/ar",             icon: DollarSign      },
        { label: "Accounts Payable",   href: "/dashboard/finance/ap",             icon: Wallet          },
        { label: "Bank & Cash",        href: "/dashboard/finance/bank",           icon: Wallet          },
        { label: "Reconciliation",     href: "/dashboard/finance/reconciliation", icon: RefreshCw       },
      ],
    });
  }

  // ── 8. Payroll ────────────────────────────────────────────────────────────
  if (hasAny(["hr.payroll.view", "hr.payroll.manage"])) {
    items.push({ label: "Payroll", href: "/dashboard/payroll", icon: Wallet });
  }

  // ── 9. Branches (non-admin branch managers) ───────────────────────────────
  if (hasPerm("admin.branch.manage") && role !== "admin" && role !== "super_admin") {
    items.push({ label: "Branches", href: "/dashboard/branches", icon: Building2 });
  }

  // ── 10. Reports ───────────────────────────────────────────────────────────
  if (hasAny(["finance.reports.view", "admin.branch.manage"])) {
    items.push({ label: "Reports", href: "/dashboard/reports", icon: BarChart3 });
  }

  // ── 11. Settings (everyone except pure cashiers) ──────────────────────────
  if (role !== "cashier") {
    items.push({ label: "Settings", href: "/dashboard/settings", icon: Settings });
  }

  return items;
}

// ─── Admin sub-sections ───────────────────────────────────────────────────────

const ADMIN_SECTIONS = [
  { id: "overview",      label: "Overview",      icon: LayoutDashboard },
  { id: "branches",      label: "Branches",      icon: Building2       },
  { id: "warehouses",    label: "Warehouses",     icon: Warehouse       },
  { id: "users",         label: "Users",          icon: Users           },
  { id: "products",      label: "Products",       icon: Package         },
  { id: "sales",         label: "Sales",          icon: ShoppingCart    },
  { id: "deliveries",    label: "Deliveries",     icon: Truck           },
  { id: "finance",       label: "Finance",        icon: DollarSign      },
  { id: "payroll",       label: "Payroll",        icon: Wallet          },
  { id: "roles",         label: "Roles & Perms",  icon: Shield          },
  { id: "credit_notes",  label: "Credit Notes",   icon: RefreshCw       },
];

const ADMIN_GROUPS = [
  { label: "Command Center", ids: ["overview"]                                    },
  { label: "Infrastructure", ids: ["branches", "warehouses"]                     },
  { label: "People",         ids: ["users", "payroll", "roles"]                  },
  { label: "Operations",     ids: ["products", "sales", "deliveries", "finance", "credit_notes"] },
];

// ─── Role display names ───────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin:           "Admin",
  super_admin:     "Super Admin",
  branch_manager:  "Branch Manager",
  manager:         "Manager",
  accountant:      "Accountant",
  hr:              "HR",
  cashier:         "Cashier",
  warehouse_staff: "Warehouse Staff",
  driver:          "Driver",
  procurement:     "Procurement",
  user:            "User",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, logout, switchBranch } = useAuth();
  const { hasPermission, hasAnyPermission } = useHasPermission();

  const [isOpen,      setIsOpen]      = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [adminOpen,   setAdminOpen]   = useState(false);
  const [openChildren, setOpenChildren] = useState<string>("");
  const [stats, setStats] = useState<{ lowStockItems?: number; pendingDeliveries?: number }>({});

  // Branch switcher (admin only)
  const [switcherBranches, setSwitcherBranches] = useState<SwitcherBranch[]>([]);
  const [switcherOpen,     setSwitcherOpen]     = useState(false);
  const [isSwitching,      setIsSwitching]      = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  const isAdminUser  = user?.role === "admin" || user?.role === "super_admin";
  const isAdminRoute = pathname?.startsWith("/dashboard/admin");

  // Auto-open admin dropdown on admin routes
  useEffect(() => { if (isAdminRoute) setAdminOpen(true); }, [isAdminRoute]);

  // Close switcher on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node))
        setSwitcherOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // Fetch branches for admin switcher
  useEffect(() => {
    if (!isAdminUser) return;
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    fetch(`${frontendEnv.NEXT_PUBLIC_API_URL}/v1/branches`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const list = data?.data?.branches ?? data?.data ?? [];
        setSwitcherBranches(list.map((b: any) => ({ id: b.id, name: b.name, code: b.code })));
      })
      .catch(() => {});
  }, [isAdminUser]);

  // Stats polling (admin/manager only)
  useEffect(() => {
    if (!user || !hasPermission("admin.branch.manage")) return;
    let alive = true;
    const poll = async () => {
      const tok = localStorage.getItem("auth_token");
      if (!tok || !alive) return;
      try {
        const res = await fetch(`${frontendEnv.NEXT_PUBLIC_API_URL}/v1/admin/stats`, {
          headers: { Authorization: `Bearer ${tok}` },
        });
        if (res.ok && alive) {
          const d = await res.json();
          setStats(d.data || {});
        }
      } catch {}
    };
    poll();
    const id = setInterval(poll, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, [user]);

  if (!user) return null;

  const navItems = buildNavItems(
    user.role,
    hasPermission,
    hasAnyPermission,
    stats,
  );

  // ── Helpers ───────────────────────────────────────────────────────────────

  const isActive = (href: string): boolean => {
    const base = href.split("?")[0] ?? "";
    if (base === "/dashboard") return pathname === "/dashboard";
    return (pathname ?? "").startsWith(base);
  };

  const activeAdminSection = (() => {
    if (typeof window === "undefined") return "overview";
    return new URLSearchParams(window.location.search).get("section") ?? "overview";
  })();

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const handleBranchSwitch = async (id: string) => {
    if (isSwitching) return;
    setIsSwitching(true);
    try {
      await switchBranch(id);
      setSwitcherOpen(false);
      router.refresh();
    } catch (e) {
      console.error("Branch switch failed:", e);
    } finally {
      setIsSwitching(false);
    }
  };

  // ── Nav item renderer ─────────────────────────────────────────────────────

  const NavLink = ({ item }: { item: NavItem }) => {
    const Icon        = item.icon;
    const active      = isActive(item.href);
    const hasChildren = !!item.children?.length;
    const childOpen   = openChildren === item.href;

    if (hasChildren) {
      return (
        <div>
          <button
            onClick={() => setOpenChildren(childOpen ? "" : item.href)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              active ? "bg-emerald-600/20 text-emerald-400" : "text-slate-400 hover:text-white hover:bg-slate-800",
            )}
            title={isCollapsed ? item.label : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", childOpen && "rotate-180")} />
              </>
            )}
          </button>
          {!isCollapsed && childOpen && (
            <div className="ml-4 mt-1 pl-3 border-l border-slate-800 space-y-0.5">
              {item.children!.map(child => {
                const CIcon = child.icon;
                const ca    = pathname === child.href;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                      ca ? "bg-slate-800 text-white" : "text-slate-500 hover:text-white hover:bg-slate-800",
                    )}
                  >
                    <CIcon className="h-4 w-4 shrink-0" />
                    <span>{child.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        href={item.href}
        onClick={() => setIsOpen(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          active ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800",
        )}
        title={isCollapsed ? item.label : undefined}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
        {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
          <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-semibold">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        )}
      </Link>
    );
  };

  // ── Sidebar body ──────────────────────────────────────────────────────────

  const SidebarBody = () => (
    <div className="flex flex-col h-full">

      {/* Logo + collapse toggle */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 shrink-0">
              <Image src="/logo.svg" alt="Logo" fill className="object-contain" />
            </div>
            <span className="text-sky-400 font-bold text-sm tracking-wider">ZOHO ERP</span>
          </div>
        ) : (
          <div className="relative w-8 h-8 mx-auto shrink-0">
            <Image src="/logo.svg" alt="Logo" fill className="object-contain" />
          </div>
        )}
        <button
          onClick={() => { setIsCollapsed(c => !c); if (!isCollapsed) setAdminOpen(false); }}
          className="hidden lg:flex p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Menu className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* User block */}
      {!isCollapsed ? (
        <div className="px-4 py-3 border-b border-slate-800">
          <p className="text-sm font-semibold text-white truncate">{user.name}</p>
          <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          <span className={cn(
            "mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
            isAdminUser
              ? "bg-yellow-400/15 text-yellow-300 border border-yellow-400/20"
              : "bg-emerald-500/15 text-emerald-400",
          )}>
            {isAdminUser && <Crown className="w-2.5 h-2.5" />}
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
        </div>
      ) : (
        <div className="px-3 py-3 border-b border-slate-800 flex justify-center">
          <div className="w-9 h-9 bg-emerald-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Branch switcher (admin only) */}
      {isAdminUser && switcherBranches.length > 0 && (
        <div ref={switcherRef} className={cn("relative border-b border-slate-800", isCollapsed ? "px-2 py-2" : "px-3 py-2.5")}>
          <button
            onClick={() => setSwitcherOpen(o => !o)}
            disabled={isSwitching}
            className={cn(
              "w-full flex items-center gap-2 rounded-lg text-xs font-medium transition-colors",
              isCollapsed ? "justify-center p-2" : "px-3 py-2",
              "bg-slate-800/60 hover:bg-slate-700 text-slate-300 border border-slate-700/50",
            )}
          >
            <Building2 className={cn("shrink-0 h-4 w-4", isSwitching ? "animate-pulse text-sky-400" : "text-sky-400")} />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left truncate">
                  {isSwitching ? "Switching…" : (user.branch?.name ?? "All Branches")}
                </span>
                <ChevronsUpDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              </>
            )}
          </button>

          {switcherOpen && !isCollapsed && (
            <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-y-auto max-h-52 py-1">
              {[{ id: "", name: "All Branches", code: "" }, ...switcherBranches].map(b => {
                const isCurrent = b.id ? user.branchId === b.id : !user.branchId;
                return (
                  <button
                    key={b.id || "all"}
                    onClick={() => handleBranchSwitch(b.id || "all")}
                    disabled={isSwitching}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors",
                      isCurrent ? "bg-sky-600/20 text-sky-300" : "text-slate-400 hover:bg-slate-700 hover:text-white",
                    )}
                  >
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 text-left truncate">{b.name}</span>
                    {b.code && <span className="font-mono text-[10px] text-slate-500">{b.code}</span>}
                    {isCurrent && <Check className="h-3.5 w-3.5 text-sky-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 scrollbar-hide">

        {/* Admin Crown section */}
        {isAdminUser && (
          <div className="mb-1">
            <button
              onClick={() => {
                if (isCollapsed) { router.push("/dashboard/admin"); return; }
                setAdminOpen(o => !o);
                if (!adminOpen) router.push("/dashboard/admin");
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isAdminRoute
                  ? "bg-yellow-400/15 text-yellow-300 border border-yellow-400/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800",
              )}
              title={isCollapsed ? "Admin Dashboard" : undefined}
            >
              <Crown className={cn("h-5 w-5 shrink-0", isAdminRoute ? "text-yellow-400" : "text-slate-500")} />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">Admin Dashboard</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", adminOpen && "rotate-180")} />
                </>
              )}
            </button>

            {!isCollapsed && adminOpen && (
              <div className="mt-1 ml-4 pl-3 border-l-2 border-yellow-400/15 space-y-3 py-2">
                {ADMIN_GROUPS.map(group => (
                  <div key={group.label}>
                    <p className="px-1 mb-1 text-[9px] font-bold uppercase tracking-widest text-slate-600">
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {ADMIN_SECTIONS.filter(s => group.ids.includes(s.id)).map(section => {
                        const SIcon   = section.icon;
                        const current = isAdminRoute && activeAdminSection === section.id;
                        return (
                          <button
                            key={section.id}
                            onClick={() => { router.push(`/dashboard/admin?section=${section.id}`); setIsOpen(false); }}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
                              current ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-white hover:bg-slate-800",
                            )}
                          >
                            <SIcon className={cn("h-3.5 w-3.5 shrink-0", current ? "text-white" : "text-slate-600")} />
                            <span className="flex-1 text-left">{section.label}</span>
                            {current && <ChevronRight className="h-3 w-3 opacity-60 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Divider between admin Crown and regular nav */}
        {isAdminUser && navItems.length > 0 && (
          <div className="border-t border-slate-800/60 my-2" />
        )}

        {/* Regular nav items */}
        {navItems.map(item => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-800 p-3">
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-red-600/20 transition-colors",
            isCollapsed ? "justify-center" : "",
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between bg-slate-900 px-4 py-3 sticky top-0 z-50 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="relative w-7 h-7">
            <Image src="/logo.svg" alt="Logo" fill className="object-contain" />
          </div>
          <span className="text-sky-400 font-bold text-sm tracking-wider">ZOHO ERP</span>
        </div>
        <button onClick={() => setIsOpen(o => !o)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
          {isOpen ? <X className="w-5 h-5 text-slate-400" /> : <Menu className="w-5 h-5 text-slate-400" />}
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 bg-slate-900 text-white transition-all duration-300 lg:static lg:h-screen border-r border-slate-800",
        isCollapsed ? "w-[68px]" : "w-60",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}>
        <SidebarBody />
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
