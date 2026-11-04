"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHasPermission } from "@/hooks/use-permissions";
import {
  dashboardsService,
  ENTITY_LABELS,
  type ExecutiveDash,
  type InventoryDash,
  type PendingApproval,
  type SalesDash,
} from "@/lib/dashboards.service";
import { workflowService } from "@/lib/workflow.service";

const kes = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;
const err = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "bad" | "good" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-bold ${tone === "bad" ? "text-rose-600" : tone === "good" ? "text-emerald-600" : ""}`}>
          {value}
        </div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function Bars({ rows, format = kes }: { rows: { label: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-sm text-muted-foreground">Nothing to show yet.</p>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="text-sm">
          <div className="flex justify-between">
            <span className="truncate pr-2">{r.label}</span>
            <span className="tabular-nums text-muted-foreground">{format(r.value)}</span>
          </div>
          <div className="mt-1 h-2 rounded bg-muted">
            <div className="h-2 rounded bg-emerald-500" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Pending({ rows }: { rows: PendingApproval[] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">No approvals waiting.</p>;
  return (
    <ul className="space-y-1 text-sm">
      {rows.map((r) => (
        <li key={r.entityType} className="flex justify-between">
          <span>{ENTITY_LABELS[r.entityType] ?? r.entityType}</span>
          <span className="tabular-nums">
            {r.count}
            {r.amount > 0 && <span className="text-muted-foreground"> · {kes(r.amount)}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function useLoader<T>(fn: () => Promise<T>, enabled: boolean) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      setData(await fn());
    } catch (e) {
      toast.error(err(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
  useEffect(() => {
    load();
  }, [load]);
  return { data, loading, load };
}

function Executive({ enabled }: { enabled: boolean }) {
  const { data: d, loading, load } = useLoader<ExecutiveDash>(dashboardsService.executive, enabled);
  const [queue, setQueue] = useState<any[]>([]);

  useEffect(() => {
    if (!enabled) return;
    workflowService
      .inbox()
      .then((r: any) => setQueue(Array.isArray(r) ? r : (r?.data ?? [])))
      .catch(() => setQueue([]));
  }, [enabled]);

  if (!d) return <Loading loading={loading} />;
  const g = d.sales.growthPct;
  const critical = (d.auditFindings.CRITICAL ?? 0) + (d.auditFindings.HIGH ?? 0);
  return (
    <div className="space-y-4">
      <Header onRefresh={load} loading={loading} stamp={d.generatedAt} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Sales today" value={kes(d.sales.today.total)} sub={`${d.sales.today.count} invoices`} />
        <Kpi
          label="Sales this month"
          value={kes(d.sales.monthToDate.total)}
          sub={g == null ? "No prior month to compare" : `${g >= 0 ? "▲" : "▼"} ${Math.abs(g)}% vs same period last month`}
          tone={g == null ? undefined : g >= 0 ? "good" : "bad"}
        />
        <Kpi label="Collected this month" value={kes(d.cashflow.collectedThisMonth)} />
        <Kpi label="Stock value (at cost)" value={kes(d.inventory.value)} sub={`${d.inventory.lowStock} low · ${d.inventory.outOfStock} out`} />
        <Kpi
          label="Receivables"
          value={kes(d.receivables.outstanding)}
          sub={`${kes(d.receivables.overdue)} overdue (${d.receivables.overdueCount})`}
          tone={d.receivables.overdue > 0 ? "bad" : undefined}
        />
        <Kpi
          label="Payables"
          value={kes(d.payables.outstanding)}
          sub={`${kes(d.payables.overdue)} overdue (${d.payables.overdueCount})`}
          tone={d.payables.overdue > 0 ? "bad" : undefined}
        />
        <Kpi label="Expenses awaiting approval" value={String(d.expenses.pendingCount)} sub={kes(d.expenses.pendingAmount)} />
        <Kpi
          label="High / critical audit findings"
          value={String(critical)}
          sub={critical ? "Open and unresolved" : "None open"}
          tone={critical ? "bad" : "good"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by branch (month to date)</CardTitle>
          </CardHeader>
          <CardContent>
            <Bars rows={d.branches.map((b) => ({ label: b.name, value: b.revenue }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Waiting for approval <Badge variant="secondary">{d.pendingApprovalCount}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Pending rows={d.approvals} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            My approval queue
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/approvals">Open Approvals</Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                    Nothing is waiting on you.
                  </TableCell>
                </TableRow>
              )}
              {queue.slice(0, 8).map((q) => (
                <TableRow key={q.step.id}>
                  <TableCell>
                    <Link className="font-medium hover:underline" href="/dashboard/approvals">
                      {q.instance.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">{q.instance.instanceNumber}</div>
                  </TableCell>
                  <TableCell>{q.step.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{q.instance.amount != null ? kes(q.instance.amount) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Inventory({ enabled }: { enabled: boolean }) {
  const { data: d, loading, load } = useLoader<InventoryDash>(dashboardsService.inventory, enabled);
  if (!d) return <Loading loading={loading} />;
  return (
    <div className="space-y-4">
      <Header onRefresh={load} loading={loading} stamp={d.generatedAt} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Stock value (at cost)" value={kes(d.value.value)} />
        <Kpi label="Low stock lines" value={String(d.value.lowStock)} tone={d.value.lowStock ? "bad" : "good"} />
        <Kpi label="Out of stock lines" value={String(d.value.outOfStock)} tone={d.value.outOfStock ? "bad" : "good"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.needsAttention.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                      Every line is healthy.
                    </TableCell>
                  </TableRow>
                )}
                {d.needsAttention.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {r.product}
                      <div className="text-xs text-muted-foreground">{r.sku}</div>
                    </TableCell>
                    <TableCell>{r.warehouse}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={r.status === "out_of_stock" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}>
                        {r.available}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Units by warehouse</CardTitle>
            </CardHeader>
            <CardContent>
              <Bars rows={d.stockByWarehouse.map((w) => ({ label: w.warehouse, value: w.units }))} format={(n) => n.toLocaleString()} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Last 7 days of movement</CardTitle>
            </CardHeader>
            <CardContent>
              <Bars
                rows={d.movementsLast7Days.map((m) => ({ label: `${m.type.replace(/_/g, " ")} (${m.count})`, value: Math.abs(m.units) }))}
                format={(n) => `${n.toLocaleString()} units`}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adjustments &amp; transfers awaiting approval</CardTitle>
            </CardHeader>
            <CardContent>
              <Pending rows={d.pendingApprovals} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Sales({ enabled }: { enabled: boolean }) {
  const { data: d, loading, load } = useLoader<SalesDash>(dashboardsService.sales, enabled);
  if (!d) return <Loading loading={loading} />;
  return (
    <div className="space-y-4">
      <Header onRefresh={load} loading={loading} stamp={d.generatedAt} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Sales today" value={kes(d.today.total)} sub={`${d.today.count} invoices`} />
        <Kpi label="Sales this month" value={kes(d.monthToDate.total)} sub={`${d.monthToDate.count} invoices`} />
        <Kpi label="Refunds this month" value={kes(d.monthToDate.refunds)} />
        <Kpi
          label="Overdue receivables"
          value={kes(d.overdueReceivables.amount)}
          sub={`${d.overdueReceivables.count} invoices`}
          tone={d.overdueReceivables.amount > 0 ? "bad" : undefined}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last 14 days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-36 items-end gap-1">
            {(() => {
              const max = Math.max(1, ...d.daily.map((x) => x.total));
              return d.daily.map((x) => (
                <div key={x.date} className="group flex flex-1 flex-col items-center justify-end" title={`${x.date}: ${kes(x.total)}`}>
                  <div className="w-full rounded-t bg-emerald-500" style={{ height: `${Math.max(2, (x.total / max) * 100)}%` }} />
                  <span className="mt-1 text-[10px] text-muted-foreground">{x.date.slice(8)}</span>
                </div>
              ));
            })()}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top sellers (month)</CardTitle>
          </CardHeader>
          <CardContent>
            <Bars rows={d.topSellers.map((s) => ({ label: `${s.name} (${s.documents})`, value: s.revenue }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top products (month)</CardTitle>
          </CardHeader>
          <CardContent>
            <Bars rows={d.topProducts.map((p) => ({ label: `${p.name} ×${p.units}`, value: p.revenue }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Refunds &amp; price overrides pending</CardTitle>
          </CardHeader>
          <CardContent>
            <Pending rows={d.pendingApprovals} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Header({ onRefresh, loading, stamp }: { onRefresh: () => void; loading: boolean; stamp: string }) {
  return (
    <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
      Updated {new Date(stamp).toLocaleTimeString()}
      <Button size="sm" variant="outline" onClick={onRefresh} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function Loading({ loading }: { loading: boolean }) {
  return (
    <div className="flex justify-center py-16 text-muted-foreground">
      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "No data."}
    </div>
  );
}

function Content() {
  const { hasPermission } = useHasPermission();
  const params = useSearchParams();
  const canExec = hasPermission("dashboard.executive.view");
  const canInv = hasPermission("dashboard.inventory.view");
  const canSales = hasPermission("dashboard.sales.view");
  const available = [canExec && "executive", canInv && "inventory", canSales && "sales"].filter(Boolean) as string[];
  const wanted = params.get("view");
  const [tab, setTab] = useState<string>("");
  const current = tab || (wanted && available.includes(wanted) ? wanted : available[0]);

  if (!available.length)
    return <p className="py-16 text-center text-muted-foreground">Your role does not include a dashboard yet. Ask an administrator.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Dashboards</h1>
      <Tabs value={current} onValueChange={setTab}>
        <TabsList>
          {canExec && <TabsTrigger value="executive">Executive</TabsTrigger>}
          {canInv && <TabsTrigger value="inventory">Inventory</TabsTrigger>}
          {canSales && <TabsTrigger value="sales">Sales</TabsTrigger>}
        </TabsList>
        {canExec && (
          <TabsContent value="executive">
            <Executive enabled={current === "executive"} />
          </TabsContent>
        )}
        {canInv && (
          <TabsContent value="inventory">
            <Inventory enabled={current === "inventory"} />
          </TabsContent>
        )}
        {canSales && (
          <TabsContent value="sales">
            <Sales enabled={current === "sales"} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default function DashboardsPage() {
  return (
    <Suspense fallback={<Loading loading />}>
      <Content />
    </Suspense>
  );
}
