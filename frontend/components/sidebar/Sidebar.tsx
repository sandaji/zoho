"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useHasPermission } from "@/hooks/use-permissions";
import { useStoredStringList } from "@/hooks/use-sidebar-preferences";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/api-config";
import { NAVIGATION_MODULES, canAccessNavigationItem } from "@/lib/navigation";
import type { Branch } from "@/lib/types/admin";

import type { SwitcherBranch, SearchResult } from "./types";
import { SidebarMobileHeader } from "./SidebarMobileHeader";
import { SidebarSearch } from "./SidebarSearch";
import { SidebarNavigation } from "./SidebarNavigation";
import { SidebarFooter } from "./SidebarFooter";
import { SidebarHeader } from "./SidebarHeader";
import { CommandPalette } from "./CommandPalette";
import { SettingsDialog } from "./SettingsDialog";

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, switchBranch } = useAuth();
  const { hasAnyPermission, hasPermission } = useHasPermission();

  // UI State
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openModule, setOpenModule] = useState<string | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [stats, setStats] = useState<any>({});
  const [switcherBranches, setSwitcherBranches] = useState<SwitcherBranch[]>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // Preferences
  const favorites = useStoredStringList("zoho.sidebar.favorites");
  const recents = useStoredStringList("zoho.sidebar.recents", 8);
  const pinnedModules = useStoredStringList("zoho.sidebar.pinned-modules");

  // Derived state
  const isAdminUser = user?.role === "admin" || user?.role === "super_admin";
  const switcherRef = useRef<HTMLDivElement>(null);

  // Load collapsed state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("zoho.sidebar.collapsed");
      setIsCollapsed(stored === "true");
    } catch {
      // Storage unavailable
    }
  }, []);

  // Online/offline status
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
        .find((page) => {
          const [path, query] = page.href.split("?");
          if (query) {
            return pathname === path && window.location.search === `?${query}`;
          }
          if (path === "/dashboard") return pathname === path;
          return Boolean(pathname?.startsWith(path));
        }),
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

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  if (!user) return null;

  return (
    <>
      {/* Mobile Header */}
      <SidebarMobileHeader isOpen={isOpen} setIsOpen={setIsOpen} />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r bg-background transition-all duration-300 lg:static",
          isCollapsed ? "w-[68px]" : "w-72",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header with Branch Switcher */}
        <SidebarHeader
          isCollapsed={isCollapsed}
          isAdminUser={isAdminUser}
          switcherBranches={switcherBranches}
          currentBranchId={user.branchId || undefined}
          isSwitching={isSwitching}
          switcherOpen={switcherOpen}
          setSwitcherOpen={setSwitcherOpen}
          handleBranchSwitch={handleBranchSwitch}
          toggleCollapsed={toggleCollapsed}
        />

        {/* Search / Command Palette Trigger */}
        <SidebarSearch
          isCollapsed={isCollapsed}
          onOpenPalette={() => setIsPaletteOpen(true)}
        />

        {/* Navigation */}
        <SidebarNavigation
          modules={visibleModules}
          favorites={favorites.value}
          recents={recents.value}
          pinnedModules={pinnedModules.value}
          pathname={pathname}
          isCollapsed={isCollapsed}
          openModule={openModule}
          setOpenModule={setOpenModule}
          stats={stats}
          onNavigate={navigate}
          onToggleFavorite={favorites.toggle}
          onTogglePinned={pinnedModules.toggle}
          onCloseMobile={() => setIsOpen(false)}
        />

        {/* Footer with User Profile and Actions */}
        <SidebarFooter
          isCollapsed={isCollapsed}
          user={user}
          isOnline={isOnline}
          onOpenSettings={() => setShowSettingsDialog(true)}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Command Palette */}
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

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
      />
    </>
  );
}