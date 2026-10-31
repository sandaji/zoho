"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Check, X, ShieldCheck, ShieldAlert, Plus, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHasPermission } from "@/hooks/use-permissions";
import {
  workflowService,
  WF_STATUS_COLORS,
  type WfInboxItem,
  type WfInstance,
  type WfDelegation,
  type WfDefinition,
  type WfStageDef,
} from "@/lib/workflow.service";

const money = (n?: number | null) =>
  n == null ? "—" : `KSh ${n.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
const when = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");
const who = (p?: { name?: string | null; email: string } | null) => p?.name || p?.email || "—";
const err = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

function StatusBadge({ status }: { status: string }) {
  return <Badge className={WF_STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600"}>{status}</Badge>;
}

export default function ApprovalsPage() {
  const { hasPermission } = useHasPermission();
  const canDesign = hasPermission("workflow.design.manage");
  const canViewAll = hasPermission("workflow.view_all") || canDesign;

  const [inbox, setInbox] = useState<WfInboxItem[]>([]);
  const [mine, setMine] = useState<WfInstance[]>([]);
  const [all, setAll] = useState<WfInstance[]>([]);
  const [delegations, setDelegations] = useState<WfDelegation[]>([]);
  const [defs, setDefs] = useState<WfDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [i, m, d] = await Promise.all([workflowService.inbox(), workflowService.mine(), workflowService.delegations()]);
      setInbox(i);
      setMine(m);
      setDelegations(d);
      if (canViewAll) setAll((await workflowService.all()).data);
      if (canDesign) setDefs(await workflowService.definitions());
    } catch (e) {
      toast.error(err(e));
    } finally {
      setLoading(false);
    }
  }, [canViewAll, canDesign]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Approvals</h1>
          <p className="text-sm text-muted-foreground">Requests waiting on you, requests you raised, and who can act for you.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">My approvals{inbox.length ? ` (${inbox.length})` : ""}</TabsTrigger>
          <TabsTrigger value="mine">My requests</TabsTrigger>
          <TabsTrigger value="delegations">Delegation</TabsTrigger>
          {canViewAll && <TabsTrigger value="all">All requests</TabsTrigger>}
          {canDesign && <TabsTrigger value="design">Designer</TabsTrigger>}
        </TabsList>

        <TabsContent value="inbox">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Raised by</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inbox.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Nothing is waiting on you.
                      </TableCell>
                    </TableRow>
                  )}
                  {inbox.map((it) => (
                    <TableRow key={it.step.id}>
                      <TableCell>
                        <div className="font-medium">{it.instance.title}</div>
                        <div className="text-xs text-muted-foreground">{it.instance.instanceNumber}</div>
                      </TableCell>
                      <TableCell>
                        {it.step.name}
                        {it.step.escalatedAt && <Badge className="ml-2 bg-rose-100 text-rose-700">Overdue</Badge>}
                        {it.onBehalfOfId && <Badge className="ml-2 bg-sky-100 text-sky-700">Delegated to you</Badge>}
                      </TableCell>
                      <TableCell>{who((it.instance as any).requestedBy)}</TableCell>
                      <TableCell className="text-right">{money(it.instance.amount)}</TableCell>
                      <TableCell className="text-sm">{when(it.step.dueAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => setOpenId(it.instance.id)}>
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mine">
          <InstanceTable rows={mine} onOpen={setOpenId} empty="You haven't raised any approval requests." />
        </TabsContent>

        <TabsContent value="delegations">
          <DelegationPanel rows={delegations} onChanged={load} />
        </TabsContent>

        {canViewAll && (
          <TabsContent value="all">
            <InstanceTable rows={all} onOpen={setOpenId} empty="No requests yet." showRequester />
          </TabsContent>
        )}

        {canDesign && (
          <TabsContent value="design">
            <Designer defs={defs} onSaved={load} />
          </TabsContent>
        )}
      </Tabs>

      <DetailDialog id={openId} canDesign={canDesign} onClose={() => setOpenId(null)} onChanged={load} />
    </div>
  );
}

function InstanceTable({
  rows,
  onOpen,
  empty,
  showRequester,
}: {
  rows: WfInstance[];
  onOpen: (id: string) => void;
  empty: string;
  showRequester?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request</TableHead>
              {showRequester && <TableHead>Raised by</TableHead>}
              <TableHead>Progress</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Raised</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {empty}
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => {
              const steps = r.steps ?? [];
              const done = steps.filter((s) => s.status === "APPROVED").length;
              return (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => onOpen(r.id)}>
                  <TableCell>
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{r.instanceNumber}</div>
                  </TableCell>
                  {showRequester && <TableCell>{who((r as any).requestedBy)}</TableCell>}
                  <TableCell className="text-sm">
                    {done}/{steps.length} stages
                  </TableCell>
                  <TableCell className="text-right">{money(r.amount)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                    {r.status === "APPROVED" && !r.outcomeApplied && (
                      <Badge className="ml-2 bg-rose-100 text-rose-700">Outcome failed</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{when(r.createdAt)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DetailDialog({
  id,
  canDesign,
  onClose,
  onChanged,
}: {
  id: string | null;
  canDesign: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [inst, setInst] = useState<WfInstance | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      setInst(await workflowService.get(id));
    } catch (e) {
      toast.error(err(e));
      onClose();
    }
  }, [id, onClose]);

  useEffect(() => {
    setInst(null);
    setComment("");
    refresh();
  }, [refresh]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      setComment("");
      await refresh();
      onChanged();
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };

  const actionable = inst?.steps?.filter((s) => inst.actionableStepIds?.includes(s.id)) ?? [];

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {!inst ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {inst.title} <StatusBadge status={inst.status} />
              </DialogTitle>
              <DialogDescription>
                {inst.instanceNumber} · raised by {who(inst.requestedBy)} · {when(inst.createdAt)}
                {inst.amount != null && ` · ${money(inst.amount)}`}
              </DialogDescription>
            </DialogHeader>

            {inst.summary && <p className="text-sm">{inst.summary}</p>}

            {inst.status === "APPROVED" && !inst.outcomeApplied && (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                Approved, but applying the result failed: {inst.outcomeError || "unknown error"}
                {canDesign && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-3"
                    disabled={busy}
                    onClick={() => run(() => workflowService.retryOutcome(inst.id), "Outcome retried")}
                  >
                    Retry
                  </Button>
                )}
              </div>
            )}

            <div>
              <h4 className="mb-2 text-sm font-semibold">Stages</h4>
              <div className="space-y-2">
                {inst.steps?.map((s) => (
                  <div key={s.id} className="flex items-start justify-between rounded-md border p-2 text-sm">
                    <div>
                      <div className="font-medium">
                        {s.order}. {s.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.actedAt
                          ? `${who(s.actedBy)}${s.onBehalfOf ? ` (for ${who(s.onBehalfOf)})` : ""} · ${when(s.actedAt)}`
                          : s.dueAt
                            ? `Due ${when(s.dueAt)}`
                            : "Not started"}
                        {s.comment && ` — “${s.comment}”`}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {s.escalatedAt && s.status === "PENDING" && <Badge className="bg-rose-100 text-rose-700">Overdue</Badge>}
                      <StatusBadge status={s.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {actionable.length > 0 && (
              <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50/50 p-3">
                <Label>Your decision on “{actionable.map((a) => a.name).join(", ")}”</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Comment (required to reject)"
                  rows={2}
                />
                <div className="flex gap-2">
                  {actionable.map((a) => (
                    <div key={a.id} className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => run(() => workflowService.decide(a.id, "APPROVE", comment), "Approved")}
                      >
                        <Check className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy || !comment.trim()}
                        onClick={() => run(() => workflowService.decide(a.id, "REJECT", comment), "Rejected")}
                      >
                        <X className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold">History</h4>
                {inst.chainIntact ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <ShieldCheck className="h-4 w-4" /> Trail verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-rose-600">
                    <ShieldAlert className="h-4 w-4" /> Trail altered — escalate to audit
                  </span>
                )}
              </div>
              <ol className="space-y-1 border-l pl-4 text-sm">
                {inst.events?.map((e) => (
                  <li key={e.id}>
                    <span className="font-medium">{e.action}</span> · {e.actor ? who(e.actor) : "System"}
                    {e.onBehalfOf && ` (for ${who(e.onBehalfOf)})`}
                    <span className="text-xs text-muted-foreground"> · {when(e.createdAt)}</span>
                    {e.comment && <div className="text-muted-foreground">“{e.comment}”</div>}
                  </li>
                ))}
              </ol>
            </div>

            {inst.status === "PENDING" && (
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <div className="flex w-full gap-2">
                  <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a note…" />
                  <Button
                    variant="outline"
                    disabled={busy || !comment.trim()}
                    onClick={() => run(() => workflowService.comment(inst.id, comment), "Note added")}
                  >
                    Add
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start text-rose-600"
                  disabled={busy}
                  onClick={() => {
                    const reason = window.prompt("Reason for withdrawing this request?");
                    if (reason?.trim()) run(() => workflowService.cancel(inst.id, reason.trim()), "Request withdrawn");
                  }}
                >
                  Withdraw request
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DelegationPanel({ rows, onChanged }: { rows: WfDelegation[]; onChanged: () => void }) {
  const [toEmail, setToEmail] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await workflowService.delegate({
        toEmail,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        reason,
      });
      toast.success("Delegation created");
      setToEmail("");
      setReason("");
      onChanged();
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delegate my approvals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            While active, they can decide requests as you. Segregation of duties still applies to both of you. Max 90 days.
          </p>
          <div>
            <Label>Their email</Label>
            <Input value={toEmail} onChange={(e) => setToEmail(e.target.value)} type="email" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>From</Label>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div>
              <Label>Until</Label>
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Annual leave" />
          </div>
          <Button onClick={submit} disabled={busy || !toEmail || !startsAt || !endsAt}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Delegate
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active delegations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
          {rows.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <div>
                {who(d.fromUser)} → {who(d.toUser)}
                <div className="text-xs text-muted-foreground">
                  {when(d.startsAt)} – {when(d.endsAt)}
                  {d.reason && ` · ${d.reason}`}
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={async () => {
                  try {
                    await workflowService.revokeDelegation(d.id);
                    toast.success("Delegation revoked");
                    onChanged();
                  } catch (e) {
                    toast.error(err(e));
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Designer({ defs, onSaved }: { defs: WfDefinition[]; onSaved: () => void }) {
  return (
    <div className="space-y-4">
      {defs.map((d) => (
        <DefinitionEditor key={d.id + d.stages.length} def={d} onSaved={onSaved} />
      ))}
    </div>
  );
}

function DefinitionEditor({ def, onSaved }: { def: WfDefinition; onSaved: () => void }) {
  const [active, setActive] = useState(def.isActive);
  const [stages, setStages] = useState<WfStageDef[]>(
    def.stages.map((s) => ({
      order: s.order,
      name: s.name,
      approverPermission: s.approverPermission,
      branchScoped: s.branchScoped,
      minAmount: s.minAmount ?? null,
      escalateAfterHours: s.escalateAfterHours ?? null,
      escalateToPermission: s.escalateToPermission ?? null,
    })),
  );
  const [busy, setBusy] = useState(false);

  const patch = (i: number, p: Partial<WfStageDef>) => setStages((s) => s.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const num = (v: string) => (v === "" ? null : Number(v));

  const save = async () => {
    setBusy(true);
    try {
      await workflowService.saveDefinition(def.code, { isActive: active, stages });
      toast.success("Workflow saved");
      onSaved();
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{def.name}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {def.code} · applies to {def.entityType}. Stages with the same order run in parallel and all must approve.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
        </label>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((s, i) => (
          <div key={i} className="grid gap-2 rounded-md border p-3 md:grid-cols-6">
            <div>
              <Label className="text-xs">Order</Label>
              <Input type="number" min={1} value={s.order} onChange={(e) => patch(i, { order: Number(e.target.value) })} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Name</Label>
              <Input value={s.name} onChange={(e) => patch(i, { name: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Label className="text-xs">Approver permission</Label>
              <Input value={s.approverPermission} onChange={(e) => patch(i, { approverPermission: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Min amount</Label>
              <Input
                type="number"
                value={s.minAmount ?? ""}
                onChange={(e) => patch(i, { minAmount: num(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Escalate after (h)</Label>
              <Input
                type="number"
                value={s.escalateAfterHours ?? ""}
                onChange={(e) => patch(i, { escalateAfterHours: num(e.target.value) })}
              />
            </div>
            <div className="md:col-span-3">
              <Label className="text-xs">Escalate to permission</Label>
              <Input
                value={s.escalateToPermission ?? ""}
                onChange={(e) => patch(i, { escalateToPermission: e.target.value || null })}
              />
            </div>
            <div className="flex items-end justify-between">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={s.branchScoped}
                  onChange={(e) => patch(i, { branchScoped: e.target.checked })}
                />
                Same branch only
              </label>
              <Button size="icon" variant="ghost" onClick={() => setStages((x) => x.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setStages((s) => [
                ...s,
                {
                  order: (s[s.length - 1]?.order ?? 0) + 1,
                  name: "New stage",
                  approverPermission: "",
                  branchScoped: false,
                },
              ])
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Add stage
          </Button>
          <Button size="sm" onClick={save} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save workflow
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
