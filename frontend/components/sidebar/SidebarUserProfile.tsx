"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { User } from "@/lib/types/admin";
import { ROLE_LABELS, ROLE_COLORS } from "./constants";
import { cn } from "@/lib/utils";

interface SidebarUserProfileProps {
  isCollapsed: boolean;
  user: User;
}

export function SidebarUserProfile({ isCollapsed, user }: SidebarUserProfileProps) {
  const avatarFallback = user.name.charAt(0).toUpperCase();
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;
  const branchName = user.branch?.name ?? "All branches";

  if (isCollapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex justify-center">
              <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary/10 text-sm text-primary">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">
              {roleLabel} · {branchName}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-3 px-1">
      <Avatar className="h-9 w-9 ring-2 ring-primary/20">
        <AvatarFallback className="bg-primary/10 text-sm text-primary">
          {avatarFallback}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn("px-1.5 py-0 text-[10px]", ROLE_COLORS[user.role] || "bg-muted")}
          >
            {roleLabel}
          </Badge>
          <span className="truncate text-[10px] text-muted-foreground">{branchName}</span>
        </div>
      </div>
    </div>
  );
}