"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHasPermission } from "@/hooks/use-permissions";
import {
  auditGovService,
  FINDING_CATEGORIES,
  FINDING_STATUS_COLORS,
  RISK_CATEGORIES,
  RISK_STATUSES,
  SEVERITIES,
  SEVERITY_COLORS,
  type AuditFinding,
  type GovOverview,
  type RiskEntry,
} from "@/lib/audit-governance.service";

const when = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "—");
const who = (p?: { name?: string | null; email: string } | null) => p?.name || p?.email || "Unassigned";
const err = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const label = (s: string) => s.replace(/_/g, " ");
const RATING_COLORS: Record<string, string> = {
  LOW: "bg-emerald-100 text-emerald-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-rose-100 text-rose-700",
};
const cellColor = (l: number, i: number) => {
  const s = l * i;
  return s >= 15 ? "bg-rose-200" : s >= 10 ? "bg-orange-200" : s >= 5 ? "bg-amber-100" : "bg-emerald-100";
};

export default function AuditFindingsPage() {
  const { hasPermission } = useHasPermission();
  const canManage = hasPermission("audit.finding.manage");
  const canRisk = hasPermission("audit.risk.view") || hasPermission("audit.risk.manage");
  const canManageRisk = hasPermission("audit.risk.manage");
  const canOverview = canManage || hasPermission("audit.finding.view") || canRisk;

  const [overview, setOverview] = useState<GovOverview | null>(null);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [risks, setRisks] = useState<RiskEntry[]>([]);
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newFinding, setNewFinding] = useState(false);
  const [newRisk, setNewRisk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setFindings(await auditGovService.findings(status === "ALL" ? {} : { status }));
      if (canOverview) setOverview(await auditGovService.overview());
      if (canRisk) setRisks(await auditGovService.risks());
    } catch (e) {
      toast.error(err(e));
    } finally {
      setLoading(false);
    }
  }, [status, canOverview, canRisk]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Audit findings &amp; risk register</h1>
          <p className="text-sm text-muted-foreground">Issues raised by audit, who owns them, and how they were closed.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="findings">
        <TabsList>
          <TabsTrigger value="findings">Findings</TabsTrigger>
          {canRisk && <TabsTrigger value="risks">Risk register</TabsTrigger>}
          {overview && <TabsTrigger value="overview">Overview</TabsTrigger>}
        </TabsList>

        <TabsContent value="findings" className="space-y-3">
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {["OPEN", "ACKNOWLEDGED", "IN_REMEDIATION", "RESOLVED", "CLOSED", "ACCEPTED_RISK"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {label(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canManage && (
              <Button size="sm" onClick={() => setNewFinding(true)}>
                <Plus className="mr-1 h-4 w-4" /> Raise finding
              </Button>
            )}
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Finding</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {findings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No findings.
                      </TableCell>
                    </TableRow>
                  )}
                  {findings.map((f) => {
                    const overdue =
                      f.dueDate && new Date(f.dueDate) < new Date() && ["OPEN", "ACKNOWLEDGED", "IN_REMEDIATION"].includes(f.status);
                    return (
                      <TableRow key={f.id} className="cursor-pointer" onClick={() => setOpenId(f.id)}>
                        <TableCell>
                          <div className="font-medium">{f.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {f.findingNumber} · {label(f.category)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={SEVERITY_COLORS[f.severity]}>{f.severity}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={FINDING_STATUS_COLORS[f.status]}>{label(f.status)}</Badge>
                        </TableCell>
                        <TableCell>{who(f.owner)}</TableCell>
                        <TableCell className={overdue ? "font-medium text-rose-600" : ""}>{when(f.dueDate)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {canRisk && (
          <TabsContent value="risks" className="space-y-3">
            {canManageRisk && (
              <Button size="sm" onClick={() => setNewRisk(true)}>
                <Plus className="mr-1 h-4 w-4" /> Add risk
              </Button>
            )}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Risk</TableHead>
                      <TableHead>L × I</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Open findings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {risks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          The register is empty.
                        </TableCell>
                      </TableRow>
                    )}
                    {risks.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.riskNumber} · {label(r.category)}
                            {r.mitigation ? ` · ${r.mitigation}` : ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          {r.likelihood} × {r.impact} = {r.score}
                        </TableCell>
                        <TableCell>
                          <Badge className={RATING_COLORS[r.rating]}>{r.rating}</Badge>
                        </TableCell>
                        <TableCell>
                          {canManageRisk ? (
                            <Select
                              value={r.status}
                              onValueChange={async (v) => {
                                try {
                                  await auditGovService.updateRisk(r.id, { status: v });
                                  load();
                                } catch (e) {
                                  toast.error(err(e));
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {RISK_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            r.status
                          )}
                        </TableCell>
                        <TableCell>{who(r.owner)}</TableCell>
                        <TableCell>{r.openFindings}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {overview && (
          <TabsContent value="overview" className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Open findings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex gap-2">
                  {SEVERITIES.map((s) => (
                    <Badge key={s} className={SEVERITY_COLORS[s]}>
                      {s}: {overview.findings.openBySeverity[s] ?? 0}
                    </Badge>
                  ))}
                </div>
                <p className={overview.findings.overdue ? "font-medium text-rose-600" : "text-muted-foreground"}>
                  {overview.findings.overdue} overdue
                </p>
                <p className="text-muted-foreground">
                  {Object.entries(overview.findings.byStatus)
                    .map(([k, v]) => `${label(k)}: ${v}`)
                    .join(" · ") || "No findings yet"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk heat map (likelihood ↑, impact →)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid w-fit grid-cols-5 gap-1">
                  {[5, 4, 3, 2, 1].flatMap((l) =>
                    [1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={`${l}-${i}`}
                        className={`flex h-10 w-10 items-center justify-center rounded text-sm font-medium ${cellColor(l, i)}`}
                      >
                        {overview.risks.matrix[`${l}-${i}`] || ""}
                      </div>
                    )),
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <FindingDialog id={openId} canManage={canManage} onClose={() => setOpenId(null)} onChanged={load} />
      <NewFindingDialog open={newFinding} risks={risks} onClose={() => setNewFinding(false)} onSaved={load} />
      <NewRiskDialog open={newRisk} onClose={() => setNewRisk(false)} onSaved={load} />
    </div>
  );
}

function FindingDialog({
  id,
  canManage,
  onClose,
  onChanged,
}: {
  id: string | null;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [f, setF] = useState<AuditFinding | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      setF(await auditGovService.finding(id));
    } catch (e) {
      toast.error(err(e));
      onClose();
    }
  }, [id, onClose]);

  useEffect(() => {
    setF(null);
    setText("");
    refresh();
  }, [refresh]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      setText("");
      await refresh();
      onChanged();
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };

  const go = (status: string, extra: Record<string, string> = {}) =>
    run(() => auditGovService.transition(f!.id, { status, ...extra }), `Moved to ${label(status)}`);

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {!f ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {f.title} <Badge className={SEVERITY_COLORS[f.severity]}>{f.severity}</Badge>
                <Badge className={FINDING_STATUS_COLORS[f.status]}>{label(f.status)}</Badge>
              </DialogTitle>
              <DialogDescription>
                {f.findingNumber} · raised by {who(f.raisedBy)} · owner {who(f.owner)} · due {when(f.dueDate)}
              </DialogDescription>
            </DialogHeader>
            <p className="whitespace-pre-wrap text-sm">{f.description}</p>
            {f.entityType && (
              <p className="text-xs text-muted-foreground">
                Concerns {f.entityType} {f.entityId}
              </p>
            )}
            {f.managementResponse && (
              <p className="rounded-md border p-2 text-sm">
                <span className="font-medium">Management response: </span>
                {f.managementResponse}
              </p>
            )}
            {f.resolution && (
              <p className="rounded-md border p-2 text-sm">
                <span className="font-medium">Resolution: </span>
                {f.resolution}
              </p>
            )}

            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <Label>
                {f.status === "OPEN"
                  ? "Management response"
                  : f.status === "IN_REMEDIATION"
                    ? "How was it resolved?"
                    : "Comment"}
              </Label>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} />
              <div className="flex flex-wrap gap-2">
                {f.status === "OPEN" && (
                  <Button size="sm" disabled={busy || !text.trim()} onClick={() => go("ACKNOWLEDGED", { response: text })}>
                    Acknowledge (owner)
                  </Button>
                )}
                {f.status === "ACKNOWLEDGED" && (
                  <Button size="sm" disabled={busy} onClick={() => go("IN_REMEDIATION")}>
                    Start remediation (owner)
                  </Button>
                )}
                {f.status === "IN_REMEDIATION" && (
                  <Button size="sm" disabled={busy || !text.trim()} onClick={() => go("RESOLVED", { resolution: text })}>
                    Mark resolved (owner)
                  </Button>
                )}
                {canManage && f.status === "RESOLVED" && (
                  <>
                    <Button size="sm" disabled={busy} onClick={() => go("CLOSED")}>
                      Verify &amp; close
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy || !text.trim()} onClick={() => go("IN_REMEDIATION", { comment: text })}>
                      Send back
                    </Button>
                  </>
                )}
                {canManage && ["OPEN", "ACKNOWLEDGED", "IN_REMEDIATION", "RESOLVED"].includes(f.status) && (
                  <Button size="sm" variant="outline" disabled={busy || !text.trim()} onClick={() => go("ACCEPTED_RISK", { comment: text })}>
                    Accept risk
                  </Button>
                )}
                {canManage && ["CLOSED", "ACCEPTED_RISK"].includes(f.status) && (
                  <Button size="sm" variant="outline" disabled={busy || !text.trim()} onClick={() => go("OPEN", { comment: text })}>
                    Reopen
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy || !text.trim()}
                  onClick={() => run(() => auditGovService.comment(f.id, text), "Comment added")}
                >
                  Comment only
                </Button>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">History</h4>
              <ol className="space-y-1 border-l pl-4 text-sm">
                {f.events?.map((e) => (
                  <li key={e.id}>
                    <span className="font-medium">{label(e.action)}</span> · {who(e.actor)}
                    <span className="text-xs text-muted-foreground"> · {new Date(e.createdAt).toLocaleString()}</span>
                    {e.comment && <div className="text-muted-foreground">“{e.comment}”</div>}
                  </li>
                ))}
              </ol>
            </div>
            <DialogFooter />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewFindingDialog({
  open,
  risks,
  onClose,
  onSaved,
}: {
  open: boolean;
  risks: RiskEntry[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [d, setD] = useState({ title: "", description: "", severity: "MEDIUM", category: "CONTROL", ownerEmail: "", dueDate: "", entityType: "", entityId: "", riskId: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setD((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      await auditGovService.createFinding({ ...d, riskId: d.riskId || undefined, dueDate: d.dueDate || undefined });
      toast.success("Finding raised");
      onClose();
      onSaved();
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Raise a finding</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Title</Label>
            <Input value={d.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <Label>What was found</Label>
            <Textarea rows={3} value={d.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Severity</Label>
              <Select value={d.severity} onValueChange={(v) => set("severity", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={d.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINDING_CATEGORIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {label(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Owner's email</Label>
              <Input type="email" value={d.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} />
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="date" value={d.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            </div>
            <div>
              <Label>Record type (optional)</Label>
              <Input placeholder="e.g. PurchaseOrder" value={d.entityType} onChange={(e) => set("entityType", e.target.value)} />
            </div>
            <div>
              <Label>Record id (optional)</Label>
              <Input value={d.entityId} onChange={(e) => set("entityId", e.target.value)} />
            </div>
          </div>
          {risks.length > 0 && (
            <div>
              <Label>Linked risk (optional)</Label>
              <Select value={d.riskId || "NONE"} onValueChange={(v) => set("riskId", v === "NONE" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  {risks.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.riskNumber} — {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={busy || !d.title.trim() || !d.description.trim()}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Raise finding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewRiskDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState({ title: "", description: "", category: "OPERATIONAL", likelihood: "3", impact: "3", ownerEmail: "", mitigation: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setD((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      await auditGovService.createRisk({ ...d, likelihood: Number(d.likelihood), impact: Number(d.impact) });
      toast.success("Risk added");
      onClose();
      onSaved();
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };

  const scale = ["1", "2", "3", "4", "5"];
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a risk</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Title</Label>
            <Input value={d.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={d.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Category</Label>
              <Select value={d.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_CATEGORIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Likelihood (1-5)</Label>
              <Select value={d.likelihood} onValueChange={(v) => set("likelihood", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scale.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Impact (1-5)</Label>
              <Select value={d.impact} onValueChange={(v) => set("impact", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scale.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Owner's email</Label>
            <Input type="email" value={d.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} />
          </div>
          <div>
            <Label>Mitigation</Label>
            <Textarea rows={2} value={d.mitigation} onChange={(e) => set("mitigation", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={busy || !d.title.trim()}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add risk
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
