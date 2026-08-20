"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarSearchProps {
  isCollapsed: boolean;
  onOpenPalette: () => void;
}

export function SidebarSearch({ isCollapsed, onOpenPalette }: SidebarSearchProps) {
  return (
    <div className="border-b p-3">
      <Button
        variant="outline"
        size={isCollapsed ? "icon" : "default"}
        className={cn(
          "w-full justify-start text-xs text-muted-foreground",
          isCollapsed && "px-2"
        )}
        onClick={onOpenPalette}
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
  );
}