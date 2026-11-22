"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useHasPermission } from "@/hooks/use-permissions";
import {
  canAccessNavigationItem,
  NAVIGATION_MODULES,
  type NavigationModule,
  type NavigationPage,
} from "@/lib/navigation";
import { isActivePath } from "./constants";
import { cn } from "@/lib/utils";

type VisibleModule = NavigationModule & { pages: NavigationPage[] };

function isNavigationPageActive(
  pathname: string | null,
  search: string,
  href: string
) {
  const [path, query] = href.split("?");
  if (query && pathname === path) {
    return search === query || (!search && query === "section=overview");
  }
  return isActivePath(pathname, path);
}

/** Shows the active module's pages as a horizontal navigation bar. */
export function ModuleNavbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const { user } = useAuth();
  const { hasAnyPermission } = useHasPermission();

  const visibleModules = useMemo<VisibleModule[]>(() => {
    if (!user) return [];

    return NAVIGATION_MODULES.map((module) => ({
      ...module,
      pages: module.pages.filter((page) =>
        canAccessNavigationItem(page, user.role, hasAnyPermission)
      ),
    })).filter(
      (module) =>
        canAccessNavigationItem(module, user.role, hasAnyPermission) &&
        module.pages.length > 0
    );
  }, [hasAnyPermission, user]);

  const currentModule = useMemo(() => {
    // The CRM route has its own Customers/Vendors navigation already.
    if (pathname?.startsWith("/dashboard/crm")) return null;

    return visibleModules
      .filter((module) => module.showSubNavigation)
      .map((module) => ({
        module,
        matchLength: Math.max(
          0,
          ...module.pages
            .filter((page) => isNavigationPageActive(pathname, search, page.href))
            .map((page) => page.href.split("?")[0].length)
        ),
      }))
      .filter(({ matchLength }) => matchLength > 0)
      .sort((left, right) => right.matchLength - left.matchLength)[0]?.module ?? null;
    // Reading the query string also refreshes active state for admin sections.
  }, [pathname, search, visibleModules]);

  const activePageId = useMemo(
    () =>
      currentModule?.pages
        .filter((page) => isNavigationPageActive(pathname, search, page.href))
        .sort(
          (left, right) =>
            right.href.split("?")[0].length - left.href.split("?")[0].length
        )[0]?.id,
    [currentModule, pathname, search]
  );

  if (!currentModule) return null;

  return (
    <div className="w-full border-b border-border bg-card/95">
      <div className="flex min-w-0 items-center gap-4 px-4 py-2 sm:px-6">
        <span className="hidden shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:block">
          {currentModule.label}
        </span>
        <nav
          aria-label={`${currentModule.label} navigation`}
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
        >
          {currentModule.pages.map((page) => {
            const isActive = page.id === activePageId;

            return (
              <Link
                key={page.id}
                href={page.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {page.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
