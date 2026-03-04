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
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          aria-label="Quick actions"
        >
          <MoreVertical size={20} />
          <span>Actions</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2">
        <div className="space-y-1">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
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
