"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth-context";
import {
  Sun,
  Moon,
  Laptop,
  Bell,
  User,
  Shield,
  Building2,
  Info,
  Check,
  Save,
  Volume2,
  Mail,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ROLE_LABELS, ROLE_COLORS, APP_VERSION } from "@/components/sidebar/constants";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Notification Preferences state
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    soundEffects: true,
    lowStockAlerts: true,
    posFeedAlerts: true,
    transferUpdates: true,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("swiftpos_notification_prefs");
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch {
        // ignore parse error
      }
    }
  }, []);

  const handleSavePreferences = () => {
    setSaving(true);
    localStorage.setItem("swiftpos_notification_prefs", JSON.stringify(notifications));
    setTimeout(() => {
      setSaving(false);
      toast.success("Preferences updated successfully");
    }, 400);
  };

  const currentYear = new Date().getFullYear();
  const roleLabel = user?.role ? (ROLE_LABELS[user.role] ?? user.role) : "Staff";
  const branchName = user?.branch?.name ?? "Main Branch (Enterprise)";

  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between rounded-xl border border-border bg-card p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings &amp; Preferences</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Customize your workspace appearance, notification preferences, and system configurations.
            </p>
          </div>
          <Button onClick={handleSavePreferences} disabled={saving} className="gap-2 self-start md:self-auto">
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="appearance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-md h-9 bg-muted/60 p-1">
            <TabsTrigger value="appearance" className="gap-2 text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 text-xs">
              <Bell className="h-3.5 w-3.5" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2 text-xs">
              <User className="h-3.5 w-3.5" />
              Account
            </TabsTrigger>
            <TabsTrigger value="about" className="gap-2 text-xs">
              <Info className="h-3.5 w-3.5" />
              About
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Appearance ────────────────────────────────────────── */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sun className="h-4 w-4 text-primary" />
                  Theme &amp; Interface
                </CardTitle>
                <CardDescription>
                  Select how SwiftPos ERP looks to you. Choose a light, dark, or system-synced theme.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {/* Light Theme Card */}
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={cn(
                      "group relative flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-all hover:border-primary/50",
                      mounted && theme === "light"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background shadow-xs text-amber-500">
                      <Sun className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">Light Mode</span>
                        {mounted && theme === "light" && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Crisp, high-contrast light surfaces with emerald accents.
                      </p>
                    </div>
                  </button>

                  {/* Dark Theme Card */}
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "group relative flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-all hover:border-primary/50",
                      mounted && theme === "dark"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background shadow-xs text-primary">
                      <Moon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">Dark Mode</span>
                        {mounted && theme === "dark" && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Sleek dark slate surfaces designed for low-light environments.
                      </p>
                    </div>
                  </button>

                  {/* System Theme Card */}
                  <button
                    type="button"
                    onClick={() => setTheme("system")}
                    className={cn(
                      "group relative flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-all hover:border-primary/50",
                      mounted && theme === "system"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background shadow-xs text-muted-foreground">
                      <Laptop className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">System Synced</span>
                        {mounted && theme === "system" && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Automatically match your operating system preferences.
                      </p>
                    </div>
                  </button>
                </div>

                <Separator />

                {/* Brand Color Indicator */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Primary Brand Palette</Label>
                    <p className="text-xs text-muted-foreground">
                      Unified emerald brand tone used for active links, buttons, and badges.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shadow-sm" />
                    <span className="text-xs font-medium text-foreground">Emerald Green</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 2: Notifications ─────────────────────────────────────── */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Alert &amp; Notification Rules
                </CardTitle>
                <CardDescription>
                  Choose which alerts and activities should trigger system notices.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Volume2 className="h-4 w-4" />
                      </div>
                      <div>
                        <Label htmlFor="sound-effects" className="text-sm font-medium">
                          Sound Feedback
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Play a subtle chime on successful POS checkouts and scans.
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="sound-effects"
                      checked={notifications.soundEffects}
                      onCheckedChange={(val) =>
                        setNotifications((prev) => ({ ...prev, soundEffects: val }))
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div>
                        <Label htmlFor="email-alerts" className="text-sm font-medium">
                          Email Summary Reports
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Receive end-of-day sales and fiscal transaction summaries.
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="email-alerts"
                      checked={notifications.emailAlerts}
                      onCheckedChange={(val) =>
                        setNotifications((prev) => ({ ...prev, emailAlerts: val }))
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <div>
                        <Label htmlFor="low-stock" className="text-sm font-medium">
                          Low Stock &amp; Reorder Alerts
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Get notified when inventory items drop below reorder thresholds.
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="low-stock"
                      checked={notifications.lowStockAlerts}
                      onCheckedChange={(val) =>
                        setNotifications((prev) => ({ ...prev, lowStockAlerts: val }))
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Bell className="h-4 w-4" />
                      </div>
                      <div>
                        <Label htmlFor="transfer-updates" className="text-sm font-medium">
                          Warehouse Transfer Updates
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Notify on stock transfer approvals, dispatches, and receipts.
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="transfer-updates"
                      checked={notifications.transferUpdates}
                      onCheckedChange={(val) =>
                        setNotifications((prev) => ({ ...prev, transferUpdates: val }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 3: Account & Branch ──────────────────────────────────── */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Account &amp; Organization Profile
                </CardTitle>
                <CardDescription>
                  Your authenticated session identity and assigned branch access.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Full Name</span>
                    <p className="font-semibold text-foreground">{user?.name ?? "User"}</p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Email Address</span>
                    <p className="font-semibold text-foreground">{user?.email ?? "user@example.com"}</p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Role &amp; Security Level</span>
                    <div className="flex items-center gap-2 pt-0.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "px-2 py-0.5 text-xs font-semibold",
                          user?.role ? ROLE_COLORS[user.role] : "bg-primary/10 text-primary"
                        )}
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        {roleLabel}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Current Branch Location</span>
                    <div className="flex items-center gap-1.5 pt-0.5 text-foreground font-semibold text-sm">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span>{branchName}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 4: About & System Info ───────────────────────────────── */}
          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  About SwiftPos ERP
                </CardTitle>
                <CardDescription>
                  Application version, environment details, and legal information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-xs font-medium text-muted-foreground">Application Name</span>
                    <span className="text-xs font-semibold text-foreground">SwiftPos ERP - Management System</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-xs font-medium text-muted-foreground">Version</span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      v{APP_VERSION}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-xs font-medium text-muted-foreground">Environment</span>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Production / Active
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-xs font-medium text-muted-foreground">Copyright</span>
                    <span className="text-xs text-foreground font-medium">
                      © {currentYear} SwiftPos ERP. All rights reserved.
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
