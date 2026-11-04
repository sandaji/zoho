"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
  CONTRACT_STATUS_COLORS,
  CONTRACT_TYPES,
  peopleService,
  type Contract,
  type SalaryComponent,
  type SalaryStructure,
} from "@/lib/people.service";

const kes = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;
const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "—");
const err = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

export default function ContractsPage() {
  const { hasPermission } = useHasPermission();
  const canManage = hasPermission("hr.contract.manage");
  const canActivate = hasPermission("hr.contract.activate");
  const canStructures = hasPermission("hr.salary_structure.manage");
  const canPayroll = hasPermission("hr.payroll.manage");

  const [rows, setRows] = useState<Contract[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [status, setStatus] = useState("ALL");
  const [expiring, setExpiring] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newContract, setNewContract] = useState(false);
  const [editStruct, setEditStruct] = useState<SalaryStructure | "new" | null>(null);
  const [period, setPeriod] = useState({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        peopleService.contracts({ status: status === "ALL" ? undefined : status, search: search || undefined, expiringInDays: expiring ? 60 : undefined }),
        peopleService.structures(),
      ]);
      setRows(c);
      setStructures(s);
    } catch (e) {
      toast.error(err(e));
    } finally {
      setLoading(false);
    }
  }, [status, search, expiring]);
  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    setBusy(true);
    try {
      const r = await peopleService.generatePayroll({ month: Number(period.month), year: Number(period.year) });
      toast.success(`${r.created} payroll record(s) drafted (${kes(r.totalNet)} net)${r.skippedExisting ? `, ${r.skippedExisting} already existed` : ""}`);
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Contracts &amp; pay structures</h1>
        <p className="text-sm text-muted-foreground">Terms of employment, salary grades, and drafting payroll from them.</p>
      </div>
      <Tabs defaultValue="contracts">
        <TabsList>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="structures">Salary structures</TabsTrigger>
          {canPayroll && <TabsTrigger value="payroll">Draft payroll</TabsTrigger>}
        </TabsList>

        <TabsContent value="contracts" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="w-56" placeholder="Search name, code, contract…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED", "SUPERSEDED"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant={expiring ? "default" : "outline"} onClick={() => setExpiring((v) => !v)}>
              Expiring in 60 days
            </Button>
            {canManage && (
              <Button size="sm" onClick={() => setNewContract(true)}>
                <Plus className="mr-1 h-4 w-4" /> New contract
              </Button>
            )}
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead className="text-right">Base salary</TableHead>
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
                        No contracts.
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => setOpenId(c.id)}>
                      <TableCell>
                        <div className="font-medium">{c.employee?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{[c.employee?.employeeCode, c.employee?.branch?.name].filter(Boolean).join(" · ")}</div>
                      </TableCell>
                      <TableCell>
                        {c.jobTitle}
                        <div className="text-xs text-muted-foreground">
                          {c.contractNumber} · {c.type.replace("_", " ")}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {day(c.startDate)} – {c.endDate ? day(c.endDate) : "open"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{kes(c.baseSalary)}</TableCell>
                      <TableCell>
                        <Badge className={CONTRACT_STATUS_COLORS[c.status]}>{c.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structures" className="space-y-3">
          {canStructures && (
            <Button size="sm" onClick={() => setEditStruct("new")}>
              <Plus className="mr-1 h-4 w-4" /> New structure
            </Button>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {structures.length === 0 && <p className="text-sm text-muted-foreground">No salary structures yet.</p>}
            {structures.map((s) => (
              <Card key={s.id} className={canStructures ? "cursor-pointer" : ""} onClick={() => canStructures && setEditStruct(s)}>
                <CardContent className="space-y-1 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {s.name} <span className="text-xs text-muted-foreground">({s.code})</span>
                    </span>
                    {!s.isActive && <Badge variant="secondary">Off</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.minSalary != null || s.maxSalary != null
                      ? `Grade range ${s.minSalary != null ? kes(s.minSalary) : "—"} to ${s.maxSalary != null ? kes(s.maxSalary) : "—"}`
                      : "No grade range"}
                  </div>
                  {s.components.map((c, i) => (
                    <div key={i} className="flex justify-between">
                      <span>
                        {c.kind === "DEDUCTION" ? "− " : "+ "}
                        {c.name}
                      </span>
                      <span className="tabular-nums">{c.calc === "PERCENT_OF_BASE" ? `${c.value}%` : kes(c.value)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {canPayroll && (
          <TabsContent value="payroll">
            <Card className="max-w-md">
              <CardContent className="space-y-3 p-4">
                <p className="text-sm text-muted-foreground">
                  Drafts one payroll record for every active contract covering the month, using each contract's salary structure. Employees who already have payroll for that month are
                  skipped. Approval still goes through Approvals once you submit the month.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Month</Label>
                    <Input type="number" min={1} max={12} value={period.month} onChange={(e) => setPeriod((p) => ({ ...p, month: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Input type="number" value={period.year} onChange={(e) => setPeriod((p) => ({ ...p, year: e.target.value }))} />
                  </div>
                </div>
                <Button onClick={generate} disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Draft payroll
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <ContractDialog id={openId} canManage={canManage} canActivate={canActivate} onClose={() => setOpenId(null)} onChanged={load} />
      <NewContractDialog open={newContract} structures={structures} onClose={() => setNewContract(false)} onSaved={load} />
      <StructureDialog value={editStruct} onClose={() => setEditStruct(null)} onSaved={load} />
    </div>
  );
}

function ContractDialog({
  id,
  canManage,
  canActivate,
  onClose,
  onChanged,
}: {
  id: string | null;
  canManage: boolean;
  canActivate: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [c, setC] = useState<Contract | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setC(null);
    setReason("");
    if (!id) return;
    peopleService
      .contract(id)
      .then(setC)
      .catch((e) => {
        toast.error(err(e));
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const run = async (fn: () => Promise<unknown>, ok: string, close = false) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      onChanged();
      if (close) onClose();
      else if (id) setC(await peopleService.contract(id));
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        {!c ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {c.employee?.name} <Badge className={CONTRACT_STATUS_COLORS[c.status]}>{c.status}</Badge>
              </DialogTitle>
              <DialogDescription>
                {c.contractNumber} · {c.jobTitle} · {c.type.replace("_", " ")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1 text-sm">
              <KV k="Starts" v={day(c.startDate)} />
              <KV k="Ends" v={c.endDate ? day(c.endDate) : "Open-ended"} />
              {c.probationEndDate && <KV k="Probation ends" v={day(c.probationEndDate)} />}
              <KV k="Notice" v={`${c.noticeDays} days`} />
              <KV k="Hours" v={`${c.hoursPerWeek} / week`} />
              <KV k="Structure" v={c.structure ? `${c.structure.name} (${c.structure.code})` : "None"} />
              {c.pay && (
                <div className="mt-2 rounded-md border p-2">
                  <KV k="Base salary" v={kes(c.pay.baseSalary)} />
                  {c.pay.lines.map((l) => (
                    <KV key={l.name} k={`${l.kind === "DEDUCTION" ? "− " : "+ "}${l.name}`} v={kes(l.amount)} />
                  ))}
                  <div className="border-t pt-1">
                    <KV k="Net monthly pay" v={kes(c.pay.net)} strong />
                  </div>
                </div>
              )}
              {c.notes && <p className="pt-1 text-muted-foreground">{c.notes}</p>}
              {c.terminationReason && (
                <p className="pt-1 text-rose-600">
                  Terminated {day(c.terminatedAt)}: {c.terminationReason}
                </p>
              )}
            </div>
            <DialogFooter className="flex-wrap gap-2">
              {c.status === "DRAFT" && canActivate && (
                <Button disabled={busy} onClick={() => run(() => peopleService.activate(c.id), "Contract activated")}>
                  Activate
                </Button>
              )}
              {c.status === "DRAFT" && canManage && (
                <Button variant="outline" disabled={busy} onClick={() => run(() => peopleService.discardContract(c.id), "Draft discarded", true)}>
                  <Trash2 className="mr-1 h-4 w-4" /> Discard
                </Button>
              )}
              {c.status === "ACTIVE" && canActivate && (
                <div className="flex w-full gap-2">
                  <Input placeholder="Reason for termination" value={reason} onChange={(e) => setReason(e.target.value)} />
                  <Button variant="destructive" disabled={busy || !reason.trim()} onClick={() => run(() => peopleService.terminate(c.id, { reason }), "Contract terminated")}>
                    Terminate
                  </Button>
                </div>
              )}
            </DialogFooter>
            {c.status === "DRAFT" && (
              <p className="text-xs text-muted-foreground">
                Someone other than the person who drafted it must activate it. Activating supersedes the employee's current contract.
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewContractDialog({ open, structures, onClose, onSaved }: { open: boolean; structures: SalaryStructure[]; onClose: () => void; onSaved: () => void }) {
  const blank = {
    userEmail: "",
    type: "PERMANENT",
    jobTitle: "",
    startDate: "",
    endDate: "",
    probationEndDate: "",
    baseSalary: "",
    noticeDays: "30",
    hoursPerWeek: "40",
    salaryStructureId: "",
    notes: "",
  };
  const [d, setD] = useState(blank);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setD((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      await peopleService.createContract({
        ...d,
        baseSalary: Number(d.baseSalary),
        noticeDays: Number(d.noticeDays),
        hoursPerWeek: Number(d.hoursPerWeek),
        endDate: d.endDate || undefined,
        probationEndDate: d.probationEndDate || undefined,
        salaryStructureId: d.salaryStructureId || undefined,
      });
      toast.success("Draft contract created");
      setD(blank);
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
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New employment contract</DialogTitle>
          <DialogDescription>Saved as a draft. A second person activates it.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Employee's email</Label>
            <Input type="email" value={d.userEmail} onChange={(e) => set("userEmail", e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={d.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Job title</Label>
            <Input value={d.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} />
          </div>
          <div>
            <Label>Starts</Label>
            <Input type="date" value={d.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </div>
          <div>
            <Label>Ends {d.type === "PERMANENT" ? "(optional)" : ""}</Label>
            <Input type="date" value={d.endDate} onChange={(e) => set("endDate", e.target.value)} />
          </div>
          <div>
            <Label>Probation ends</Label>
            <Input type="date" value={d.probationEndDate} onChange={(e) => set("probationEndDate", e.target.value)} />
          </div>
          <div>
            <Label>Base salary (monthly, KSh)</Label>
            <Input type="number" value={d.baseSalary} onChange={(e) => set("baseSalary", e.target.value)} />
          </div>
          <div>
            <Label>Notice (days)</Label>
            <Input type="number" value={d.noticeDays} onChange={(e) => set("noticeDays", e.target.value)} />
          </div>
          <div>
            <Label>Hours per week</Label>
            <Input type="number" value={d.hoursPerWeek} onChange={(e) => set("hoursPerWeek", e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Salary structure</Label>
            <Select value={d.salaryStructureId || "NONE"} onValueChange={(v) => set("salaryStructureId", v === "NONE" ? "" : v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None (basic salary only)</SelectItem>
                {structures
                  .filter((s) => s.isActive)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={d.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={busy || !d.userEmail || !d.jobTitle || !d.startDate || !d.baseSalary}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StructureDialog({ value, onClose, onSaved }: { value: SalaryStructure | "new" | null; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState({ code: "", name: "", description: "", minSalary: "", maxSalary: "", isActive: true });
  const [comps, setComps] = useState<SalaryComponent[]>([]);
  const [busy, setBusy] = useState(false);
  const isNew = value === "new";

  useEffect(() => {
    if (!value) return;
    if (value === "new") {
      setD({ code: "", name: "", description: "", minSalary: "", maxSalary: "", isActive: true });
      setComps([]);
    } else {
      setD({
        code: value.code,
        name: value.name,
        description: value.description ?? "",
        minSalary: value.minSalary != null ? String(value.minSalary) : "",
        maxSalary: value.maxSalary != null ? String(value.maxSalary) : "",
        isActive: value.isActive,
      });
      setComps(value.components.map((c) => ({ name: c.name, kind: c.kind, calc: c.calc, value: c.value })));
    }
  }, [value]);

  const upd = (i: number, patch: Partial<SalaryComponent>) => setComps((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        code: d.code,
        name: d.name,
        description: d.description,
        minSalary: d.minSalary ? Number(d.minSalary) : null,
        maxSalary: d.maxSalary ? Number(d.maxSalary) : null,
        isActive: d.isActive,
        components: comps.map((c) => ({ ...c, value: Number(c.value) })),
      };
      if (isNew) await peopleService.createStructure(body);
      else await peopleService.saveStructure((value as SalaryStructure).id, body);
      toast.success("Salary structure saved");
      onClose();
      onSaved();
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "New salary structure" : "Edit salary structure"}</DialogTitle>
          <DialogDescription>
            Allowances add to the basic salary; deductions (statutory or otherwise) come off it. Percentages are of the basic salary.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Code</Label>
            <Input disabled={!isNew} value={d.code} onChange={(e) => setD((x) => ({ ...x, code: e.target.value }))} />
          </div>
          <div>
            <Label>Name</Label>
            <Input value={d.name} onChange={(e) => setD((x) => ({ ...x, name: e.target.value }))} />
          </div>
          <div>
            <Label>Grade minimum</Label>
            <Input type="number" value={d.minSalary} onChange={(e) => setD((x) => ({ ...x, minSalary: e.target.value }))} />
          </div>
          <div>
            <Label>Grade maximum</Label>
            <Input type="number" value={d.maxSalary} onChange={(e) => setD((x) => ({ ...x, maxSalary: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Pay components</Label>
            <Button size="sm" variant="outline" onClick={() => setComps((c) => [...c, { name: "", kind: "ALLOWANCE", calc: "FIXED", value: 0 }])}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
          {comps.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_8rem_9rem_6rem_auto] items-center gap-2">
              <Input placeholder="Name (e.g. House allowance)" value={c.name} onChange={(e) => upd(i, { name: e.target.value })} />
              <Select value={c.kind} onValueChange={(v) => upd(i, { kind: v as SalaryComponent["kind"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALLOWANCE">Allowance</SelectItem>
                  <SelectItem value="DEDUCTION">Deduction</SelectItem>
                </SelectContent>
              </Select>
              <Select value={c.calc} onValueChange={(v) => upd(i, { calc: v as SalaryComponent["calc"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Fixed amount</SelectItem>
                  <SelectItem value="PERCENT_OF_BASE">% of basic</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" value={c.value} onChange={(e) => upd(i, { value: Number(e.target.value) })} />
              <Button size="icon" variant="ghost" onClick={() => setComps((cs) => cs.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={busy || !d.name || (isNew && !d.code)}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KV({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right tabular-nums">{v}</span>
    </div>
  );
}
