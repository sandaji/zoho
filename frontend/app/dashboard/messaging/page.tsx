"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHasPermission } from "@/hooks/use-permissions";
import {
  messagingService,
  MESSAGE_STATUS_COLORS,
  type Channel,
  type MessageTemplate,
  type OutboxMessage,
  type ProviderStatus,
} from "@/lib/messaging.service";

const err = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const when = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");

export default function MessagingPage() {
  const { hasPermission } = useHasPermission();
  const canSend = hasPermission("messaging.send");
  const canManage = hasPermission("messaging.manage");
  const [status, setStatus] = useState<ProviderStatus | null>(null);

  useEffect(() => {
    messagingService.status().then(setStatus).catch(() => setStatus(null));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Messaging</h1>
        <p className="text-sm text-muted-foreground">Email, SMS and WhatsApp to customers. Messages are queued and retried automatically; every attempt is logged.</p>
      </div>
      {status && (
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(status) as Channel[]).map((c) => (
            <Card key={c}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <div className="text-sm font-medium">{c}</div>
                  <div className="text-xs text-muted-foreground">{status[c].live ? `Live via ${status[c].provider}${status[c].note ? ` (${status[c].note})` : ""}` : status[c].note}</div>
                </div>
                <Badge className={status[c].live ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>{status[c].live ? "LIVE" : "TEST MODE"}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Tabs defaultValue="outbox">
        <TabsList>
          <TabsTrigger value="outbox">Message log</TabsTrigger>
          {canSend && <TabsTrigger value="send">Send</TabsTrigger>}
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="outbox">
          <Outbox canManage={canManage} />
        </TabsContent>
        {canSend && (
          <TabsContent value="send">
            <SendForm />
          </TabsContent>
        )}
        <TabsContent value="templates">
          <Templates canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Outbox({ canManage }: { canManage: boolean }) {
  const [rows, setRows] = useState<OutboxMessage[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<OutboxMessage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await messagingService.outbox({ status: status === "ALL" ? undefined : status, search: search.trim() || undefined });
      setRows(r.rows);
      setCounts(r.counts);
    } catch (e) {
      toast.error(err(e));
    } finally {
      setLoading(false);
    }
  }, [status, search]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      setOpen(null);
      load();
    } catch (e) {
      toast.error(err(e));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            {["QUEUED", "SENT", "FAILED", "CANCELLED"].map((s) => (
              <SelectItem key={s} value={s}>
                {s} {counts[s] != null ? `(${counts[s]})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input className="max-w-xs" placeholder="Search recipient or text…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button size="icon" variant="ghost" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Message</TableHead>
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
                    No messages.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((m) => (
                <TableRow key={m.id} className="cursor-pointer" onClick={() => setOpen(m)}>
                  <TableCell className="whitespace-nowrap text-sm">{when(m.createdAt)}</TableCell>
                  <TableCell>{m.channel}</TableCell>
                  <TableCell className="text-sm">{m.recipient}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{m.body}</TableCell>
                  <TableCell>
                    <Badge className={MESSAGE_STATUS_COLORS[m.status]}>{m.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {open.channel} to {open.recipient}
                </DialogTitle>
                <DialogDescription>
                  {open.status} · attempt {open.attempts}/{open.maxAttempts}
                  {open.provider && ` · via ${open.provider}`}
                  {open.sentAt && ` · sent ${when(open.sentAt)}`}
                </DialogDescription>
              </DialogHeader>
              {open.subject && <div className="text-sm font-medium">{open.subject}</div>}
              <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">{open.body}</p>
              {open.lastError && <p className="text-sm text-rose-600">Last error: {open.lastError}</p>}
              {open.status === "QUEUED" && <p className="text-xs text-muted-foreground">Next attempt {when(open.nextAttemptAt)}</p>}
              {canManage && (
                <DialogFooter>
                  {open.status === "QUEUED" && (
                    <Button variant="outline" onClick={() => act(() => messagingService.cancel(open.id), "Cancelled")}>
                      Cancel
                    </Button>
                  )}
                  {["FAILED", "CANCELLED"].includes(open.status) && <Button onClick={() => act(() => messagingService.retry(open.id), "Queued again")}>Retry</Button>}
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SendForm() {
  const [d, setD] = useState({ channel: "SMS" as Channel, to: "", subject: "", body: "" });
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      await messagingService.send({ channel: d.channel, to: d.to, subject: d.subject || undefined, body: d.body });
      toast.success("Queued. It is sent within a few seconds; check the message log.");
      setD((x) => ({ ...x, body: "" }));
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };
  const limit = d.channel === "SMS" ? 640 : d.channel === "WHATSAPP" ? 4000 : 20000;
  return (
    <Card>
      <CardContent className="grid max-w-xl gap-3 p-4">
        <div>
          <Label>Channel</Label>
          <Select value={d.channel} onValueChange={(v) => setD((x) => ({ ...x, channel: v as Channel }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SMS">SMS</SelectItem>
              <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{d.channel === "EMAIL" ? "Email address" : "Phone number"}</Label>
          <Input placeholder={d.channel === "EMAIL" ? "name@example.com" : "0712 345 678"} value={d.to} onChange={(e) => setD((x) => ({ ...x, to: e.target.value }))} />
        </div>
        {d.channel === "EMAIL" && (
          <div>
            <Label>Subject</Label>
            <Input value={d.subject} onChange={(e) => setD((x) => ({ ...x, subject: e.target.value }))} />
          </div>
        )}
        <div>
          <Label>Message</Label>
          <Textarea rows={5} value={d.body} onChange={(e) => setD((x) => ({ ...x, body: e.target.value }))} />
          <div className="text-right text-xs text-muted-foreground">
            {d.body.length}/{limit}
          </div>
        </div>
        <Button disabled={busy || !d.to.trim() || !d.body.trim() || d.body.length > limit} onClick={send}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send
        </Button>
        <p className="text-xs text-muted-foreground">To send a customer their receipt, use the sale itself; the message is filled in from the template.</p>
      </CardContent>
    </Card>
  );
}

function Templates({ canManage }: { canManage: boolean }) {
  const [rows, setRows] = useState<MessageTemplate[]>([]);
  const [edit, setEdit] = useState<MessageTemplate | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    messagingService.templates().then(setRows).catch((e) => toast.error(err(e)));
  }, []);
  useEffect(load, [load]);

  const save = async () => {
    if (!edit) return;
    setBusy(true);
    try {
      await messagingService.saveTemplate(edit.code, { name: edit.name, channel: edit.channel, subject: edit.subject, body: edit.body, isActive: edit.isActive });
      toast.success("Template saved");
      setEdit(null);
      load();
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Message</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.code}>
                  <TableCell>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.code}
                      {t.isDefault ? " · built-in" : ""}
                      {!t.isActive ? " · off" : ""}
                    </div>
                  </TableCell>
                  <TableCell>{t.channel}</TableCell>
                  <TableCell className="max-w-md truncate text-sm text-muted-foreground">{t.body}</TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <Button size="sm" variant="outline" onClick={() => setEdit(t)}>
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-xl">
          {edit && (
            <>
              <DialogHeader>
                <DialogTitle>{edit.name}</DialogTitle>
                <DialogDescription>
                  Placeholders: {"{{customer}} {{number}} {{date}} {{total}} {{paid}} {{balance}} {{balanceLine}} {{shop}}"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label>Name</Label>
                  <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                </div>
                {edit.channel === "EMAIL" && (
                  <div>
                    <Label>Subject</Label>
                    <Input value={edit.subject ?? ""} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} />
                  </div>
                )}
                <div>
                  <Label>Message</Label>
                  <Textarea rows={7} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} />
                  Active
                </label>
              </div>
              <DialogFooter>
                <Button disabled={busy || edit.body.trim().length < 2} onClick={save}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
