/**
 * Row 4 Right – Exceptions & Alerts Tabs
 * Uses Radix Tabs. Tabs: Alerts (lowStockItems) | Products (topProducts) | Staff (staffPerformance).
 */
import * as Tabs from "@radix-ui/react-tabs";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { AlertTriangle, Package, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LowStockItem, TopProduct, StaffPerformance } from "@/lib/dashboard.service";

// ── Stock-status badge variant (yellow accent for warnings) ─────────────────
const alertBadge = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
  {
    variants: {
      level: {
        critical: "bg-destructive/10 text-destructive",
        low:      "bg-warning-muted text-warning",
        warning:  "bg-warning-muted/70 text-warning",
      },
    },
    defaultVariants: { level: "warning" },
  }
);

interface AlertsTabsProps {
  lowStockItems: LowStockItem[];
  topProducts: TopProduct[];
  staffPerformance: StaffPerformance[];
  loading: boolean;
}

export function AlertsTabs({
  lowStockItems,
  topProducts,
  staffPerformance,
  loading,
}: AlertsTabsProps) {
  return (
    <Card className="rounded-xl border border-border bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-foreground">Exceptions &amp; Alerts</CardTitle>
        <CardDescription className="text-muted-foreground">Items needing attention</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <Tabs.Root defaultValue="alerts" className="flex flex-col">
            {/* Tab list */}
            <Tabs.List className="flex border-b border-border px-4">
              {[
                { value: "alerts", label: "Alerts", Icon: AlertTriangle, count: lowStockItems.length },
                { value: "products", label: "Products", Icon: Package, count: topProducts.length },
                { value: "staff", label: "Staff", Icon: Users, count: staffPerformance.length },
              ].map(({ value, label, Icon, count }) => (
                <Tabs.Trigger
                  key={value}
                  value={value}
                  className={cn(
                    "flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors",
                    "hover:text-foreground",
                    "data-[state=active]:border-primary data-[state=active]:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  <span className="ml-0.5 rounded-full bg-muted px-1.5 py-px text-[10px] font-semibold text-muted-foreground">
                    {count}
                  </span>
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            {/* ── Alerts Tab ──────────────────────────────────────────────── */}
            <Tabs.Content value="alerts" className="h-64 overflow-y-auto p-4">
              {lowStockItems.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No alerts</p>
              ) : (
                <div className="space-y-2">
                  {lowStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-warning-border/50 bg-warning-muted/40 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Stock: {item.currentStock} / min {item.minStock}
                        </p>
                      </div>
                      <span className={cn(alertBadge({ level: item.status }))}>
                        <AlertTriangle className="h-3 w-3" />
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Tabs.Content>

            {/* ── Products Tab ─────────────────────────────────────────────── */}
            <Tabs.Content value="products" className="h-64 overflow-y-auto p-4">
              {topProducts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No product data</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((p) => (
                    <div key={p.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{p.name}</span>
                        <span className="font-semibold text-success">
                          KES {p.revenue.toLocaleString()}
                        </span>
                      </div>
                      <Progress
                        value={p.stockLevel}
                        className="h-1.5 bg-muted [&>div]:bg-primary"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Stock level: {p.stockLevel}% · {p.category}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Tabs.Content>

            {/* ── Staff Tab ────────────────────────────────────────────────── */}
            <Tabs.Content value="staff" className="h-64 overflow-y-auto p-4">
              {staffPerformance.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No staff data</p>
              ) : (
                <div className="space-y-3">
                  {staffPerformance.map((s) => (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-sm font-semibold text-foreground">{s.name}</p>
                          <span className="ml-2 shrink-0 text-xs font-semibold text-success">
                            KES {s.sales.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {s.conversionRate != null ? (
                            <>
                              <Progress
                                value={s.conversionRate * 100}
                                className="h-1.5 flex-1 bg-muted [&>div]:bg-warning"
                              />
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {(s.conversionRate * 100).toFixed(0)}%
                              </span>
                            </>
                          ) : (
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {s.transactions} order{s.transactions !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Tabs.Content>
          </Tabs.Root>
        )}
      </CardContent>
    </Card>
  );
}
