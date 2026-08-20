"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Pin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NavigationModule, NavigationPage, NavigationStats } from "@/lib/navigation";
import { isActivePath } from "./constants";
import { cn } from "@/lib/utils";

interface SidebarNavigationProps {
  modules: any[];
  favorites: string[];
  recents: string[];
  pinnedModules: string[];
  pathname: string | null;
  isCollapsed: boolean;
  openModule: string | null;
  setOpenModule: (id: string | null) => void;
  stats: NavigationStats;
  onNavigate: (href: string) => void;
  onToggleFavorite: (href: string) => void;
  onTogglePinned: (id: string) => void;
  onCloseMobile: () => void;
}

// Page Item Component
function PageItem({
  page,
  module,
  pathname,
  isCollapsed,
  isFavorite,
  onNavigate,
  onToggleFavorite,
  onCloseMobile,
}: {
  page: NavigationPage;
  module: any;
  pathname: string | null;
  isCollapsed: boolean;
  isFavorite: boolean;
  onNavigate: (href: string) => void;
  onToggleFavorite: (href: string) => void;
  onCloseMobile: () => void;
}) {
  const Icon = page.icon;
  const active = isActivePath(pathname, page.href);

  return (
    <div className="group/page relative">
      <Link
        href={page.href}
        onClick={() => onCloseMobile()}
        className={cn(
          "relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium outline-none transition-all duration-200",
          "hover:bg-accent hover:text-accent-foreground",
          active ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground",
          isCollapsed ? "px-3" : "pr-8"
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

      {!isCollapsed && (
        <button
          type="button"
          aria-label={`${isFavorite ? "Remove" : "Add"} ${page.label} ${isFavorite ? "from" : "to"} favorites`}
          onClick={() => onToggleFavorite(page.href)}
          className={cn(
            "absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-0 transition-all hover:bg-accent",
            "group-hover/page:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isFavorite && "opacity-100 text-amber-500"
          )}
        >
          <Star className={cn("h-3 w-3 transition-all", isFavorite && "fill-current")} />
        </button>
      )}
    </div>
  );
}

// Module Item Component
function ModuleItem({
  module,
  pathname,
  isCollapsed,
  isOpen,
  isPinned,
  stats,
  onToggle,
  onNavigate,
  onTogglePinned,
}: {
  module: any;
  pathname: string | null;
  isCollapsed: boolean;
  isOpen: boolean;
  isPinned: boolean;
  stats: NavigationStats;
  onToggle: () => void;
  onNavigate: (href: string) => void;
  onTogglePinned: (id: string) => void;
}) {
  const Icon = module.icon;
  const active = module.pages.some((page: NavigationPage) => isActivePath(pathname, page.href));

  return (
    <div className="group relative">
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={isCollapsed ? () => onNavigate(module.pages[0].href) : onToggle}
              className={cn(
                "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-all duration-200",
                "hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring",
                active ? "bg-accent/50 text-accent-foreground" : "text-muted-foreground",
                isCollapsed && "justify-center px-2"
              )}
              aria-expanded={!isCollapsed ? isOpen : undefined}
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
                      isOpen && "rotate-180"
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

      {!isCollapsed && isOpen && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
          {module.pages.map((page: NavigationPage) => (
            <PageItem
              key={page.href}
              page={page}
              module={module}
              pathname={pathname}
              isCollapsed={isCollapsed}
              isFavorite={false}
              onNavigate={onNavigate}
              onToggleFavorite={() => {}}
              onCloseMobile={() => {}}
            />
          ))}
        </div>
      )}

      {!isCollapsed && (
        <button
          type="button"
          aria-label={`${isPinned ? "Unpin" : "Pin"} ${module.label}`}
          onClick={() => onTogglePinned(module.id)}
          className={cn(
            "absolute right-2 top-2.5 rounded p-1 opacity-0 transition-all hover:bg-accent",
            "group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isPinned && "opacity-100"
          )}
        >
          <Pin className={cn("h-3 w-3 transition-all", isPinned && "fill-current text-primary")} />
        </button>
      )}
    </div>
  );
}

// Main Navigation Component
export function SidebarNavigation({
  modules,
  favorites,
  recents,
  pinnedModules,
  pathname,
  isCollapsed,
  openModule,
  setOpenModule,
  stats,
  onNavigate,
  onToggleFavorite,
  onTogglePinned,
  onCloseMobile,
}: SidebarNavigationProps) {
  // Get all pages for favorites and recents
  const allPages = modules.flatMap((module) => 
    module.pages.map((page: NavigationPage) => ({ ...page, module }))
  );
  
  const favoritePages = allPages.filter((page: any) => favorites.includes(page.href));
  const recentPages = recents
    .map((href) => allPages.find((page: any) => page.href === href))
    .filter(Boolean);

  return (
    <ScrollArea className="flex-1 px-3 py-3">
      <nav className="space-y-4" aria-label="Main navigation">
        {/* Favorites Section */}
        {!isCollapsed && favoritePages.length > 0 && (
          <section>
            <p className="mb-1.5 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Favorites
            </p>
            {favoritePages.map((page: any) => (
              <PageItem
                key={page.href}
                page={page}
                module={page.module}
                pathname={pathname}
                isCollapsed={isCollapsed}
                isFavorite={favorites.includes(page.href)}
                onNavigate={onNavigate}
                onToggleFavorite={onToggleFavorite}
                onCloseMobile={onCloseMobile}
              />
            ))}
          </section>
        )}

        {/* Recent Section */}
        {!isCollapsed && recentPages.length > 0 && (
          <section>
            <p className="mb-1.5 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Recent
            </p>
            {recentPages.slice(0, 3).map((page: any) => (
              <PageItem
                key={page.href}
                page={page}
                module={page.module}
                pathname={pathname}
                isCollapsed={isCollapsed}
                isFavorite={favorites.includes(page.href)}
                onNavigate={onNavigate}
                onToggleFavorite={onToggleFavorite}
                onCloseMobile={onCloseMobile}
              />
            ))}
          </section>
        )}

        {/* Main Navigation Sections */}
        {(["operations", "reports", "system", "settings"] as const).map((section) => {
          const sectionModules = modules.filter((module: any) => module.section === section);
          if (!sectionModules.length) return null;

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
              <div className="space-y-0.5">
                {sectionModules.map((module: any) => (
                  <ModuleItem
                    key={module.id}
                    module={module}
                    pathname={pathname}
                    isCollapsed={isCollapsed}
                    isOpen={openModule === module.id}
                    isPinned={pinnedModules.includes(module.id)}
                    stats={stats}
                    onToggle={() => setOpenModule(openModule === module.id ? null : module.id)}
                    onNavigate={onNavigate}
                    onTogglePinned={onTogglePinned}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </nav>
    </ScrollArea>
  );
}