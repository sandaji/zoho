"use client";

import { Building2, Plus, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { SearchResult } from "./types";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  modules: any[];
  isAdminUser: boolean;
  hasPermission: (...permissions: string[]) => boolean;
  onNavigate: (href: string) => void;
  onSwitchBranch: () => void;
}

export function CommandPalette({
  isOpen,
  onOpenChange,
  searchQuery,
  setSearchQuery,
  searchResults,
  modules,
  isAdminUser,
  hasPermission,
  onNavigate,
  onSwitchBranch,
}: CommandPaletteProps) {
  return (
    <CommandDialog open={isOpen} onOpenChange={onOpenChange}>
      <CommandInput
        value={searchQuery}
        onValueChange={setSearchQuery}
        placeholder="Search navigation, products, customers…"
      />
      <CommandList>
        <CommandEmpty>No matching commands or accessible results.</CommandEmpty>

        <CommandGroup heading="Navigate">
          {modules.flatMap((module) =>
            module.pages.map((page: any) => {
              const PageIcon = page.icon;
              return (
                <CommandItem
                  key={page.href}
                  value={`${module.label} ${page.label}`}
                  onSelect={() => onNavigate(page.href)}
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

        {(isAdminUser || hasPermission("sales.order.create", "procurement.order.view")) && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              {hasPermission("sales.order.create") && (
                <CommandItem onSelect={() => onNavigate("/dashboard/pos/documents/new")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create POS document
                </CommandItem>
              )}
              {hasPermission("procurement.order.view", "admin.branch.manage") && (
                <CommandItem onSelect={() => onNavigate("/dashboard/purchasing/orders/new")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create purchase order
                </CommandItem>
              )}
              {isAdminUser && (
                <CommandItem onSelect={onSwitchBranch}>
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
                  onSelect={() => onNavigate(result.href)}
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
  );
}