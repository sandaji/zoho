"use client";

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface QuickActionButtonsProps {
  actions: QuickAction[];
}

export function QuickActionButtons({ actions }: QuickActionButtonsProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground bg-background border border-input rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring transition-colors shadow-sm"
          aria-label="Quick actions"
        >
          <MoreVertical size={16} />
          <span>Actions</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1 bg-popover text-popover-foreground border-border">
        <div className="space-y-0.5">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
              className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs text-left text-foreground rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
