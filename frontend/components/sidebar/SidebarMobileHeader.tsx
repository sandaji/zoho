"use client";

import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarMobileHeaderProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  className?: string;
}

export function SidebarMobileHeader({ isOpen, setIsOpen, className }: SidebarMobileHeaderProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-50 flex items-center justify-between border-b bg-background px-4 py-3 lg:hidden",
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg"
        aria-label="Toggle navigation"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
    </div>
  );
}                               