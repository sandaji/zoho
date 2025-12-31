// frontend/components/pos/POSQuickActions.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Archive,
  Pause,
  Trash2,
  MoreVertical,
  Calculator,
  Settings,
  HelpCircle,
} from "lucide-react";

interface POSQuickActionsProps {
  onPark: () => void;
  onHold: () => void;
  onClear: () => void;
  hasItems: boolean;
}

export const POSQuickActions: React.FC<POSQuickActionsProps> = ({
  onPark,
  onHold,
  onClear,
  hasItems,
}) => {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onPark}
        disabled={!hasItems}
        className="hidden md:flex"
      >
        <Archive className="h-4 w-4 mr-2" />
        Park Sale
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onHold}
        disabled={!hasItems}
        className="hidden md:flex"
      >
        <Pause className="h-4 w-4 mr-2" />
        Hold
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onClear}
        disabled={!hasItems}
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Clear (F4)
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Calculator className="h-4 w-4 mr-2" />
            Calculator
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <HelpCircle className="h-4 w-4 mr-2" />
            Help & Shortcuts
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
