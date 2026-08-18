"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronsUpDown,
  HelpCircle,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Plus,
  Search,
  Settings,
  Star,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-500/15 text-purple-300",
  super_admin: "bg-amber-500/15 text-amber-300",
  branch_manager: "bg-blue-500/15 text-blue-300",
  manager: "bg-indigo-500/15 text-indigo-300",
  accountant: "bg-emerald-500/15 text-emerald-300",
  hr: "bg-pink-500/15 text-pink-300",
  cashier: "bg-cyan-500/15 text-cyan-300",
  warehouse_staff: "bg-orange-500/15 text-orange-300",
  driver: "bg-yellow-500/15 text-yellow-300",
  procurement: "bg-violet-500/15 text-violet-300",
  user: "bg-slate-500/15 text-slate-300",
};


const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";

function isActivePath(pathname: string | null, href: string) {
  const [path, query] = href.split("?");
  if (query) {
    return (
      pathname === path && typeof window !== "undefined" && window.location.search === `?${query}`
    );
  }
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
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [stats, setStats] = useState<NavigationStats>({});
  const [switcherBranches, setSwitcherBranches] = useState<SwitcherBranch[]>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  const switcherRef = useRef<HTMLDivElement>(null);

  const favorites = useStoredStringList("zoho.sidebar.favorites");
  const recents = useStoredStringList("zoho.sidebar.recents", 8);
  const pinnedModules = useStoredStringList("zoho.sidebar.pinned-modules");

  const isAdminUser = user?.role === "admin" || user?.role === "super_admin";


  // Online / offline status
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

  // Close branch switcher on outside click
  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  // Load branches for admins
  useEffect(() => {
    if (!isAdminUser) return;
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    fetch(`${API_BASE_URL}${API_ENDPOINTS.BRANCHES}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const branches = payload?.data?.branches ?? payload?.data ?? [];
        if (Array.isArray(branches)) {
          setSwitcherBranches(
            branches.map((branch: SwitcherBranch) => ({
              id: branch.id,
              name: branch.name,
              code: branch.code,
            }))
          );
        }
      })
      .catch(() => undefined);
  }, [isAdminUser]);

  // Load navigation stats
  useEffect(() => {
    if (!user || !hasPermission("admin.branch.manage")) return;

    let active = true;
    const loadStats = async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return;
      try {
        const response = await fetch(`${API_BASE_URL}/v1/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok && active) {
          setStats((await response.json()).data ?? {});
        }
      } catch {
        // Sidebar remains usable when statistics are unavailable.
      }
    };

    void loadStats();
    const interval = window.setInterval(() => void loadStats(), 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [hasPermission, user]);

  const visibleModules = useMemo(() => {
    if (!user) return [];

    const visible = NAVIGATION_MODULES.map((module) => ({
      ...module,
      pages: module.pages.filter((page) =>
        canAccessNavigationItem(page, user.role, hasAnyPermission)
      ),
    })).filter(
      (module) =>
        canAccessNavigationItem(module, user.role, hasAnyPermission) && module.pages.length > 0
    );

    return [...visible].sort(
      (left, right) =>
        Number(pinnedModules.value.includes(right.id)) -
        Number(pinnedModules.value.includes(left.id))
    );
  }, [hasAnyPermission, pinnedModules.value, user]);

  // Keyboard shortcuts
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

  const allPages = useMemo(
    () => visibleModules.flatMap((module) => module.pages.map((page) => ({ ...page, module }))),
    [visibleModules]
  );

  const currentPage = useMemo(
    () =>
      [...allPages]
        .sort((a, b) => b.href.length - a.href.length)
        .find((page) => isActivePath(pathname, page.href)),
    [allPages, pathname]
  );

  const favoritePages = allPages.filter((page) => favorites.value.includes(page.href));

  const recentPages = recents.value
    .map((href) => allPages.find((page) => page.href === href))
    .filter(Boolean) as Array<NavigationPage & { module: NavigationModule }>;

  // Track recent pages
  useEffect(() => {
    if (currentPage) {
      recents.update((items) => [
        currentPage.href,
        ...items.filter((item) => item !== currentPage.href),
      ]);
    }
  }, [currentPage?.href, recents.update]);

  // Live search
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const requests: Array<{ type: SearchResult["type"]; response: Promise<Response> }> = [];

      if (hasAnyPermission(["inventory.product.view", "inventory.product.manage"])) {
        requests.push({
          type: "product",
          response: fetch(
            `${API_BASE_URL}${API_ENDPOINTS.PRODUCTS}?search=${encodeURIComponent(query)}&limit=5`,
            { headers }
          ),
        });
      }

      if (hasAnyPermission(["sales.order.create", "sales.order.view_all"])) {
        requests.push({
          type: "customer",
          response: fetch(
            `${API_BASE_URL}${API_ENDPOINTS.CUSTOMERS_SEARCH}?q=${encodeURIComponent(query)}`,
            { headers }
          ),
        });
      }

      const responses = await Promise.all(
        requests.map(async ({ type, response }) => ({ type, response: await response }))
      );

      const results: SearchResult[] = [];
      for (const { type, response } of responses) {
        if (!response.ok) continue;
        const payload = await response.json();
        const data = payload?.data?.products ?? payload?.data ?? [];
        if (!Array.isArray(data)) continue;

        data
          .slice(0, 5)
          .forEach((item: { id: string; name?: string; productName?: string; sku?: string }) => {
            const label = item.name ?? item.productName;
            if (label) {
              results.push({
                id: item.id,
                label: item.sku ? `${label} (${item.sku})` : label,
                href: type === "product" ? "/dashboard/inventory" : "/dashboard/crm/customers",
                type,
              });
            }
          });
      }

      if (active) setSearchResults(results);
    }, 200);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [hasAnyPermission, searchQuery]);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      setIsPaletteOpen(false);
      setIsOpen(false);
      setSearchQuery("");
    },
    [router]
  );

  const toggleCollapsed = () => {
    setIsCollapsed((collapsed) => {
      const next = !collapsed;
      localStorage.setItem("zoho.sidebar.collapsed", String(next));
      return next;
    });
    setOpenModule(null);
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
            "relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium outline-none transition-all duration-200",
            "hover:bg-accent hover:text-accent-foreground",
            active ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground",
            compact ? "px-3" : "pr-8"
          )}
        >
          {active && (
            <span
              className={cn(
                "absolute inset-y-1 left-0 w-0.5 rounded-full",
                module.accent?.line || "bg-primary"
              )}
            />
          )}
          <Icon
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-colors",
              active ? module.accent?.icon || "text-primary" : "text-muted-foreground/60"
            )}
          />
          <span className="flex-1 truncate">{page.label}</span>
          {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
        </Link>

        {!compact && (
          <button
            type="button"
            aria-label={`${favorite ? "Remove" : "Add"} ${page.label} ${favorite ? "from" : "to"} favorites`}
            onClick={() => favorites.toggle(page.href)}
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-0 transition-all hover:bg-accent",
              "group-hover/page:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              favorite && "opacity-100 text-amber-500"
            )}
          >
            <Star className={cn("h-3 w-3 transition-all", favorite && "fill-current")} />
          </button>
        )}
      </div>
    );
  };

  const renderModule = (module: NavigationModule) => {
    const Icon = module.icon;
    const active = module.pages.some((page) => isActivePath(pathname, page.href));
    const open = openModule === module.id || active;
    const pinned = pinnedModules.value.includes(module.id);

    return (
      <div key={module.id} className="group relative">
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() =>
                  isCollapsed
                    ? navigate(module.pages[0].href)
                    : setOpenModule(openModule === module.id ? null : module.id)
                }
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-all duration-200",
                  "hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "bg-accent/50 text-accent-foreground" : "text-muted-foreground",
                  isCollapsed && "justify-center px-2"
                )}
                aria-expanded={!isCollapsed ? open : undefined}
              >
                {active && (
                  <span
                    className={cn(
                      "absolute inset-y-1.5 left-0 w-0.5 rounded-full",
                      module.accent?.line || "bg-primary"
                    )}
                  />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    active ? module.accent?.icon || "text-primary" : "text-muted-foreground/60"
                  )}
                />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 truncate text-left">{module.label}</span>
                    {module.summary?.(stats) && (
                      <Badge variant="secondary" className="text-[10px] font-medium">
                        {module.summary(stats)}
                      </Badge>
                    )}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200",
                        open && "rotate-180"
                      )}
                    />
                  </>
                )}
              </button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" className="font-medium">
                {module.label}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {!isCollapsed && open && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
            {module.pages.map((page) => renderPage(page, module))}
            {module.id === "system" &&
              ADMIN_NAVIGATION_GROUPS.map((group) => (
                <div key={group.label} className="pt-2">
                  <p className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    {group.label}
                  </p>
                  {group.pages.map((page) => renderPage(page, module))}
                </div>
              ))}
          </div>
        )}

        {!isCollapsed && (
          <button
            type="button"
            aria-label={`${pinned ? "Unpin" : "Pin"} ${module.label}`}
            onClick={() => pinnedModules.toggle(module.id)}
            className={cn(
              "absolute right-2 top-2.5 rounded p-1 opacity-0 transition-all hover:bg-accent",
              "group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              pinned && "opacity-100"
            )}
          >
            <Pin className={cn("h-3 w-3 transition-all", pinned && "fill-current text-primary")} />
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b bg-background px-4 py-3 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen((open) => !open)}
          className="rounded-lg"
          aria-label="Toggle navigation"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r bg-background transition-all duration-300 lg:static",
          isCollapsed ? "w-[68px]" : "w-72",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b px-1 py-[4px]">
          {isAdminUser && switcherBranches.length > 0 && (
            <div ref={switcherRef} className={cn("border-b", isCollapsed ? "p-2" : "p-3")}>
              <DropdownMenu open={switcherOpen} onOpenChange={setSwitcherOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size={isCollapsed ? "icon" : "default"}
                    className={cn("w-full justify-start text-xs", isCollapsed && "px-2")}
                    disabled={isSwitching}
                  >
                    <Building2 className={cn("h-4 w-4", isCollapsed ? "mr-0" : "mr-2")} />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 truncate text-left">
                          {isSwitching ? "Switching…" : (user.branch?.name ?? "All Branches")}
                        </span>
                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Switch Branch</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {switcherBranches.map((branch) => (
                    <DropdownMenuItem
                      key={branch.id}
                      onClick={() => void handleBranchSwitch(branch.id)}
                      className="flex items-center gap-2"
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="flex-1">{branch.name}</span>
                      {user.branchId === branch.id && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="hidden h-8 w-8 lg:flex"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </header>

        {/* Branch Switcher */}

        {/* Command Palette Trigger */}
        <div className="border-b p-3">
          <Button
            variant="outline"
            size={isCollapsed ? "icon" : "default"}
            className={cn(
              "w-full justify-start text-xs text-muted-foreground",
              isCollapsed && "px-2"
            )}
            onClick={() => setIsPaletteOpen(true)}
            aria-label="Open command palette"
          >
            <Search className={cn("h-4 w-4", isCollapsed ? "mr-0" : "mr-2")} />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">Search or run a command</span>
                <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
              </>
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-3">
          <nav className="space-y-4" aria-label="Main navigation">
            {!isCollapsed && favoritePages.length > 0 && (
              <section>
                <p className="mb-1.5 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Favorites
                </p>
                {favoritePages.map((page) => renderPage(page, page.module))}
              </section>
            )}

            {!isCollapsed && recentPages.length > 0 && (
              <section>
                <p className="mb-1.5 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Recent
                </p>
                {recentPages.slice(0, 3).map((page) => renderPage(page, page.module))}
              </section>
            )}

            {(["operations", "reports", "system", "settings"] as const).map((section) => {
              const modules = visibleModules.filter((module) => module.section === section);
              if (!modules.length) return null;

              const label =
                section === "operations"
                  ? "Operations"
                  : section === "system"
                    ? "System"
                    : section[0].toUpperCase() + section.slice(1);

              return (
                <section key={section}>
                  {!isCollapsed && (
                    <p className="mb-1.5 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                      {label}
                    </p>
                  )}
                  <div className="space-y-0.5">{modules.map(renderModule)}</div>
                </section>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        {/* Footer */}
        <footer className="space-y-3 border-t p-3">
          {/* Compact User Profile */}
          {!isCollapsed ? (
            <div className="flex items-center gap-3 px-1">
              <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary/10 text-sm text-primary">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn("px-1.5 py-0 text-[10px]", ROLE_COLORS[user.role] || "bg-muted")}
                  >
                    {ROLE_LABELS[user.role] ?? user.role}
                  </Badge>
                  <span className="truncate text-[10px] text-muted-foreground">
                    {user.branch?.name ?? "All branches"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center">
                    <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                      <AvatarFallback className="bg-primary/10 text-sm text-primary">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[user.role] ?? user.role} · {user.branch?.name ?? "All branches"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Notifications */}
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <span className="text-xs font-medium text-muted-foreground">Notifications</span>
            )}
            <NotificationBell />
          </div>

          {/* Status */}
          {!isCollapsed && (
            <div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
              {isOnline ? (
                <Wifi className="h-3 w-3 text-emerald-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
              <span>{isOnline ? "Connected" : "Offline"}</span>
              <Separator orientation="vertical" className="h-3" />
              <span>{frontendEnv.NEXT_PUBLIC_APP_NAME}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1">
            {!isCollapsed && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 justify-start text-xs text-muted-foreground"
                  onClick={() => setShowSettingsDialog(true)}
                >
                  <Settings className="mr-2 h-3.5 w-3.5" />
                  Settings
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowSettingsDialog(true)}
                  aria-label="Help"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </>
            )}
            <Button
              variant={isCollapsed ? "ghost" : "destructive"}
              size={isCollapsed ? "icon" : "sm"}
              className={cn("transition-colors", !isCollapsed && "flex-1 justify-start text-xs")}
              onClick={() => {
                logout();
                router.push("/auth/login");
              }}
            >
              <LogOut className={cn("h-3.5 w-3.5", !isCollapsed && "mr-2")} />
              {!isCollapsed && "Logout"}
            </Button>
          </div>
        </footer>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Command Palette */}
      <CommandDialog open={isPaletteOpen} onOpenChange={setIsPaletteOpen}>
        <CommandInput
          value={searchQuery}
          onValueChange={setSearchQuery}
          placeholder="Search navigation, products, customers…"
        />
        <CommandList>
          <CommandEmpty>No matching commands or accessible results.</CommandEmpty>

          <CommandGroup heading="Navigate">
            {visibleModules.flatMap((module) =>
              module.pages.map((page) => {
                const PageIcon = page.icon;
                return (
                  <CommandItem
                    key={page.href}
                    value={`${module.label} ${page.label}`}
                    onSelect={() => navigate(page.href)}
                  >
                    <PageIcon
                      className={cn("mr-2 h-4 w-4", module.accent?.icon || "text-primary")}
                    />
                    {page.label}
                    <span className="ml-auto text-xs text-muted-foreground">{module.label}</span>
                  </CommandItem>
                );
              })
            )}
          </CommandGroup>

          {(isAdminUser || hasAnyPermission(["sales.order.create", "procurement.order.view"])) && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Actions">
                {hasAnyPermission(["sales.order.create", "sales.order.view_all"]) && (
                  <CommandItem onSelect={() => navigate("/dashboard/pos/documents/new")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create POS document
                  </CommandItem>
                )}
                {hasAnyPermission(["procurement.order.view", "admin.branch.manage"]) && (
                  <CommandItem onSelect={() => navigate("/dashboard/purchasing/orders/new")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create purchase order
                  </CommandItem>
                )}
                {isAdminUser && (
                  <CommandItem
                    onSelect={() => {
                      setIsPaletteOpen(false);
                      setSwitcherOpen(true);
                    }}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    Switch branch
                  </CommandItem>
                )}
              </CommandGroup>
            </>
          )}

          {searchResults.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Live search">
                {searchResults.map((result) => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    onSelect={() => navigate(result.href)}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    {result.label}
                    <span className="ml-auto text-xs capitalize text-muted-foreground">
                      {result.type}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Configure your application preferences</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select defaultValue="system">
                <SelectTrigger>
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notifications</Label>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="notifications" defaultChecked className="rounded" />
                <label htmlFor="notifications" className="text-sm">
                  Enable notifications
                </label>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>About</Label>
              <p className="text-sm text-muted-foreground">Zoho ERP v{APP_VERSION}</p>
              <p className="text-sm text-muted-foreground">© 2024 Zoho ERP. All rights reserved.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Close
            </Button>
            <Button onClick={() => setShowSettingsDialog(false)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
