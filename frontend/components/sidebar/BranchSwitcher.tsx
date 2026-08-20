"use client";

import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SwitcherBranch } from "./types";
import { cn } from "@/lib/utils";

interface BranchSwitcherProps {
  branches: SwitcherBranch[];
  currentBranchId?: string;
  isSwitching: boolean;
  isCollapsed: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitch: (branchId: string) => Promise<void>;
}

export function BranchSwitcher({
  branches,
  currentBranchId,
  isSwitching,
  isCollapsed,
  open,
  onOpenChange,
  onSwitch,
}: BranchSwitcherProps) {
  const currentBranch = branches.find((b) => b.id === currentBranchId);

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
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
                {isSwitching ? "Switching…" : (currentBranch?.name ?? "All Branches")}
              </span>
              <ChevronsUpDown className="ml-2 h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch Branch</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {branches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            onClick={() => onSwitch(branch.id)}
            className="flex items-center gap-2"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span className="flex-1">{branch.name}</span>
            {currentBranchId === branch.id && (
              <Check className="h-3.5 w-3.5 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}