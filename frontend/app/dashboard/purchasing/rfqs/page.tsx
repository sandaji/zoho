"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHasPermission } from "@/hooks/use-permissions";
import { rfqService, RFQ_STATUS_COLORS, type RfqDetail, type RfqQuote, type RfqRow } from "@/lib/rfq.service";

const kes = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;
const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "—");
const err = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

export default function RfqsPage() {
  const { hasPermission } = useHasPermission();
  const canManage = hasPermission("purchasing.rfq.manage");
  const canAward = hasPermission("purchasing.rfq.award");
  const [rows, setRows] = useState<RfqRow[]>([]);
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await rfqService.list(status === "ALL" ? undefined : status));
    } catch (e) {
      toast.error(err(e));
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Requests for quotation</h1>
          <p className="text-sm text-muted-foreground">Invite vendors, compare their quotes side by side, and award into a draft LPO.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/purchasing/suppliers">Supplier scorecards</Link>
          </Button>
          {canManage && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="mr-1 h-4 w-4" /> New RFQ
            </Button>
          )}
        </div>
      </div>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All statuses</SelectItem>
          {["DRAFT", "OPEN", "CLOSED", "AWARDED", "CANCELLED"].map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RFQ</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Quotes</TableHead>
                <TableHead>Closes</TableHead>
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
                    No RFQs.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpenId(r.id)}>
                  <TableCell>
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{r.rfqNumber}</div>
                  </TableCell>
                  <TableCell>{r.itemCount}</TableCell>
                  <TableCell className="tabular-nums">
                    {r.submitted}/{r.invited}
                  </TableCell>
                  <TableCell>{day(r.closingDate)}</TableCell>
                  <TableCell>
                    <Badge className={RFQ_STATUS_COLORS[r.status]}>{r.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <RfqDialog id={openId} canManage={canManage} canAward={canAward} onClose={() => setOpenId(null)} onChanged={load} />
      <NewRfqDialog open={creating} onClose={() => setCreating(false)} onCreated={(id) => { load(); setOpenId(id); }} />
    </div>
  );
}

// ------------------------------------------------------------------ detail

function RfqDialog({ id, canManage, canAward, onClose, onChanged }: { id: string | null; canManage: boolean; canAward: boolean; onClose: () => void; onChanged: () => void }) {
  const [r, setR] = useState<RfqDetail | null>(null);
  const [quoteFor, setQuoteFor] = useState<RfqQuote | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      setR(await rfqService.get(id));
    } catch (e) {
      toast.error(err(e));
      onClose();
    }
  }, [id, onClose]);
  useEffect(() => {
    setR(null);
    setPick(null);
    setReason("");
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

  const submitted = r?.quotes.filter((q) => q.status === "SUBMITTED") ?? [];
  const rankOf = (qid: string) => r?.comparison.ranking.find((x) => x.quoteId === qid);
  const chosen = pick ?? r?.comparison.recommendedQuoteId ?? null;
  const needsReason = !!chosen && (chosen !== r?.comparison.recommendedQuoteId || chosen !== r?.comparison.lowestPriceQuoteId);

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        {!r ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {r.title} <Badge className={RFQ_STATUS_COLORS[r.status]}>{r.status}</Badge>
              </DialogTitle>
              <DialogDescription>
                {r.rfqNumber} · closes {day(r.closingDate)}
                {r.exceptionReason && ` · fewer than 3 vendors: ${r.exceptionReason}`}
                {r.po && ` · LPO ${r.po.poNumber} (${r.po.status})`}
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    {r.quotes.map((q) => (
                      <TableHead key={q.id} className="min-w-36 text-right">
                        {q.vendor?.name}
                        <div className="text-xs font-normal text-muted-foreground">{q.status === "SUBMITTED" ? "Quoted" : q.status === "DECLINED" ? "Declined" : "Awaiting"}</div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.description}</TableCell>
                      <TableCell className="text-right tabular-nums">{it.quantity}</TableCell>
                      {r.quotes.map((q) => {
                        const p = q.prices[it.id];
                        const best = p != null && p === r.comparison.lowestPerItem[it.id];
                        return (
                          <TableCell key={q.id} className={`text-right tabular-nums ${best ? "font-semibold text-emerald-700" : ""}`}>
                            {p != null ? kes(p) : "—"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                  {submitted.length > 0 && (
                    <>
                      <Row label="Total (ex-VAT)" quotes={r.quotes} cell={(q) => (q.total != null ? kes(q.total) : "—")} strong highlight={(q) => q.id === r.comparison.lowestPriceQuoteId} />
                      <Row label="Lead time" quotes={r.quotes} cell={(q) => (q.leadTimeDays != null ? `${q.leadTimeDays} days` : "—")} />
                      <Row label="Payment terms" quotes={r.quotes} cell={(q) => q.paymentTerms ?? "—"} />
                      <Row label="Valid until" quotes={r.quotes} cell={(q) => (q.validUntil ? `${day(q.validUntil)}${q.expired ? " (expired)" : ""}` : "—")} />
                      <Row
                        label="Supplier record"
                        quotes={r.quotes}
                        cell={(q) =>
                          q.performance?.combined != null ? `${q.performance.combined}/5${q.performance.onTimePct != null ? ` · ${q.performance.onTimePct}% on time` : ""}` : "No history"
                        }
                      />
                      <Row
                        label="Score"
                        quotes={r.quotes}
                        cell={(q) => {
                          const k = rankOf(q.id);
                          return k ? `${k.score}${q.id === r.comparison.recommendedQuoteId ? " ★" : ""}` : "—";
                        }}
                        strong
                        highlight={(q) => q.id === r.comparison.recommendedQuoteId}
                      />
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
            {submitted.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Score = price {Math.round(r.comparison.weights.price * 100)}% + supplier record {Math.round(r.comparison.weights.performance * 100)}% + lead time {Math.round(r.comparison.weights.leadTime * 100)}%. A supplier
                with no history is scored neutrally.
              </p>
            )}

            {r.status === "OPEN" && canManage && (
              <div className="flex flex-wrap gap-2">
                {r.quotes.map((q) => (
                  <Button key={q.id} size="sm" variant={q.status === "SUBMITTED" ? "outline" : "default"} onClick={() => setQuoteFor(q)}>
                    {q.status === "SUBMITTED" ? "Edit" : "Record"} quote: {q.vendor?.name}
                  </Button>
                ))}
              </div>
            )}

            {r.status === "CLOSED" && canAward && submitted.length > 0 && (
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                <Label>Award to</Label>
                <Select value={chosen ?? ""} onValueChange={setPick}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a quote…" />
                  </SelectTrigger>
                  <SelectContent>
                    {submitted.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.vendor?.name} — {kes(q.total ?? 0)} — score {rankOf(q.id)?.score}
                        {q.id === r.comparison.recommendedQuoteId ? " (recommended)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {needsReason && <Textarea rows={2} placeholder="Why this quote? Required when it is not both the best-scoring and the cheapest." value={reason} onChange={(e) => setReason(e.target.value)} />}
                <Button disabled={busy || !chosen || (needsReason && reason.trim().length < 10)} onClick={() => run(() => rfqService.award(r.id, { quoteId: chosen!, reason }), "Awarded: draft LPO created")}>
                  Award &amp; create draft LPO
                </Button>
                <p className="text-xs text-muted-foreground">Someone other than the person who ran the RFQ must award it. The LPO still goes through Finance and approval as usual.</p>
              </div>
            )}
            {r.awardReason && <p className="text-sm text-muted-foreground">Award reason: {r.awardReason}</p>}

            <DialogFooter className="flex-wrap gap-2">
              {r.status === "DRAFT" && canManage && (
                <Button disabled={busy} onClick={() => run(() => rfqService.send(r.id), "RFQ opened")}>
                  Open for quotes
                </Button>
              )}
              {r.status === "OPEN" && canManage && (
                <Button disabled={busy || submitted.length === 0} onClick={() => run(() => rfqService.close(r.id), "RFQ closed")}>
                  Close &amp; compare
                </Button>
              )}
              {["OPEN", "CLOSED"].includes(r.status) && canManage && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    const d = window.prompt("New closing date (YYYY-MM-DD)", "");
                    if (d) run(() => rfqService.extend(r.id, d), "Closing date moved");
                  }}
                >
                  Extend closing date
                </Button>
              )}
              {!["AWARDED", "CANCELLED"].includes(r.status) && canManage && (
                <Button variant="ghost" disabled={busy} onClick={() => run(() => rfqService.cancel(r.id, "Cancelled from RFQ screen"), "RFQ cancelled")}>
                  Cancel RFQ
                </Button>
              )}
            </DialogFooter>
            <QuoteDialog rfq={r} quote={quoteFor} onClose={() => setQuoteFor(null)} onSaved={() => { setQuoteFor(null); refresh(); onChanged(); }} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, quotes, cell, strong, highlight }: { label: string; quotes: RfqQuote[]; cell: (q: RfqQuote) => string; strong?: boolean; highlight?: (q: RfqQuote) => boolean }) {
  return (
    <TableRow className="bg-muted/30">
      <TableCell colSpan={2} className={strong ? "font-semibold" : "text-muted-foreground"}>
        {label}
      </TableCell>
      {quotes.map((q) => (
        <TableCell key={q.id} className={`text-right text-sm tabular-nums ${strong ? "font-semibold" : ""} ${highlight?.(q) ? "text-emerald-700" : ""}`}>
          {q.status === "SUBMITTED" ? cell(q) : "—"}
        </TableCell>
      ))}
    </TableRow>
  );
}

function QuoteDialog({ rfq, quote, onClose, onSaved }: { rfq: RfqDetail; quote: RfqQuote | null; onClose: () => void; onSaved: () => void }) {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [d, setD] = useState({ leadTimeDays: "", paymentTerms: "", validUntil: "", notes: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!quote) return;
    setPrices(Object.fromEntries(rfq.items.map((i) => [i.id, quote.prices[i.id] != null ? String(quote.prices[i.id]) : ""])));
    setD({ leadTimeDays: quote.leadTimeDays != null ? String(quote.leadTimeDays) : "", paymentTerms: quote.paymentTerms ?? "", validUntil: quote.validUntil?.slice(0, 10) ?? "", notes: quote.notes ?? "" });
  }, [quote, rfq.items]);

  const save = async (decline = false) => {
    if (!quote) return;
    setBusy(true);
    try {
      if (decline) await rfqService.declineQuote(rfq.id, quote.vendorId, d.notes);
      else
        await rfqService.recordQuote(rfq.id, quote.vendorId, {
          leadTimeDays: Number(d.leadTimeDays),
          paymentTerms: d.paymentTerms,
          validUntil: d.validUntil || undefined,
          notes: d.notes,
          lines: rfq.items.map((i) => ({ itemId: i.id, unitPrice: Number(prices[i.id]) })),
        });
      toast.success(decline ? "Marked as declined" : "Quote recorded");
      onSaved();
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!quote} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quote from {quote?.vendor?.name}</DialogTitle>
          <DialogDescription>Enter the unit price for every item, exactly as quoted (excluding VAT).</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {rfq.items.map((i) => (
            <div key={i.id} className="grid grid-cols-[1fr_8rem] items-center gap-2">
              <span className="text-sm">
                {i.description} <span className="text-muted-foreground">× {i.quantity}</span>
              </span>
              <Input type="number" min={0} step="0.01" value={prices[i.id] ?? ""} onChange={(e) => setPrices((p) => ({ ...p, [i.id]: e.target.value }))} />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div>
              <Label>Lead time (days)</Label>
              <Input type="number" value={d.leadTimeDays} onChange={(e) => setD((x) => ({ ...x, leadTimeDays: e.target.value }))} />
            </div>
            <div>
              <Label>Valid until</Label>
              <Input type="date" value={d.validUntil} onChange={(e) => setD((x) => ({ ...x, validUntil: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Payment terms</Label>
              <Input placeholder="e.g. NET_30" value={d.paymentTerms} onChange={(e) => setD((x) => ({ ...x, paymentTerms: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Input value={d.notes} onChange={(e) => setD((x) => ({ ...x, notes: e.target.value }))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" disabled={busy} onClick={() => save(true)}>
            Vendor declined
          </Button>
          <Button disabled={busy || d.leadTimeDays === "" || rfq.items.some((i) => !(Number(prices[i.id]) > 0))} onClick={() => save(false)}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save quote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------ create

type NewItem = { productId?: string; description: string; quantity: string };

function NewRfqDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [opts, setOpts] = useState<{ vendors: { id: string; name: string }[]; warehouses: { id: string; name: string }[] }>({ vendors: [], warehouses: [] });
  const [reqs, setReqs] = useState<{ id: string; number: string; items: number }[]>([]);
  const [d, setD] = useState({ title: "", closingDate: "", warehouseId: "", requisitionId: "", notes: "", exceptionReason: "" });
  const [items, setItems] = useState<NewItem[]>([]);
  const [vendorIds, setVendorIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<{ id: string; name: string; sku: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    rfqService.options().then(setOpts).catch((e) => toast.error(err(e)));
    rfqService.requisitions().then(setReqs).catch(() => setReqs([]));
  }, [open]);
  useEffect(() => {
    if (search.trim().length < 2) return setHits([]);
    const t = setTimeout(() => rfqService.products(search).then(setHits).catch(() => setHits([])), 250);
    return () => clearTimeout(t);
  }, [search]);

  const fromReq = !!d.requisitionId && items.length === 0;
  const save = async () => {
    setBusy(true);
    try {
      const r = await rfqService.create({
        title: d.title,
        closingDate: new Date(`${d.closingDate}T23:59:00`).toISOString(),
        warehouseId: d.warehouseId || undefined,
        requisitionId: d.requisitionId || undefined,
        notes: d.notes,
        exceptionReason: d.exceptionReason,
        vendorIds,
        items: items.map((i) => ({ productId: i.productId, description: i.description, quantity: Number(i.quantity) })),
      });
      toast.success(`${r.rfqNumber} created`);
      setD({ title: "", closingDate: "", warehouseId: "", requisitionId: "", notes: "", exceptionReason: "" });
      setItems([]);
      setVendorIds([]);
      onClose();
      onCreated(r.id);
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New request for quotation</DialogTitle>
          <DialogDescription>Saved as a draft. Open it for quotes once the vendors have been contacted.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Title</Label>
            <Input value={d.title} onChange={(e) => setD((x) => ({ ...x, title: e.target.value }))} />
          </div>
          <div>
            <Label>Quotes due by</Label>
            <Input type="date" value={d.closingDate} onChange={(e) => setD((x) => ({ ...x, closingDate: e.target.value }))} />
          </div>
          <div>
            <Label>Deliver to</Label>
            <Select value={d.warehouseId} onValueChange={(v) => setD((x) => ({ ...x, warehouseId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Warehouse…" />
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
          {reqs.length > 0 && (
            <div className="col-span-2">
              <Label>Copy items from an approved requisition (optional)</Label>
              <Select value={d.requisitionId || "NONE"} onValueChange={(v) => setD((x) => ({ ...x, requisitionId: v === "NONE" ? "" : v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None: add items below</SelectItem>
                  {reqs.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.number} ({r.items} items)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {!fromReq && (
          <div className="space-y-2">
            <Label>Items</Label>
            <div className="relative">
              <Input placeholder="Search a product by name or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
              {hits.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow">
                  {hits.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setItems((it) => (it.some((x) => x.productId === h.id) ? it : [...it, { productId: h.id, description: h.name, quantity: "1" }]));
                        setSearch("");
                        setHits([]);
                      }}
                    >
                      {h.name} <span className="text-xs text-muted-foreground">{h.sku}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => setItems((it) => [...it, { description: "", quantity: "1" }])}>
              <Plus className="mr-1 h-4 w-4" /> Add a non-stock item
            </Button>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_6rem_auto] items-center gap-2">
                <Input
                  disabled={!!it.productId}
                  placeholder="Description"
                  value={it.description}
                  onChange={(e) => setItems((l) => l.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                />
                <Input type="number" min={1} value={it.quantity} onChange={(e) => setItems((l) => l.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} />
                <Button type="button" size="icon" variant="ghost" onClick={() => setItems((l) => l.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div>
          <Label>Invite vendors (3 or more for a competitive RFQ)</Label>
          <div className="mt-1 grid max-h-40 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
            {opts.vendors.map((v) => (
              <label key={v.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={vendorIds.includes(v.id)} onChange={(e) => setVendorIds((l) => (e.target.checked ? [...l, v.id] : l.filter((x) => x !== v.id)))} />
                {v.name}
              </label>
            ))}
          </div>
        </div>
        {vendorIds.length > 0 && vendorIds.length < 3 && (
          <div>
            <Label>Why fewer than 3 vendors? (required)</Label>
            <Input placeholder="e.g. sole authorised distributor" value={d.exceptionReason} onChange={(e) => setD((x) => ({ ...x, exceptionReason: e.target.value }))} />
          </div>
        )}
        <DialogFooter>
          <Button
            onClick={save}
            disabled={busy || !d.title.trim() || !d.closingDate || vendorIds.length === 0 || (!d.requisitionId && (items.length === 0 || items.some((i) => !i.description.trim() || !(Number(i.quantity) > 0)))) || (vendorIds.length < 3 && d.exceptionReason.trim().length < 10)}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create RFQ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
