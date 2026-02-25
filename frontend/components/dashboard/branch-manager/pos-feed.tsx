/**
 * Row 4 Left – Live POS Feed
 * Uses Radix ScrollArea. Powered by pendingOrders from dashboardService.
 */
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Clock, ShoppingBag, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PendingOrder } from "@/lib/dashboard.service";

// ── Status badge variant ─────────────────────────────────────────────────────
const statusBadge = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
  {
    variants: {
      status: {
        pending:    "bg-yellow-100 text-yellow-800",
        processing: "bg-emerald-100 text-emerald-800",
        ready:      "bg-emerald-600 text-white",
      },
    },
    defaultVariants: { status: "pending" },
  }
);

const StatusIcon = ({ status }: { status: PendingOrder["status"] }) => {
  if (status === "ready")      return <CheckCircle2 className="h-3 w-3" />;
  if (status === "processing") return <Loader2 className="h-3 w-3 animate-spin" />;
  return <Clock className="h-3 w-3" />;
};

interface PosFeedProps {
  orders: PendingOrder[];
  loading: boolean;
}

export function PosFeed({ orders, loading }: PosFeedProps) {
  return (
    <Card className="rounded-xl border border-emerald-100 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-emerald-900">Live POS Feed</CardTitle>
            <CardDescription className="text-emerald-500">Active transactions</CardDescription>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            Live
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-emerald-50" />
            ))}
          </div>
        ) : (
          <ScrollArea.Root className="h-72 overflow-hidden">
            <ScrollArea.Viewport className="h-full w-full px-4 pb-4">
              {orders.length === 0 ? (
                <div className="flex h-full items-center justify-center py-12 text-sm text-emerald-400">
                  No active orders
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-lg border border-emerald-50 bg-emerald-50/40 px-3 py-2.5 transition-colors hover:bg-emerald-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                          <ShoppingBag className="h-4 w-4 text-emerald-700" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-emerald-900">{order.id}</p>
                          <p className="text-xs text-emerald-600">
                            {order.customer} · {order.items} item{order.items !== 1 ? "s" : ""} ·{" "}
                            <span className="text-emerald-400">{order.timeElapsed}m ago</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-800">
                          KES {order.amount.toLocaleString()}
                        </p>
                        <span
                          className={cn(statusBadge({ status: order.status }))}
                        >
                          <StatusIcon status={order.status} />
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              orientation="vertical"
              className="flex touch-none select-none p-0.5 transition-colors data-[orientation=vertical]:w-2"
            >
              <ScrollArea.Thumb className="relative flex-1 rounded-full bg-emerald-200" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        )}
      </CardContent>
    </Card>
  );
}
