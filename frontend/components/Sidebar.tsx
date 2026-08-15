"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Command,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Search,
  Star,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { NotificationBell } from "@/components/notification-bell";
import { useStoredStringList } from "@/hooks/use-sidebar-preferences";
import { useHasPermission } from "@/hooks/use-permissions";
import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/api-config";
import { frontendEnv } from "@/lib/env";
import {
  ADMIN_NAVIGATION_GROUPS,
  canAccessNavigationItem,
  NAVIGATION_MODULES,
  type NavigationModule,
  type NavigationPage,
  type NavigationStats,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface SwitcherBranch {
  id: string;
  name: string;
  code: string;
}

interface SearchResult {
  id: string;
  label: string;
  href: string;
  type: "product" | "customer";
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  super_admin: "Super Admin",
  branch_manager: "Branch Manager",
  manager: "Manager",
  accountant: "Accountant",
  hr: "HR",
  cashier: "Cashier",
  warehouse_staff: "Warehouse Staff",
  driver: "Driver",
  procurement: "Procurement",
  user: "User",
};

// Workspace is deliberately a preference layer until workspace tenancy is supplied by the API.
const WORKSPACES = ["Default", "Retail", "Manufacturing", "Wholesale", "Hospital", "School", "NGO"] as const;
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";

function isActivePath(pathname: string | null, href: string) {
  const [path, query] = href.split("?");
  if (query) return pathname === path && typeof window !== "undefined" && window.location.search === `?${query}`;
  if (path === "/dashboard") return pathname === path;
  return Boolean(pathname?.startsWith(path));
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, switchBranch } = useAuth();
  const { hasAnyPermission, hasPermission } = useHasPermission();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openModule, setOpenModule] = useState<string | null>(null);
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [stats, setStats] = useState<NavigationStats>({});
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [switcherBranches, setSwitcherBranches] = useState<SwitcherBranch[]>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [workspace, setWorkspace] = useState<(typeof WORKSPACES)[number]>(WORKSPACES[0]);
  const [isOnline, setIsOnline] = useState(true);
  const switcherRef = useRef<HTMLDivElement>(null);

  const favorites = useStoredStringList("zoho.sidebar.favorites");
  const recents = useStoredStringList("zoho.sidebar.recents", 8);
  const pinnedModules = useStoredStringList("zoho.sidebar.pinned-modules");

  const isAdminUser = user?.role === "admin" || user?.role === "super_admin";

  useEffect(() => {
    try {
      const stored = localStorage.getItem("zoho.sidebar.collapsed");
      setIsCollapsed(stored === "true");
      const storedWorkspace = localStorage.getItem("zoho.sidebar.workspace");
      if (WORKSPACES.includes(storedWorkspace as (typeof WORKSPACES)[number])) {
        setWorkspace(storedWorkspace as (typeof WORKSPACES)[number]);
      }
    } catch {
      // Storage can be unavailable in privacy-restricted contexts.
    }
  }, []);

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) setSwitcherOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (!isAdminUser) return;
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    fetch(`${API_BASE_URL}${API_ENDPOINTS.BRANCHES}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const branches = payload?.data?.branches ?? payload?.data ?? [];
        if (Array.isArray(branches)) {
          setSwitcherBranches(branches.map((branch: SwitcherBranch) => ({ id: branch.id, name: branch.name, code: branch.code })));
        }
      })
      .catch(() => undefined);
  }, [isAdminUser]);

  useEffect(() => {
    if (!user || !hasPermission("admin.branch.manage")) return;
    let active = true;
    const loadStats = async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return;
      try {
        const response = await fetch(`${API_BASE_URL}/v1/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
        if (response.ok && active) setStats((await response.json()).data ?? {});
      } catch {
        // The sidebar remains usable when statistics are unavailable.
      }
    };
    void loadStats();
    const interval = window.setInterval(() => void loadStats(), 60_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [hasPermission, user]);

  const visibleModules = useMemo(() => {
    if (!user) return [];
    const visible = NAVIGATION_MODULES.map((module) => ({
      ...module,
      pages: module.pages.filter((page) => canAccessNavigationItem(page, user.role, hasAnyPermission)),
    })).filter((module) => (
      canAccessNavigationItem(module, user.role, hasAnyPermission) && module.pages.length > 0
    ));
    return [...visible].sort((left, right) => Number(pinnedModules.value.includes(right.id)) - Number(pinnedModules.value.includes(left.id)));
  }, [hasAnyPermission, pinnedModules.value, user]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches("input, textarea, [contenteditable='true']");
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsPaletteOpen((open) => !open);
      }
      if (!isTyping && event.ctrlKey && /^[1-3]$/.test(event.key)) {
        const module = visibleModules[Number(event.key) - 1];
        if (module) {
          event.preventDefault();
          router.push(module.pages[0].href);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, visibleModules]);

  const allPages = useMemo(() => visibleModules.flatMap((module) => module.pages.map((page) => ({ ...page, module }))), [visibleModules]);
  const currentPage = useMemo(() => [...allPages].sort((a, b) => b.href.length - a.href.length).find((page) => isActivePath(pathname, page.href)), [allPages, pathname]);
  const favoritePages = allPages.filter((page) => favorites.value.includes(page.href));
  const recentPages = recents.value.map((href) => allPages.find((page) => page.href === href)).filter(Boolean) as Array<NavigationPage & { module: NavigationModule }>;
  const notifications = useMemo(() => [
    stats.lowStockItems ? { label: "Low Stock", detail: `${stats.lowStockItems} item${stats.lowStockItems === 1 ? "" : "s"} need attention`, module: "inventory" } : null,
    stats.pendingDeliveries ? { label: "Pending Deliveries", detail: `${stats.pendingDeliveries} delivery${stats.pendingDeliveries === 1 ? "" : "ies"} awaiting completion`, module: "fleet" } : null,
  ].filter(Boolean) as Array<{ label: string; detail: string; module: string }>, [stats]);

  useEffect(() => {
    if (currentPage) recents.update((items) => [currentPage.href, ...items.filter((item) => item !== currentPage.href)]);
  // Record a page only after permissions have been applied.
  }, [currentPage?.href, recents.update]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = window.setTimeout(async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const requests: Array<{ type: SearchResult["type"]; response: Promise<Response> }> = [];
      if (hasAnyPermission(["inventory.product.view", "inventory.product.manage"])) {
        requests.push({ type: "product", response: fetch(`${API_BASE_URL}${API_ENDPOINTS.PRODUCTS}?search=${encodeURIComponent(query)}&limit=5`, { headers }) });
      }
      if (hasAnyPermission(["sales.order.create", "sales.order.view_all"])) {
        requests.push({ type: "customer", response: fetch(`${API_BASE_URL}${API_ENDPOINTS.CUSTOMERS_SEARCH}?q=${encodeURIComponent(query)}`, { headers }) });
      }
      const responses = await Promise.all(requests.map(async ({ type, response }) => ({ type, response: await response })));
      const results: SearchResult[] = [];
      for (const { type, response } of responses) {
        if (!response.ok) continue;
        const payload = await response.json();
        const data = payload?.data?.products ?? payload?.data ?? [];
        if (!Array.isArray(data)) continue;
        data.slice(0, 5).forEach((item: { id: string; name?: string; productName?: string; sku?: string }) => {
          const label = item.name ?? item.productName;
          if (label) results.push({ id: item.id, label: item.sku ? `${label} (${item.sku})` : label, href: type === "product" ? "/dashboard/inventory" : "/dashboard/crm/customers", type });
        });
      }
      if (active) setSearchResults(results);
    }, 200);
    let active = true;
    return () => { active = false; window.clearTimeout(timeout); };
  }, [hasAnyPermission, searchQuery]);

  const navigate = useCallback((href: string) => {
    router.push(href);
    setIsPaletteOpen(false);
    setIsOpen(false);
    setSearchQuery("");
  }, [router]);

  const toggleCollapsed = () => {
    setIsCollapsed((collapsed) => {
      const next = !collapsed;
      localStorage.setItem("zoho.sidebar.collapsed", String(next));
      return next;
    });
    setOpenModule(null);
  };

  const changeWorkspace = (next: (typeof WORKSPACES)[number]) => {
    setWorkspace(next);
    localStorage.setItem("zoho.sidebar.workspace", next);
  };

  const handleBranchSwitch = async (branchId: string) => {
    if (isSwitching) return;
    setIsSwitching(true);
    try {
      await switchBranch(branchId);
      setSwitcherOpen(false);
      router.refresh();
    } finally {
      setIsSwitching(false);
    }
  };

  if (!user) return null;

  const renderPage = (page: NavigationPage, module: NavigationModule, compact = false) => {
    const Icon = page.icon;
    const active = isActivePath(pathname, page.href);
    const favorite = favorites.value.includes(page.href);
    return (
      <div key={page.href} className="group/page relative">
        <Link
          href={page.href}
          onClick={() => setIsOpen(false)}
          className={cn(
            "relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70",
            active ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:bg-slate-800/80 hover:text-white",
            compact ? "px-3" : "pr-8",
          )}
        >
          {active && <span className={cn("absolute inset-y-1 left-0 w-0.5 rounded-full", module.accent.line)} />}
          <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? module.accent.icon : "text-slate-500")} />
          <span className="flex-1 truncate">{page.label}</span>
        </Link>
        {!compact && <button aria-label={`${favorite ? "Remove" : "Add"} ${page.label} ${favorite ? "from" : "to"} favorites`} onClick={() => favorites.toggle(page.href)} className={cn("absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-0 transition-opacity group-hover/page:opacity-100 focus:opacity-100", favorite && "opacity-100 text-amber-300")}>
          <Star className={cn("h-3 w-3", favorite && "fill-current")} />
        </button>}
      </div>
    );
  };

  const renderModule = (module: NavigationModule) => {
    const Icon = module.icon;
    const active = module.pages.some((page) => isActivePath(pathname, page.href));
    const open = openModule === module.id || active;
    const pinned = pinnedModules.value.includes(module.id);
    const flyout = isCollapsed && hoveredModule === module.id;
    return (
      <div key={module.id} className="relative" onMouseEnter={(event) => { if (isCollapsed) { setHoveredModule(module.id); setFlyoutTop(event.currentTarget.getBoundingClientRect().top); } }} onMouseLeave={() => isCollapsed && setHoveredModule(null)}>
        <button
          onClick={() => isCollapsed ? navigate(module.pages[0].href) : setOpenModule(openModule === module.id ? null : module.id)}
          className={cn("relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70", active ? module.accent.active : "text-slate-300 hover:bg-slate-800 hover:text-white", isCollapsed && "justify-center px-2")}
          title={isCollapsed ? module.label : undefined}
          aria-expanded={!isCollapsed ? open : undefined}
        >
          {active && <span className={cn("absolute inset-y-1.5 left-0 w-0.5 rounded-full", module.accent.line)} />}
          <Icon className={cn("h-5 w-5 shrink-0", active ? module.accent.icon : "text-slate-500")} />
          {!isCollapsed && <><span className="flex-1 text-left truncate">{module.label}</span>{module.summary?.(stats) && <span className={cn("max-w-24 truncate text-[10px] font-medium", module.accent.text)}>{module.summary(stats)}</span>}<ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} /></>}
        </button>
        {!isCollapsed && open && <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-700/70 pl-2">
          {module.pages.map((page) => renderPage(page, module))}
          {module.id === "system" && ADMIN_NAVIGATION_GROUPS.map((group) => <div key={group.label} className="pt-2"><p className="px-2 text-[9px] font-bold uppercase tracking-widest text-slate-600">{group.label}</p>{group.pages.map((page) => renderPage(page, module))}</div>)}
        </div>}
        {flyout && <div className="fixed left-[68px] z-[70] ml-2 min-w-60 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl" style={{ top: flyoutTop }} role="menu" aria-label={`${module.label} menu`}>
          <div className="mb-1 flex items-center gap-2 px-2 py-1.5"><Icon className={cn("h-4 w-4", module.accent.icon)} /><span className="text-sm font-semibold text-white">{module.label}</span></div>
          {module.pages.map((page) => renderPage(page, module, true))}
          {module.id === "system" && ADMIN_NAVIGATION_GROUPS.flatMap((group) => group.pages).map((page) => renderPage(page, module, true))}
        </div>}
        {!isCollapsed && <button aria-label={`${pinned ? "Unpin" : "Pin"} ${module.label}`} onClick={() => pinnedModules.toggle(module.id)} className={cn("absolute right-7 top-2.5 rounded p-1 text-slate-500 opacity-0 transition-opacity hover:text-white focus:opacity-100 group-hover:opacity-100", pinned && "opacity-100 text-amber-300")}><Pin className={cn("h-3 w-3", pinned && "fill-current")} /></button>}
      </div>
    );
  };

  return (
    <>
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2"><Image src="/logo.svg" alt="Zoho ERP" width={28} height={28} /><span className="text-sm font-bold tracking-wider text-sky-300">ZOHO ERP</span></div>
        <button onClick={() => setIsOpen((open) => !open)} className="rounded-lg p-2 text-slate-300 hover:bg-slate-800" aria-label="Toggle navigation">{isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r border-slate-800 bg-slate-900 text-white transition-all duration-200 lg:static", isCollapsed ? "w-[68px]" : "w-72", isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
        <header className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
          {!isCollapsed ? <div className="flex items-center gap-2.5"><Image src="/logo.svg" alt="Zoho ERP" width={32} height={32} /><span className="text-sm font-bold tracking-wider text-sky-300">ZOHO ERP</span></div> : <Image src="/logo.svg" alt="Zoho ERP" width={32} height={32} />}
          <button onClick={toggleCollapsed} className="hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:block" aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>{isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</button>
        </header>

        <div className={cn("border-b border-slate-800", isCollapsed ? "p-3" : "px-4 py-3")}>
          {isCollapsed ? <div title={`${user.name} — ${ROLE_LABELS[user.role] ?? user.role}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold">{user.name.charAt(0).toUpperCase()}</div> : <>
            <p className="truncate text-sm font-semibold text-white">{user.name}</p><p className="truncate text-[11px] text-slate-500">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-1"><span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">{ROLE_LABELS[user.role] ?? user.role}</span><span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">{user.branch?.name ?? "All branches"}</span></div>
            <label className="mt-2 block text-[10px] font-medium uppercase tracking-wider text-slate-500">Workspace<select value={workspace} onChange={(event) => changeWorkspace(event.target.value as (typeof WORKSPACES)[number])} className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 outline-none focus:border-sky-400">{WORKSPACES.map((name) => <option key={name}>{name}</option>)}</select></label>
          </>}
        </div>

        {isAdminUser && switcherBranches.length > 0 && <div ref={switcherRef} className={cn("relative border-b border-slate-800", isCollapsed ? "p-2" : "p-3")}><button onClick={() => setSwitcherOpen((open) => !open)} disabled={isSwitching} className={cn("flex w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 p-2 text-xs text-slate-300 hover:bg-slate-700", isCollapsed && "justify-center")}><Building2 className="h-4 w-4 text-sky-400" />{!isCollapsed && <><span className="flex-1 truncate text-left">{isSwitching ? "Switching…" : user.branch?.name ?? "All Branches"}</span><ChevronsUpDown className="h-3.5 w-3.5" /></>}</button>{switcherOpen && !isCollapsed && <div className="absolute left-3 right-3 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">{switcherBranches.map((branch) => <button key={branch.id} onClick={() => void handleBranchSwitch(branch.id)} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700"><Building2 className="h-3.5 w-3.5" /><span className="flex-1 text-left">{branch.name}</span>{user.branchId === branch.id && <Check className="h-3.5 w-3.5 text-sky-400" />}</button>)}</div>}</div>}

        <div className="border-b border-slate-800 p-3"><button onClick={() => setIsPaletteOpen(true)} className={cn("flex w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs text-slate-400 hover:border-slate-600 hover:text-white", isCollapsed && "justify-center px-2")} aria-label="Open command palette"><Search className="h-4 w-4" />{!isCollapsed && <><span className="flex-1 text-left">Search or run a command</span><kbd className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px]">Ctrl K</kbd></>}</button></div>

        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Main navigation">
          {!isCollapsed && favoritePages.length > 0 && <section className="mb-3"><p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Favorites</p>{favoritePages.map((page) => renderPage(page, page.module))}</section>}
          {!isCollapsed && recentPages.length > 0 && <section className="mb-3"><p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Recent</p>{recentPages.slice(0, 3).map((page) => renderPage(page, page.module))}</section>}
          {(["operations", "reports", "system", "settings"] as const).map((section) => {
            const modules = visibleModules.filter((module) => module.section === section);
            if (!modules.length) return null;
            const label = section === "operations" ? "Business operations" : section === "system" ? "System administration" : section[0].toUpperCase() + section.slice(1);
            return <section key={section} className="mb-3"><p className={cn("mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500", isCollapsed && "sr-only")}>{label}</p>{modules.map(renderModule)}</section>;
          })}
        </nav>

        <footer className="border-t border-slate-800 p-3">
          <div className="flex items-center justify-between px-1 mb-2">
            {!isCollapsed && <span className="text-xs font-semibold text-slate-400">Notifications</span>}
            <NotificationBell />
          </div>
          {!isCollapsed && <div className="mb-2 flex items-center gap-1 px-3 text-[10px] text-slate-500">{isOnline ? <Wifi className="h-3 w-3 text-emerald-400" /> : <WifiOff className="h-3 w-3 text-red-400" />}<span>{isOnline ? "Connected" : "Offline"}</span><span>•</span><span>{frontendEnv.NEXT_PUBLIC_APP_NAME} v{APP_VERSION}</span></div>}
          <button onClick={() => { logout(); router.push("/auth/login"); }} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-red-500/15 hover:text-white", isCollapsed && "justify-center px-2")}><LogOut className="h-4 w-4" />{!isCollapsed && "Logout"}</button>
        </footer>
      </aside>
      {isOpen && <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setIsOpen(false)} />}

      <CommandDialog open={isPaletteOpen} onOpenChange={setIsPaletteOpen} title="Command palette" description="Search pages, products, customers, and actions.">
        <CommandInput value={searchQuery} onValueChange={setSearchQuery} placeholder="Search navigation, products, customers…" />
        <CommandList><CommandEmpty>No matching commands or accessible results.</CommandEmpty>
          <CommandGroup heading="Navigate">{visibleModules.flatMap((module) => module.pages.map((page) => {
            const PageIcon = page.icon;
            return <CommandItem key={page.href} value={`${module.label} ${page.label}`} onSelect={() => navigate(page.href)}><PageIcon className={cn("mr-2 h-4 w-4", module.accent.icon)} />{page.label}<span className="ml-auto text-xs text-slate-500">{module.label}</span></CommandItem>;
          }))}</CommandGroup>
          {(isAdminUser || hasAnyPermission(["sales.order.create", "procurement.order.view"])) && <><CommandSeparator /><CommandGroup heading="Actions">{hasAnyPermission(["sales.order.create", "sales.order.view_all"]) && <CommandItem onSelect={() => navigate("/dashboard/pos/documents/new")}><Command className="mr-2 h-4 w-4" />Create POS document</CommandItem>}{hasAnyPermission(["procurement.order.view", "admin.branch.manage"]) && <CommandItem onSelect={() => navigate("/dashboard/purchasing/orders/new")}><Command className="mr-2 h-4 w-4" />Create purchase order</CommandItem>}{isAdminUser && <CommandItem onSelect={() => { setIsPaletteOpen(false); setSwitcherOpen(true); }}><Building2 className="mr-2 h-4 w-4" />Switch branch</CommandItem>}</CommandGroup></>}
          {searchResults.length > 0 && <><CommandSeparator /><CommandGroup heading="Live search">{searchResults.map((result) => <CommandItem key={`${result.type}-${result.id}`} onSelect={() => navigate(result.href)}><Search className="mr-2 h-4 w-4" />{result.label}<span className="ml-auto text-xs capitalize text-slate-500">{result.type}</span></CommandItem>)}</CommandGroup></>}
        </CommandList>
      </CommandDialog>
    </>
  );
}
