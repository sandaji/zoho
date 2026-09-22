"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Building2,
  Check,
  ChevronsUpDown,
  Search,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Wifi,
  WifiOff,
  ChevronDown,
  Pin,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useHasPermission } from "@/hooks/use-permissions";
import { useStoredStringList } from "@/hooks/use-sidebar-preferences";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/api-config";
import { NAVIGATION_MODULES, canAccessNavigationItem } from "@/lib/navigation";
import type { Branch } from "@/lib/types/admin";
import { ROLE_LABELS, ROLE_COLORS, APP_VERSION, isActivePath } from "./constants";
import { CommandPalette } from "./CommandPalette";
import type { SwitcherBranch, SearchResult } from "./types";

// Internal component that uses the sidebar context
function SidebarContentInternal() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, switchBranch } = useAuth();
  const { hasAnyPermission, hasPermission } = useHasPermission();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  // UI State
  const [openModule, setOpenModule] = useState<string | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [stats, setStats] = useState<any>({});
  const [switcherBranches, setSwitcherBranches] = useState<SwitcherBranch[]>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  // Preferences
  const favorites = useStoredStringList("swiftpos.sidebar.favorites");
  const recents = useStoredStringList("swiftpos.sidebar.recents", 8);
  const pinnedModules = useStoredStringList("swiftpos.sidebar.pinned-modules");

  // Derived state
  const isAdminUser = user?.role === "admin" || user?.role === "super_admin";

  // Load branches for admin users
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
            branches.map((branch: Branch) => ({
              id: branch.id,
              name: branch.name,
              code: branch.code,
            }))
          );
        }
      })
      .catch(() => undefined);
  }, [isAdminUser]);

  // Load stats
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
    const interval = window.setInterval(() => void loadStats(), 60000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [hasPermission, user]);

  // Build visible modules
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

  // Get all pages for favorites and recents
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

  // Navigation handler
  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      setIsPaletteOpen(false);
      setSearchQuery("");
    },
    [router]
  );

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

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  if (!user) return null;

  // Get current branch name for display
  const currentBranch = switcherBranches.find((b) => b.id === user.branchId);

  return (
    <>
      {/* Sidebar Header */}
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-sm">
              SP
            </div>
            {!isCollapsed && (
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-bold tracking-tight text-foreground">
                  SwiftPos ERP
                </span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {currentBranch?.name ?? "Enterprise Management"}
                </span>
              </div>
            )}
          </div>
          <SidebarMenuButton
            onClick={toggleSidebar}
            className="h-8 w-8 shrink-0 justify-center p-0"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </SidebarMenuButton>
        </div>

        {isAdminUser && switcherBranches.length > 0 && !isCollapsed && (
          <div className="mt-2">
            <DropdownMenu open={switcherOpen} onOpenChange={setSwitcherOpen}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className="w-full justify-start text-xs rounded-md border border-sidebar-border/70 bg-sidebar-accent/30 hover:bg-sidebar-accent"
                  disabled={isSwitching}
                >
                  <Building2 className="h-3.5 w-3.5 mr-2 text-primary" />
                  <span className="flex-1 truncate text-left font-medium">
                    {isSwitching ? "Switching…" : (currentBranch?.name ?? "All Branches")}
                  </span>
                  <ChevronsUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Switch Branch</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {switcherBranches.map((branch) => (
                  <DropdownMenuItem
                    key={branch.id}
                    onClick={() => handleBranchSwitch(branch.id)}
                    className="flex items-center gap-2"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="flex-1">{branch.name}</span>
                    {user.branchId === branch.id && <Check className="h-3.5 w-3.5 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </SidebarHeader>

      {/* Search / Command Palette Trigger */}
      <div className="border-b border-sidebar-border p-3">
        <SidebarMenuButton
          onClick={() => setIsPaletteOpen(true)}
          className={cn(
            "w-full justify-start rounded-md border border-sidebar-border/70 bg-sidebar-accent/40 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
            isCollapsed && "justify-center border-transparent bg-transparent"
          )}
        >
          <Search className="h-4 w-4" />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left text-xs">Search or run a command…</span>
              <kbd className="rounded border border-sidebar-border/80 bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                ⌘K
              </kbd>
            </>
          )}
        </SidebarMenuButton>
      </div>

      {/* Navigation Content */}
      <SidebarContent className="p-2 gap-1 overflow-y-auto">
        {/* Group modules by section */}
        {(() => {
          const sections = {
            operations: visibleModules.filter((m: any) => m.section === "operations"),
            reports: visibleModules.filter((m: any) => m.section === "reports"),
            system: visibleModules.filter((m: any) => m.section === "system"),
            // settings: visibleModules.filter((m: any) => m.section === "settings"),
          };

          const sectionLabels = {
            operations: "Operations",
            reports: "Reports",
            system: "System",
            // settings: "Settings",
          };

          // Get favorite and recent pages
          const favoritePages = allPages.filter((page: any) => favorites.value.includes(page.href));
          const recentPages = recents.value
            .map((href) => allPages.find((page: any) => page.href === href))
            .filter(Boolean);

          return (
            <>
              {/* Favorites Section */}
              {!isCollapsed && favoritePages.length > 0 && (
                <SidebarGroup>
                  <SidebarGroupLabel>Favorites</SidebarGroupLabel>
                  <SidebarMenu>
                    {favoritePages.map((page: any) => (
                      <SidebarMenuItem key={page.href}>
                        <SidebarMenuButton asChild isActive={isActivePath(pathname, page.href)}>
                          <a
                            href={page.href}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(page.href);
                            }}
                          >
                            <page.icon className="h-4 w-4" />
                            <span>{page.label}</span>
                          </a>
                        </SidebarMenuButton>
                        <SidebarMenuAction
                          onClick={() => favorites.toggle(page.href)}
                          className="text-amber-500"
                        >
                          <Star className="h-3 w-3 fill-current" />
                        </SidebarMenuAction>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroup>
              )}

              {/* Recent Section */}
              {!isCollapsed && recentPages.length > 0 && (
                <SidebarGroup>
                  <SidebarGroupLabel>Recent</SidebarGroupLabel>
                  <SidebarMenu>
                    {recentPages.slice(0, 3).map((page: any) => (
                      <SidebarMenuItem key={page.href}>
                        <SidebarMenuButton asChild isActive={isActivePath(pathname, page.href)}>
                          <a
                            href={page.href}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(page.href);
                            }}
                          >
                            <page.icon className="h-4 w-4" />
                            <span>{page.label}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroup>
              )}

              {/* Main Navigation Sections */}
              {Object.entries(sections).map(([sectionKey, sectionModules]) => {
                if (!sectionModules.length) return null;

                return (
                  <SidebarGroup key={sectionKey}>
                    {!isCollapsed && (
                      <SidebarGroupLabel>
                        {sectionLabels[sectionKey as keyof typeof sectionLabels]}
                      </SidebarGroupLabel>
                    )}
                    <SidebarMenu>
                      {sectionModules.map((module: any) => {
                        const Icon = module.icon;
                        const isOpen = openModule === module.id;
                        const isPinned = pinnedModules.value.includes(module.id);
                        const isActive = module.pages.some((page: any) =>
                          isActivePath(pathname, page.href)
                        );

                        return (
                          <SidebarMenuItem key={module.id}>
                            <SidebarMenuButton
                              isActive={isActive}
                              onClick={() => setOpenModule(isOpen ? null : module.id)}
                              className="w-full"
                            >
                              <Icon
                                className={cn(
                                  "h-4 w-4",
                                  isActive ? "text-primary" : "text-sidebar-foreground/50"
                                )}
                              />
                              {!isCollapsed && (
                                <>
                                  <span className="flex-1">{module.label}</span>
                                  {module.summary?.(stats) && (
                                    <Badge variant="secondary" className="text-[10px] font-medium">
                                      {module.summary(stats)}
                                    </Badge>
                                  )}
                                  <ChevronDown
                                    className={cn(
                                      "h-3.5 w-3.5 transition-transform duration-200",
                                      isOpen && "rotate-180"
                                    )}
                                  />
                                </>
                              )}
                            </SidebarMenuButton>
                            {!isCollapsed && (
                              <SidebarMenuAction onClick={() => pinnedModules.toggle(module.id)}>
                                <Pin
                                  className={cn("h-3 w-3", isPinned && "fill-current text-primary")}
                                />
                              </SidebarMenuAction>
                            )}
                            {isOpen && !isCollapsed && (
                              <SidebarMenuSub>
                                {module.pages.map((page: any) => {
                                  const PageIcon = page.icon;
                                  const isPageActive = isActivePath(pathname, page.href);
                                  const isFavorite = favorites.value.includes(page.href);

                                  return (
                                    <SidebarMenuSubItem key={page.href}>
                                      <SidebarMenuSubButton asChild isActive={isPageActive}>
                                        <a
                                          href={page.href}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            navigate(page.href);
                                          }}
                                        >
                                          <PageIcon
                                            className={cn(
                                              "h-4 w-4",
                                              isPageActive
                                                ? "text-primary"
                                                : "text-sidebar-foreground/50"
                                            )}
                                          />
                                          <span>{page.label}</span>
                                        </a>
                                      </SidebarMenuSubButton>
                                      <SidebarMenuAction
                                        onClick={() => favorites.toggle(page.href)}
                                        className={cn(isFavorite && "text-amber-500")}
                                      >
                                        <Star
                                          className={cn("h-3 w-3", isFavorite && "fill-current")}
                                        />
                                      </SidebarMenuAction>
                                    </SidebarMenuSubItem>
                                  );
                                })}
                              </SidebarMenuSub>
                            )}
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroup>
                );
              })}
            </>
          );
        })()}
      </SidebarContent>

      {/* Sidebar Footer */}
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="space-y-3">
          {/* Actions */}
          <div className="flex gap-1">
            <SidebarMenu className="flex flex-row items-center justify-between">
              {/* Settings - Left side */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActivePath(pathname, "/dashboard/settings")}
                  tooltip="Settings"
                >
                  <a
                    href="/dashboard/settings"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate("/dashboard/settings");
                    }}
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    {!isCollapsed && <span>Settings</span>}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Logout - Right side */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  tooltip="Logout"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  {!isCollapsed && <span>Logout</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </div>
      </SidebarFooter>

      {/* Command Palette - rendered outside sidebar */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onOpenChange={setIsPaletteOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        modules={visibleModules}
        isAdminUser={isAdminUser}
        hasPermission={hasPermission}
        onNavigate={navigate}
        onSwitchBranch={() => {
          setIsPaletteOpen(false);
          setSwitcherOpen(true);
        }}
      />
    </>
  );
}

// Main Sidebar component using shadcn Sidebar
export function CustomSidebar() {
  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarContentInternal />
    </Sidebar>
  );
}

// Layout wrapper component
export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <CustomSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-30 flex h-14 items-center border-b bg-background px-4 lg:hidden">
          <SidebarTrigger />
          <span className="ml-2 font-semibold">SwiftPos ERP</span>
        </div>
        {children}
      </main>
    </SidebarProvider>
  );
}
