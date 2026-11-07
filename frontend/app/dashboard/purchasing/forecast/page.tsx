"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowDown, ArrowRight, ArrowUp, Loader2, RefreshCw, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { forecastService, type ForecastResult, type ForecastRow, type Urgency } from "@/lib/forecast.service";
import { useHasPermission } from "@/hooks/use-permissions";

const URGENCY_STYLE: Record<Urgency, string> = {
  STOCKOUT: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200",
  CRITICAL: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200",
  REORDER: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  OK: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  OVERSTOCK: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
  NO_DEMAND: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
};
const URGENCY_LABEL: Record<Urgency, string> = {
  STOCKOUT: "Out of stock",
  CRITICAL: "Critical",
  REORDER: "Reorder",
  OK: "OK",
  OVERSTOCK: "Overstock",
  NO_DEMAND: "No recent sales",
};
const money = (n: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

export default function ForecastPage() {
  const { hasPermission } = useHasPermission();
  const canRaise = hasPermission("purchasing.forecast.requisition");

  const [data, setData] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [coverDays, setCoverDays] = useState(30);
  const [filter, setFilter] = useState<Urgency | "ACTION" | "ALL">("ACTION");
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [dialog, setDialog] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchId, setBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await forecastService.get({ coverDays, search: search || undefined }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load forecast");
    } finally {
      setLoading(false);
    }
  }, [coverDays, search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const rows = useMemo(() => {
    const all = data?.rows ?? [];
    if (filter === "ALL") return all;
    if (filter === "ACTION") return all.filter((r) => r.suggestedQty > 0);
    return all.filter((r) => r.urgency === filter);
  }, [data, filter]);

  const toggle = (r: ForecastRow) =>
    setPicked((p) => {
      const n = { ...p };
      if (n[r.productId] !== undefined) delete n[r.productId];
      else n[r.productId] = Math.max(1, r.suggestedQty);
      return n;
    });

  const pickAllVisible = () =>
    setPicked((p) => {
      const n = { ...p };
      for (const r of rows) if (r.suggestedQty > 0) n[r.productId] = n[r.productId] ?? r.suggestedQty;
      return n;
    });

  const pickedRows = (data?.rows ?? []).filter((r) => picked[r.productId] !== undefined);
  const pickedTotal = pickedRows.reduce((s, r) => s + (picked[r.productId] ?? 0) * r.costPrice, 0);

  const openDialog = async () => {
    setDialog(true);
    if (branches.length === 0) {
      try {
        const b = await forecastService.branches();
        setBranches(b);
        if (b.length === 1 && b[0]) setBranchId(b[0].id);
      } catch {
        toast.error("Could not load branches");
      }
    }
  };

  const submit = async () => {
    if (!branchId) return toast.error("Choose a branch");
    setSaving(true);
    try {
      const out = await forecastService.createRequisition({
        branchId,
        notes: notes || undefined,
        items: pickedRows.map((r) => ({ productId: r.productId, quantity: picked[r.productId]! })),
      });
      toast.success(`Draft requisition ${out.requisitionNumber} created`);
      setDialog(false);
      setPicked({});
      setNotes("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create requisition");
    } finally {
      setSaving(false);
    }
  };

  const s = data?.summary ?? {};
  const TrendIcon = ({ t }: { t: ForecastRow["trend"] }) =>
    t === "UP" ? <ArrowUp className="h-4 w-4 text-emerald-600" /> : t === "DOWN" ? <ArrowDown className="h-4 w-4 text-red-600" /> : <ArrowRight className="h-4 w-4 text-slate-400" />;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Demand Forecast</h1>
          <p className="text-muted-foreground">
            What to reorder, based on recent sales, supplier lead time and stock already ordered.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          {canRaise && (
            <Button onClick={openDialog} disabled={pickedRows.length === 0}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Raise requisition ({pickedRows.length})
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {(["STOCKOUT", "CRITICAL", "REORDER", "OVERSTOCK"] as Urgency[]).map((u) => (
          <Card key={u} className="cursor-pointer" onClick={() => setFilter(u)}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{s[u] ?? 0}</div>
              <div className="text-sm text-muted-foreground">{URGENCY_LABEL[u]}</div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{money(s.suggestedSpend ?? 0)}</div>
            <div className="text-sm text-muted-foreground">Suggested spend</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>
            Daily demand blends the last 28 and 90 days of sales. Suggested quantity covers lead time plus {coverDays} days, a safety buffer, minus stock on hand and on order.
          </CardDescription>
          <div className="flex flex-wrap items-end gap-3 pt-2">
            <div className="min-w-[200px] flex-1">
              <Label>Search</Label>
              <Input placeholder="Name or SKU" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="w-32">
              <Label>Cover days</Label>
              <Input type="number" min={1} max={365} value={coverDays} onChange={(e) => setCoverDays(Number(e.target.value) || 30)} />
            </div>
            <div className="w-44">
              <Label>Show</Label>
              <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTION">Needs ordering</SelectItem>
                  <SelectItem value="ALL">Everything</SelectItem>
                  {(Object.keys(URGENCY_LABEL) as Urgency[]).map((u) => (
                    <SelectItem key={u} value={u}>
                      {URGENCY_LABEL[u]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canRaise && (
              <Button variant="secondary" onClick={pickAllVisible}>
                Select all needing order
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {canRaise && <TableHead className="w-8" />}
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">On order</TableHead>
                <TableHead className="text-right">Per day</TableHead>
                <TableHead className="text-right">Next 30d</TableHead>
                <TableHead className="text-right">Cover (days)</TableHead>
                <TableHead className="text-right">Reorder pt</TableHead>
                <TableHead className="text-right">Order qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    {loading ? "Calculating…" : "Nothing to show for this filter."}
                  </TableCell>
                </TableRow>
              )}
              {rows.slice(0, 500).map((r) => (
                <TableRow key={r.productId}>
                  {canRaise && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={picked[r.productId] !== undefined}
                        onChange={() => toggle(r)}
                        aria-label={`Select ${r.name}`}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.sku} · lead {r.leadTimeDays}d
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={URGENCY_STYLE[r.urgency]} variant="secondary">
                      {URGENCY_LABEL[r.urgency]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{r.onHand}</TableCell>
                  <TableCell className="text-right">{r.onOrder}</TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1">
                      {r.dailyDemand}
                      <TrendIcon t={r.trend} />
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{r.forecastNext30}</TableCell>
                  <TableCell className="text-right">{r.daysOfCover ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.reorderPoint}</TableCell>
                  <TableCell className="text-right">
                    {picked[r.productId] !== undefined ? (
                      <Input
                        type="number"
                        min={1}
                        className="ml-auto h-8 w-20 text-right"
                        value={picked[r.productId]}
                        onChange={(e) => setPicked((p) => ({ ...p, [r.productId]: Math.max(1, Number(e.target.value) || 1) }))}
                      />
                    ) : (
                      <span className="font-semibold">{r.suggestedQty || "—"}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length > 500 && <p className="pt-3 text-sm text-muted-foreground">Showing the first 500. Narrow the search to see the rest.</p>}
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise draft requisition</DialogTitle>
            <DialogDescription>
              {pickedRows.length} items, estimated {money(pickedTotal)}. It is created as a draft; submit it from{" "}
              <Link href="/dashboard/purchasing/requisitions" className="underline">
                Requisitions
              </Link>{" "}
              to start approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Raised from demand forecast" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving || !branchId}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
