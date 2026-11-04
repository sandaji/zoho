"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHasPermission } from "@/hooks/use-permissions";
import { COUNT_STATUS_COLORS, stockCountService, type CountDetail, type CountSummary } from "@/lib/stock-count.service";

const kes = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;
const err = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const label = (s: string) => s.replace(/_/g, " ");

export default function StockCountsPage() {
  const { hasPermission } = useHasPermission();
  const canManage = hasPermission("inventory.count.manage");
  const [rows, setRows] = useState<CountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await stockCountService.list());
    } catch (e) {
      toast.error(err(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Stock counts</h1>
          <p className="text-sm text-muted-foreground">Count blind, review the differences, and post them only after approval.</p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" /> New count
          </Button>
        )}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Count</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Net variance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No counts yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpenId(r.id)}>
                  <TableCell>
                    <div className="font-medium">{r.countNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.type}
                      {r.category ? ` · ${r.category}` : ""} · {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>{r.warehouse}</TableCell>
                  <TableCell className="tabular-nums">
                    {r.countedCount}/{r.lineCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.totalVarianceValue != null ? kes(r.totalVarianceValue) : "—"}</TableCell>
                  <TableCell>
                    <Badge className={COUNT_STATUS_COLORS[r.status]}>{label(r.status)}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <CountDialog id={openId} canManage={canManage} onClose={() => setOpenId(null)} onChanged={load} />
      <NewCountDialog open={creating} onClose={() => setCreating(false)} onCreated={(id) => { load(); setOpenId(id); }} />
    </div>
  );
}

function CountDialog({ id, canManage, onClose, onChanged }: { id: string | null; canManage: boolean; onClose: () => void; onChanged: () => void }) {
  const [c, setC] = useState<CountDetail | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const d = await stockCountService.get(id);
      setC(d);
      setDraft({});
    } catch (e) {
      toast.error(err(e));
      onClose();
    }
  }, [id, onClose]);
  useEffect(() => {
    setC(null);
    setFilter("");
    refresh();
  }, [refresh]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      await refresh();
      onChanged();
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };

  const save = async (lineId: string) => {
    const v = draft[lineId];
    if (v === undefined || v === "" || !c) return;
    try {
      await stockCountService.enter(c.id, lineId, { countedQty: Number(v) });
      setC((cur) => cur && { ...cur, lines: cur.lines.map((l) => (l.id === lineId ? { ...l, countedQty: Number(v) } : l)) });
      setDraft((d) => {
        const { [lineId]: _, ...rest } = d;
        return rest;
      });
    } catch (e) {
      toast.error(err(e));
    }
  };

  const lines = c ? c.lines.filter((l) => !filter || l.productName.toLowerCase().includes(filter.toLowerCase()) || l.sku.toLowerCase().includes(filter.toLowerCase())) : [];
  const counting = c?.status === "COUNTING";
  const review = c?.status === "REVIEW";
  const uncounted = c ? c.lines.filter((l) => l.countedQty == null).length : 0;

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        {!c ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {c.countNumber} · {c.warehouse} <Badge className={COUNT_STATUS_COLORS[c.status]}>{label(c.status)}</Badge>
              </DialogTitle>
              <DialogDescription>
                {c.type} count{c.category ? ` of ${c.category}` : ""} · {c.lines.length} products
                {counting && ` · ${uncounted} still to count`}
                {c.blind && ["DRAFT", "COUNTING"].includes(c.status) && " · system quantities are hidden until review"}
              </DialogDescription>
            </DialogHeader>

            {c.summary && (
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Stat k="Lines with variance" v={`${c.summary.withVariance} / ${c.summary.lines}`} />
                <Stat k="Net variance" v={kes(c.summary.netValue)} bad={c.summary.netValue < 0} />
                <Stat k="Gross variance" v={kes(c.summary.absValue)} />
                <Stat k="Moved since counted" v={String(c.summary.stale)} bad={c.summary.stale > 0} />
              </div>
            )}
            {review && c.summary && c.summary.stale > 0 && (
              <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-800">
                Stock moved on {c.summary.stale} line(s) after they were counted. Send them back for recount before posting.
              </p>
            )}

            <Input placeholder="Find a product or SKU…" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <div className="max-h-[45vh] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    {c.systemVisible && <TableHead className="text-right">System</TableHead>}
                    <TableHead className="text-right">Counted</TableHead>
                    {c.systemVisible && <TableHead className="text-right">Variance</TableHead>}
                    {review && canManage && <TableHead />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l) => (
                    <TableRow key={l.id} className={l.stale ? "bg-amber-50" : l.variance ? "bg-rose-50/40" : ""}>
                      <TableCell>
                        {l.productName}
                        <div className="text-xs text-muted-foreground">{l.sku}</div>
                      </TableCell>
                      {c.systemVisible && <TableCell className="text-right tabular-nums">{l.systemQty ?? "—"}</TableCell>}
                      <TableCell className="text-right">
                        {counting ? (
                          <Input
                            className="ml-auto h-8 w-24 text-right"
                            type="number"
                            min={0}
                            value={draft[l.id] ?? (l.countedQty ?? "")}
                            onChange={(e) => setDraft((d) => ({ ...d, [l.id]: e.target.value }))}
                            onBlur={() => save(l.id)}
                            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                          />
                        ) : (
                          <span className="tabular-nums">{l.countedQty ?? "—"}</span>
                        )}
                      </TableCell>
                      {c.systemVisible && (
                        <TableCell className={`text-right tabular-nums ${l.variance ? (l.variance < 0 ? "text-rose-600" : "text-emerald-600") : ""}`}>
                          {l.variance ? `${l.variance > 0 ? "+" : ""}${l.variance}` : "—"}
                          {l.varianceValue ? <div className="text-xs text-muted-foreground">{kes(l.varianceValue)}</div> : null}
                        </TableCell>
                      )}
                      {review && canManage && (
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => stockCountService.recount(c.id, { lineIds: [l.id] }), "Sent back for recount")}>
                            Recount
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter className="flex-wrap gap-2">
              {c.status === "DRAFT" && canManage && (
                <Button disabled={busy} onClick={() => run(() => stockCountService.start(c.id), "Count started")}>
                  Start counting
                </Button>
              )}
              {counting && (
                <Button disabled={busy || uncounted > 0} onClick={() => run(() => stockCountService.submit(c.id), "Submitted for review")}>
                  {uncounted > 0 ? `${uncounted} left to count` : "Submit for review"}
                </Button>
              )}
              {review && canManage && c.summary && c.summary.stale > 0 && (
                <Button variant="outline" disabled={busy} onClick={() => run(() => stockCountService.recount(c.id, { stale: true }), "Moved lines sent back")}>
                  Recount moved lines
                </Button>
              )}
              {review && canManage && (
                <Button
                  disabled={busy || (c.summary?.stale ?? 0) > 0}
                  onClick={() =>
                    run(async () => {
                      const r = await stockCountService.post(c.id);
                      if (r.approval) toast.info(`Sent for approval (${r.approval.instanceNumber}). Decide it from Approvals.`);
                    }, "Count posted")
                  }
                >
                  Post variances
                </Button>
              )}
              {c.status === "PENDING_APPROVAL" && (
                <Button asChild variant="outline">
                  <Link href="/dashboard/approvals">Open Approvals</Link>
                </Button>
              )}
              {canManage && !["POSTED", "CANCELLED"].includes(c.status) && (
                <Button variant="ghost" disabled={busy} onClick={() => run(() => stockCountService.cancel(c.id, "Cancelled from count screen"), "Count cancelled")}>
                  Cancel count
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ k, v, bad }: { k: string; v: string; bad?: boolean }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className={`font-semibold tabular-nums ${bad ? "text-rose-600" : ""}`}>{v}</div>
    </div>
  );
}

function NewCountDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [opts, setOpts] = useState<{ warehouses: { id: string; name: string }[]; categories: string[] }>({ warehouses: [], categories: [] });
  const [d, setD] = useState({ warehouseId: "", type: "FULL", category: "", notes: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) stockCountService.warehouses().then(setOpts).catch((e) => toast.error(err(e)));
  }, [open]);

  const save = async () => {
    setBusy(true);
    try {
      const c = await stockCountService.create({ ...d, category: d.type === "CYCLE" ? d.category : undefined });
      toast.success(`${c.countNumber} created`);
      onClose();
      onCreated(c.id);
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New stock count</DialogTitle>
          <DialogDescription>Counters will not see system quantities. A warehouse can have one open count at a time.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Warehouse</Label>
            <Select value={d.warehouseId} onValueChange={(v) => setD((x) => ({ ...x, warehouseId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {opts.warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={d.type} onValueChange={(v) => setD((x) => ({ ...x, type: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FULL">Full count (every product)</SelectItem>
                <SelectItem value="CYCLE">Cycle count (one category)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {d.type === "CYCLE" && (
            <div>
              <Label>Category</Label>
              <Select value={d.category} onValueChange={(v) => setD((x) => ({ ...x, category: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {opts.categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Input value={d.notes} onChange={(e) => setD((x) => ({ ...x, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={busy || !d.warehouseId || (d.type === "CYCLE" && !d.category)}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create count
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
