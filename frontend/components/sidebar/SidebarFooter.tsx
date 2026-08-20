"use client";

import { HelpCircle, LogOut, Settings, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NotificationBell } from "@/components/notification-bell";
import type { User as AuthUser } from "@/lib/auth-context";
import { frontendEnv } from "@/lib/env";
import { cn } from "@/lib/utils";
import { SidebarUserProfile } from "./SidebarUserProfile";
import { APP_VERSION } from "./constants";

interface SidebarFooterProps {
  isCollapsed: boolean;
  user: AuthUser;
  isOnline: boolean;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export function SidebarFooter({
  isCollapsed,
  user,
  isOnline,
  onOpenSettings,
  onLogout,
}: SidebarFooterProps) {
  return (
    <footer className="space-y-3 border-t p-3">
      <SidebarUserProfile isCollapsed={isCollapsed} user={user} />

      <div className="flex items-center justify-between">
        {!isCollapsed && (
          <span className="text-xs font-medium text-muted-foreground">Notifications</span>
        )}
        <NotificationBell />
      </div>

      {!isCollapsed && (
        <div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
          {isOnline ? (
            <Wifi className="h-3 w-3 text-emerald-500" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-500" />
          )}
          <span>{isOnline ? "Connected" : "Offline"}</span>
          <Separator orientation="vertical" className="h-3" />
          <span>{frontendEnv.NEXT_PUBLIC_APP_NAME}</span>
        </div>
      )}

      <div className="flex items-center gap-1">
        {!isCollapsed && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start text-xs text-muted-foreground"
              onClick={onOpenSettings}
            >
              <Settings className="mr-2 h-3.5 w-3.5" />
              Settings
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onOpenSettings}
              aria-label="Help"
            >
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </>
        )}
        <Button
          variant={isCollapsed ? "ghost" : "destructive"}
          size={isCollapsed ? "icon" : "sm"}
          className={cn("transition-colors", !isCollapsed && "flex-1 justify-start text-xs")}
          onClick={onLogout}
        >
          <LogOut className={cn("h-3.5 w-3.5", !isCollapsed && "mr-2")} />
          {!isCollapsed && "Logout"}
        </Button>
      </div>
    </footer>
  );
}