"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { peopleService, CONTRACT_STATUS_COLORS, type MyProfile, type Payslip } from "@/lib/people.service";

const kes = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;
const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "—");
const err = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const LEAVE_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
  CANCELLED: "bg-slate-100 text-slate-600",
};

export default function MyProfilePage() {
  const [p, setP] = useState<MyProfile | null>(null);
  const [slips, setSlips] = useState<Payslip[]>([]);
  const [types, setTypes] = useState<{ id: string; name: string }[]>([]);
  const [phone, setPhone] = useState("");
  const [leave, setLeave] = useState({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [prof, ps, lt] = await Promise.all([peopleService.myProfile(), peopleService.myPayslips(), peopleService.leaveTypes()]);
      setP(prof);
      setSlips(ps);
      setTypes(lt);
      setPhone(prof.user.phone ?? "");
    } catch (e) {
      toast.error(err(e));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      await load();
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };

  if (!p)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  const c = p.contract;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{p.user.name}</h1>
        <p className="text-sm text-muted-foreground">
          {[c?.jobTitle, p.user.department?.name, p.user.branch?.name, p.user.employeeCode].filter(Boolean).join(" · ")}
        </p>
      </div>

      <Tabs defaultValue="leave">
        <TabsList>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="payslips">Payslips</TabsTrigger>
          <TabsTrigger value="contract">Contract</TabsTrigger>
          <TabsTrigger value="details">My details</TabsTrigger>
        </TabsList>

        <TabsContent value="leave" className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Balances this year</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {p.leaveBalances.length === 0 && <p className="text-muted-foreground">No leave has been allocated to you yet. Ask HR.</p>}
                {p.leaveBalances.map((b) => (
                  <div key={b.leaveTypeId} className="flex justify-between">
                    <span>{b.leaveType}</span>
                    <span className="tabular-nums">
                      <strong>{b.remaining}</strong> left <span className="text-muted-foreground">of {b.allocated} ({b.used} used{b.pending ? `, ${b.pending} pending` : ""})</span>
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Request leave</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={leave.leaveTypeId} onValueChange={(v) => setLeave((l) => ({ ...l, leaveTypeId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose…" />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>From</Label>
                    <Input type="date" value={leave.startDate} onChange={(e) => setLeave((l) => ({ ...l, startDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label>To</Label>
                    <Input type="date" value={leave.endDate} onChange={(e) => setLeave((l) => ({ ...l, endDate: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Reason (optional)</Label>
                  <Textarea rows={2} value={leave.reason} onChange={(e) => setLeave((l) => ({ ...l, reason: e.target.value }))} />
                </div>
                <p className="text-xs text-muted-foreground">Sundays are not counted.</p>
                <Button
                  disabled={busy || !leave.leaveTypeId || !leave.startDate || !leave.endDate}
                  onClick={() =>
                    run(async () => {
                      await peopleService.requestLeave(leave);
                      setLeave({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
                    }, "Leave requested")
                  }
                >
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit request
                </Button>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">My requests</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leave</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {p.leaveRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        No requests yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {p.leaveRequests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        {r.leaveType}
                        <div className="text-xs text-muted-foreground">{r.days} day(s)</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {day(r.startDate)} – {day(r.endDate)}
                      </TableCell>
                      <TableCell>
                        <Badge className={LEAVE_COLORS[r.status]}>{r.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {r.status === "PENDING" && (
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => peopleService.cancelLeave(r.id), "Request withdrawn")}>
                            Withdraw
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payslips">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Basic</TableHead>
                    <TableHead className="text-right">Allowances</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net pay</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slips.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Payslips appear here once a month's payroll is approved.
                      </TableCell>
                    </TableRow>
                  )}
                  {slips.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        {new Date(s.period_start).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                        <div className="text-xs text-muted-foreground">{s.payroll_no}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{kes(s.base_salary)}</TableCell>
                      <TableCell className="text-right tabular-nums">{kes(s.allowances)}</TableCell>
                      <TableCell className="text-right tabular-nums">{kes(s.deductions)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{kes(s.net_salary)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{s.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contract">
          {!c ? (
            <p className="py-10 text-center text-muted-foreground">No active contract on file. Ask HR.</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {c.contractNumber} <Badge className={CONTRACT_STATUS_COLORS[c.status]}>{c.status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <Row k="Position" v={c.jobTitle} />
                  <Row k="Type" v={c.type.replace("_", " ")} />
                  <Row k="Starts" v={day(c.startDate)} />
                  <Row k="Ends" v={c.endDate ? day(c.endDate) : "Open-ended"} />
                  {c.probationEndDate && <Row k="Probation ends" v={day(c.probationEndDate)} />}
                  <Row k="Notice period" v={`${c.noticeDays} days`} />
                  <Row k="Hours" v={`${c.hoursPerWeek} per week`} />
                  <Row k="Signed" v={day(c.signedAt)} />
                </CardContent>
              </Card>
              {p.pay && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Monthly pay</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <Row k="Basic salary" v={kes(p.pay.baseSalary)} />
                    {p.pay.lines.map((l) => (
                      <Row key={l.name} k={`${l.kind === "DEDUCTION" ? "− " : "+ "}${l.name}`} v={kes(l.amount)} />
                    ))}
                    <div className="border-t pt-1">
                      <Row k="Net pay" v={kes(p.pay.net)} strong />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          {p.benefits.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Benefits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {p.benefits.map((b) => (
                  <Row key={b.id} k={b.name} v={[b.type, b.provider].filter(Boolean).join(" · ")} />
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="details">
          <Card className="max-w-md">
            <CardContent className="space-y-3 p-4">
              <Row k="Email" v={p.user.email} />
              <Row k="Employee no." v={p.user.employeeCode ?? "—"} />
              <div>
                <Label>Phone</Label>
                <div className="flex gap-2">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <Button disabled={busy || phone === (p.user.phone ?? "")} onClick={() => run(() => peopleService.updateMyProfile({ phone }), "Phone updated")}>
                    Save
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Name, email and role are managed by HR and IT.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right tabular-nums">{v}</span>
    </div>
  );
}
