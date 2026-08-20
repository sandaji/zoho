"use client";

import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { BranchSwitcher } from "./BranchSwitcher";
import { cn } from "@/lib/utils";

interface SidebarHeaderProps {
  isCollapsed: boolean;
  isAdminUser: boolean;
  switcherBranches: any[];
  currentBranchId: string | undefined;
  isSwitching: boolean;
  switcherOpen: boolean;
  setSwitcherOpen: (open: boolean) => void;
  handleBranchSwitch: (branchId: string) => Promise<void>;
  toggleCollapsed: () => void;
  className?: string;
}

export function SidebarHeader({
  isCollapsed,
  isAdminUser,
  switcherBranches,
  currentBranchId,
  isSwitching,
  switcherOpen,
  setSwitcherOpen,
  handleBranchSwitch,
  toggleCollapsed,
  className,
}: SidebarHeaderProps) {
  return (
    <header className={cn("flex items-center justify-between border-b px-1 py-[4px]", className)}>
      {isAdminUser && switcherBranches.length > 0 && (
        <div className={cn("border-b", isCollapsed ? "p-2" : "p-3")}>
          <BranchSwitcher
            branches={switcherBranches}
            currentBranchId={currentBranchId}
            isSwitching={isSwitching}
            isCollapsed={isCollapsed}
            open={switcherOpen}
            onOpenChange={setSwitcherOpen}
            onSwitch={handleBranchSwitch}
          />
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
  );
}