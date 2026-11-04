"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHasPermission } from "@/hooks/use-permissions";
import { describePromotion, promotionService, PROMO_STATUS_COLORS, type Promotion } from "@/lib/promotion.service";

const err = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const day = (d: string) => new Date(d).toLocaleDateString();
const kes = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;

export default function PromotionsPage() {
  const { hasPermission } = useHasPermission();
  const canManage = hasPermission("sales.promotion.manage");
  const canActivate = hasPermission("sales.promotion.activate");
  const [rows, setRows] = useState<Promotion[]>([]);
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Promotion | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await promotionService.list(status === "ALL" ? undefined : status));
    } catch (e) {
      toast.error(err(e));
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (p: Promotion, fn: () => Promise<unknown>, ok: string) => {
    setBusyId(p.id);
    try {
      await fn();
      toast.success(ok);
      load();
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Promotions</h1>
          <p className="text-sm text-muted-foreground">
            Applied automatically at the till. One promotion per line (the best for the customer), never below cost unless allowed. A different person must activate each one.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus className="mr-1 h-4 w-4" /> New promotion
          </Button>
        )}
      </div>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All statuses</SelectItem>
          {["DRAFT", "ACTIVE", "PAUSED", "ENDED"].map((s) => (
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
                <TableHead>Promotion</TableHead>
                <TableHead>Offer</TableHead>
                <TableHead>Applies to</TableHead>
                <TableHead>Runs</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead className="text-right">Discount given</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No promotions.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.code}</div>
                  </TableCell>
                  <TableCell>{describePromotion(p)}</TableCell>
                  <TableCell className="text-sm">
                    {p.scope === "ALL" ? "Everything" : p.scope === "CATEGORY" ? p.categories.join(", ") : `${p.productIds.length} product(s)`}
                    {p.branchIds.length > 0 && <div className="text-xs text-muted-foreground">{p.branchIds.length} branch(es)</div>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {day(p.startsAt)} – {day(p.endsAt)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.redemptions}</TableCell>
                  <TableCell className="text-right tabular-nums">{kes(p.discountGiven)}</TableCell>
                  <TableCell>
                    <Badge className={PROMO_STATUS_COLORS[p.status]}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap text-right">
                    {canManage && ["DRAFT", "PAUSED"].includes(p.status) && (
                      <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                        Edit
                      </Button>
                    )}
                    {canActivate && p.status === "DRAFT" && (
                      <Button size="sm" disabled={busyId === p.id} onClick={() => act(p, () => promotionService.activate(p.id), "Promotion is live")}>
                        Activate
                      </Button>
                    )}
                    {canManage && p.status === "ACTIVE" && (
                      <Button size="sm" variant="outline" disabled={busyId === p.id} onClick={() => act(p, () => promotionService.pause(p.id), "Paused")}>
                        Pause
                      </Button>
                    )}
                    {canManage && p.status === "PAUSED" && p.activatedById && (
                      <Button size="sm" disabled={busyId === p.id} onClick={() => act(p, () => promotionService.resume(p.id), "Resumed")}>
                        Resume
                      </Button>
                    )}
                    {canManage && p.status !== "ENDED" && (
                      <Button size="sm" variant="ghost" disabled={busyId === p.id} onClick={() => act(p, () => promotionService.end(p.id), "Ended")}>
                        End
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <PromotionDialog target={editing} onClose={() => setEditing(null)} onSaved={load} />
    </div>
  );
}

const blank = { name: "", code: "", description: "", type: "PERCENT_OFF", value: "", buyQty: "2", getQty: "1", scope: "ALL", minQuantity: "1", startsAt: "", endsAt: "", allowBelowCost: false };
const dateOnly = (d: string) => d.slice(0, 10);

function PromotionDialog({ target, onClose, onSaved }: { target: Promotion | "new" | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState(blank);
  const [categories, setCategories] = useState<string[]>([]);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [opts, setOpts] = useState<{ categories: string[]; branches: { id: string; name: string }[] }>({ categories: [], branches: [] });
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<{ id: string; name: string; sku: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const editing = target && target !== "new" ? target : null;

  useEffect(() => {
    if (!target) return;
    promotionService.options().then(setOpts).catch((e) => toast.error(err(e)));
    if (target === "new") {
      setF(blank);
      setCategories([]);
      setBranchIds([]);
      setProducts([]);
    } else {
      setF({
        name: target.name,
        code: target.code,
        description: target.description ?? "",
        type: target.type,
        value: String(target.value || ""),
        buyQty: String(target.buyQty ?? 2),
        getQty: String(target.getQty ?? 1),
        scope: target.scope,
        minQuantity: String(target.minQuantity),
        startsAt: dateOnly(target.startsAt),
        endsAt: dateOnly(target.endsAt),
        allowBelowCost: target.allowBelowCost,
      });
      setCategories(target.categories);
      setBranchIds(target.branchIds);
      setProducts(target.productIds.map((id) => ({ id, name: id.slice(0, 8) })));
    }
  }, [target]);

  useEffect(() => {
    if (search.trim().length < 2) return setHits([]);
    const t = setTimeout(() => promotionService.products(search).then(setHits).catch(() => setHits([])), 250);
    return () => clearTimeout(t);
  }, [search]);

  const set = (k: keyof typeof blank, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const toggle = (list: string[], setList: (l: string[]) => void, v: string, on: boolean) => setList(on ? [...list, v] : list.filter((x) => x !== v));

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        ...f,
        value: Number(f.value || 0),
        buyQty: Number(f.buyQty),
        getQty: Number(f.getQty),
        minQuantity: Number(f.minQuantity || 1),
        startsAt: new Date(`${f.startsAt}T00:00:00`).toISOString(),
        endsAt: new Date(`${f.endsAt}T23:59:59`).toISOString(),
        categories,
        productIds: products.map((p) => p.id),
        branchIds,
      };
      if (editing) await promotionService.update(editing.id, body);
      else await promotionService.create(body);
      toast.success(editing ? "Saved" : "Saved as a draft. Someone else must activate it.");
      onClose();
      onSaved();
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };

  const valid =
    f.name.trim().length >= 3 &&
    f.startsAt &&
    f.endsAt &&
    (f.type === "BUY_X_GET_Y" ? Number(f.buyQty) >= 1 && Number(f.getQty) >= 1 : Number(f.value) > 0) &&
    (f.scope !== "CATEGORY" || categories.length > 0) &&
    (f.scope !== "PRODUCT" || products.length > 0);

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.code}` : "New promotion"}</DialogTitle>
          <DialogDescription>
            {editing?.activatedById ? "Editing sends it back to draft for a fresh activation." : "Saved as a draft. A different person must activate it."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Name</Label>
            <Input value={f.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label>Offer</Label>
            <Select value={f.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENT_OFF">Percent off</SelectItem>
                <SelectItem value="AMOUNT_OFF">Amount off each unit</SelectItem>
                <SelectItem value="BUY_X_GET_Y">Buy X, get Y free</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {f.type === "BUY_X_GET_Y" ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Buy</Label>
                <Input type="number" min={1} value={f.buyQty} onChange={(e) => set("buyQty", e.target.value)} />
              </div>
              <div>
                <Label>Free</Label>
                <Input type="number" min={1} value={f.getQty} onChange={(e) => set("getQty", e.target.value)} />
              </div>
            </div>
          ) : (
            <div>
              <Label>{f.type === "PERCENT_OFF" ? "Percent" : "KSh off per unit"}</Label>
              <Input type="number" min={0} value={f.value} onChange={(e) => set("value", e.target.value)} />
            </div>
          )}
          <div>
            <Label>Starts</Label>
            <Input type="date" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
          </div>
          <div>
            <Label>Ends</Label>
            <Input type="date" value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
          </div>
          <div>
            <Label>Minimum quantity on the line</Label>
            <Input type="number" min={1} value={f.minQuantity} onChange={(e) => set("minQuantity", e.target.value)} />
          </div>
          <div>
            <Label>Applies to</Label>
            <Select value={f.scope} onValueChange={(v) => set("scope", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Everything</SelectItem>
                <SelectItem value="CATEGORY">Categories</SelectItem>
                <SelectItem value="PRODUCT">Specific products</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {f.scope === "CATEGORY" && (
          <div className="grid max-h-32 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
            {opts.categories.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={categories.includes(c)} onChange={(e) => toggle(categories, setCategories, c, e.target.checked)} />
                {c}
              </label>
            ))}
          </div>
        )}
        {f.scope === "PRODUCT" && (
          <div className="space-y-2">
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
                        setProducts((l) => (l.some((x) => x.id === h.id) ? l : [...l, { id: h.id, name: h.name }]));
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
            <div className="flex flex-wrap gap-1">
              {products.map((p) => (
                <Badge key={p.id} variant="secondary" className="gap-1">
                  {p.name}
                  <button type="button" onClick={() => setProducts((l) => l.filter((x) => x.id !== p.id))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label>Branches (leave all unticked for every branch)</Label>
          <div className="mt-1 grid max-h-28 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
            {opts.branches.map((b) => (
              <label key={b.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={branchIds.includes(b.id)} onChange={(e) => toggle(branchIds, setBranchIds, b.id, e.target.checked)} />
                {b.name}
              </label>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.allowBelowCost} onChange={(e) => set("allowBelowCost", e.target.checked)} />
          Allow this to take the price below cost (clearance)
        </label>
        <DialogFooter>
          <Button disabled={busy || !valid} onClick={save}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
