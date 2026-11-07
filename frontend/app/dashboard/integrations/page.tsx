"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useHasPermission } from "@/hooks/use-permissions";
import { DELIVERY_COLORS, integrationsService, type ApiKeyRow, type DeliveryRow, type WebhookRow } from "@/lib/integrations.service";

const err = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const when = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");
const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => toast.success("Copied"), () => toast.error("Could not copy"));

export default function IntegrationsPage() {
  const { hasPermission } = useHasPermission();
  const canManage = hasPermission("integrations.manage");
  const [meta, setMeta] = useState<{ scopes: string[]; events: string[] }>({ scopes: [], events: [] });
  useEffect(() => {
    integrationsService.meta().then(setMeta).catch((e) => toast.error(err(e)));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          API keys let an app or partner read your catalogue and stock at <code>/api/v1/public/…</code>. Webhooks tell another system the moment something happens here.
        </p>
      </div>
      <Tabs defaultValue="keys">
        <TabsList>
          <TabsTrigger value="keys">API keys</TabsTrigger>
          <TabsTrigger value="hooks">Webhooks</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
        </TabsList>
        <TabsContent value="keys">
          <Keys canManage={canManage} scopes={meta.scopes} />
        </TabsContent>
        <TabsContent value="hooks">
          <Hooks canManage={canManage} events={meta.events} />
        </TabsContent>
        <TabsContent value="deliveries">
          <Deliveries canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Secret({ title, value, onClose }: { title: string; value: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Copy it now. For security it is shown only this once and cannot be retrieved later.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
          <code className="flex-1 break-all text-sm">{value}</code>
          <Button size="icon" variant="outline" onClick={() => value && copy(value)}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>I have saved it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Keys({ canManage, scopes }: { canManage: boolean; scopes: string[] }) {
  const [rows, setRows] = useState<ApiKeyRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ name: "", expiresAt: "", rateLimitPerMin: "60" });
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<string | null>(null);

  const load = useCallback(() => {
    integrationsService.keys().then(setRows).catch((e) => toast.error(err(e)));
  }, []);
  useEffect(load, [load]);

  const create = async () => {
    setBusy(true);
    try {
      const r = await integrationsService.createKey({ name: f.name, scopes: picked, expiresAt: f.expiresAt ? new Date(`${f.expiresAt}T23:59:59`).toISOString() : undefined, rateLimitPerMin: Number(f.rateLimitPerMin) || 60 });
      setCreating(false);
      setF({ name: "", expiresAt: "", rateLimitPerMin: "60" });
      setPicked([]);
      setShown(r.key);
      load();
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {canManage && (
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" /> New API key
        </Button>
      )}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Limit / min</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No API keys.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((k) => {
                const expired = k.expiresAt && new Date(k.expiresAt) < new Date();
                const live = k.isActive && !k.revokedAt && !expired;
                return (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell className="font-mono text-xs">{k.keyPrefix}…</TableCell>
                    <TableCell className="text-sm">{k.scopes.join(", ")}</TableCell>
                    <TableCell>{k.rateLimitPerMin}</TableCell>
                    <TableCell className="text-sm">{when(k.lastUsedAt)}</TableCell>
                    <TableCell>
                      <Badge className={live ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}>{k.revokedAt ? "REVOKED" : expired ? "EXPIRED" : "ACTIVE"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage && live && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            if (!window.confirm(`Revoke "${k.name}"? Anything using this key stops working immediately.`)) return;
                            try {
                              await integrationsService.revokeKey(k.id);
                              toast.success("Key revoked");
                              load();
                            } catch (e) {
                              toast.error(err(e));
                            }
                          }}
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New API key</DialogTitle>
            <DialogDescription>Give each app its own key so you can revoke one without breaking the others.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input placeholder="e.g. Mobile app, Website" value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} />
            </div>
            <div>
              <Label>Allowed access</Label>
              <div className="mt-1 space-y-1">
                {scopes.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={picked.includes(s)} onChange={(e) => setPicked((l) => (e.target.checked ? [...l, s] : l.filter((x) => x !== s)))} />
                    {s === "products:read" ? "Read products and prices" : s === "stock:read" ? "Read stock levels" : s}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Expires (optional)</Label>
                <Input type="date" value={f.expiresAt} onChange={(e) => setF((x) => ({ ...x, expiresAt: e.target.value }))} />
              </div>
              <div>
                <Label>Requests per minute</Label>
                <Input type="number" min={1} value={f.rateLimitPerMin} onChange={(e) => setF((x) => ({ ...x, rateLimitPerMin: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={busy || f.name.trim().length < 3 || picked.length === 0} onClick={create}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Secret title="Your new API key" value={shown} onClose={() => setShown(null)} />
    </div>
  );
}

function Hooks({ canManage, events }: { canManage: boolean; events: string[] }) {
  const [rows, setRows] = useState<WebhookRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ name: "", url: "" });
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<string | null>(null);

  const load = useCallback(() => {
    integrationsService.webhooks().then(setRows).catch((e) => toast.error(err(e)));
  }, []);
  useEffect(load, [load]);

  const create = async () => {
    setBusy(true);
    try {
      const r = await integrationsService.createWebhook({ name: f.name, url: f.url, events: picked });
      setCreating(false);
      setF({ name: "", url: "" });
      setPicked([]);
      setShown(r.secret);
      load();
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      load();
    } catch (e) {
      toast.error(err(e));
    }
  };

  return (
    <div className="space-y-3">
      {canManage && (
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" /> New webhook
        </Button>
      )}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead className="text-right">Sent / failed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No webhooks.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{w.url}</TableCell>
                  <TableCell className="text-sm">{w.events.join(", ")}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {w.sent ?? 0} / {w.failed ?? 0}
                  </TableCell>
                  <TableCell>
                    <Badge className={w.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}>{w.isActive ? "ACTIVE" : "OFF"}</Badge>
                  </TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap text-right">
                    {canManage && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => run(() => integrationsService.testWebhook(w.id), "Test event queued. See Deliveries.")}>
                          Send test
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => run(() => integrationsService.updateWebhook(w.id, { isActive: !w.isActive }), w.isActive ? "Switched off" : "Switched on")}>
                          {w.isActive ? "Turn off" : "Turn on"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            if (!window.confirm("Make a new signing secret? The receiver must be updated with it.")) return;
                            try {
                              const r = await integrationsService.rotateSecret(w.id);
                              setShown(r.secret);
                            } catch (e) {
                              toast.error(err(e));
                            }
                          }}
                        >
                          New secret
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New webhook</DialogTitle>
            <DialogDescription>Every request is signed with the secret (header X-Webhook-Signature) so the receiver can verify it came from here.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} />
            </div>
            <div>
              <Label>URL</Label>
              <Input placeholder="https://example.com/hooks/erp" value={f.url} onChange={(e) => setF((x) => ({ ...x, url: e.target.value }))} />
            </div>
            <div>
              <Label>Events</Label>
              <div className="mt-1 space-y-1">
                {events.map((ev) => (
                  <label key={ev} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={picked.includes(ev)} onChange={(e) => setPicked((l) => (e.target.checked ? [...l, ev] : l.filter((x) => x !== ev)))} />
                    {ev}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={busy || f.name.trim().length < 3 || !f.url.trim() || picked.length === 0} onClick={create}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Secret title="Signing secret" value={shown} onClose={() => setShown(null)} />
    </div>
  );
}

function Deliveries({ canManage }: { canManage: boolean }) {
  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const load = useCallback(() => {
    integrationsService.deliveries().then(setRows).catch((e) => toast.error(err(e)));
  }, []);
  useEffect(load, [load]);

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No deliveries yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="whitespace-nowrap text-sm">{when(d.createdAt)}</TableCell>
                <TableCell>{d.event}</TableCell>
                <TableCell>{d.attempts}</TableCell>
                <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{d.lastError ?? (d.lastStatusCode ? `HTTP ${d.lastStatusCode}` : "—")}</TableCell>
                <TableCell>
                  <Badge className={DELIVERY_COLORS[d.status]}>{d.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {canManage && d.status === "FAILED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await integrationsService.retryDelivery(d.id);
                          toast.success("Queued again");
                          load();
                        } catch (e) {
                          toast.error(err(e));
                        }
                      }}
                    >
                      Retry
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
