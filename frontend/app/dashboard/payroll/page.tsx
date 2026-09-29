"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType, FormEvent, ReactNode } from "react";
import {
  BadgeCheck,
  CircleDollarSign,
  Clock3,
  Download,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useHasPermission } from "@/hooks/use-permissions";
import { API_BASE_URL } from "@/lib/api-config";
import { getAuthHeadersWithToken } from "@/lib/api-utils";
import {
  createPayrollRecord,
  listPayrollPage,
  runPayroll,
  updatePayrollRecord,
  type Payroll,
} from "@/lib/admin-api";
import { PayrollStatus } from "@/lib/types";
import { formatCurrency, safeFormatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

interface EmployeeOption {
  id: string;
  name: string;
  email: string;
  department?: { name: string } | null;
}

const STATUS_META: Record<PayrollStatus, { label: string; className: string }> = {
  [PayrollStatus.draft]: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  [PayrollStatus.submitted]: { label: "Submitted", className: "bg-info-muted text-info border-info-border" },
  [PayrollStatus.approved]: { label: "Approved", className: "bg-success-muted text-success border-success-border" },
  [PayrollStatus.paid]: { label: "Paid", className: "bg-success-muted text-success border-success-border" },
  [PayrollStatus.reversed]: { label: "Reversed", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

function getMonthPeriod(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, "0")}`,
    year,
    monthNumber,
  };
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export default function PayrollDashboard() {
  const { token, user } = useAuth();
  const { hasAnyPermission } = useHasPermission();
  const isAdministrator = user?.role === "admin" || user?.role === "super_admin";
  const canViewPayroll = isAdministrator || hasAnyPermission(["hr.payroll.view", "hr.payroll.manage"]);
  const canManagePayroll = isAdministrator || hasAnyPermission(["hr.payroll.manage"]);

  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [page, setPage] = useState(1);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyPayrollId, setBusyPayrollId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Payroll | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [detailsRecord, setDetailsRecord] = useState<Payroll | null>(null);
  const [payingRecord, setPayingRecord] = useState<Payroll | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");

  const period = useMemo(() => getMonthPeriod(selectedMonth), [selectedMonth]);

  const refreshPayroll = useCallback(async (showSpinner = false) => {
    if (!token) return;
    if (showSpinner) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);
    try {
      const [result, drafts] = await Promise.all([
        listPayrollPage(token, {
          page,
          limit: 100,
          ...(selectedMonth ? { startDate: period.start, endDate: period.end } : {}),
        }),
        listPayrollPage(token, {
          page: 1,
          limit: 1,
          status: PayrollStatus.draft,
          ...(selectedMonth ? { startDate: period.start, endDate: period.end } : {}),
        }),
      ]);
      setPayrolls(result.records);
      setTotalRecords(result.total);
      setDraftCount(drafts.total);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load payroll records";
      setLoadError(message);
      if (showSpinner) toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, period.end, period.start, selectedMonth, token]);

  useEffect(() => {
    void refreshPayroll();
  }, [refreshPayroll]);

  useEffect(() => {
    if (!token || !canManagePayroll) return;
    let active = true;
    fetch(`${API_BASE_URL}/v1/employees?isActive=true`, {
      headers: getAuthHeadersWithToken(token),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error?.message || "Unable to load employees");
        return payload?.data;
      })
      .then((data) => {
        if (active) setEmployees(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (active) setEmployeeError(error instanceof Error ? error.message : "Unable to load employees");
      });
    return () => { active = false; };
  }, [canManagePayroll, token]);

  const filteredPayrolls = useMemo(() => {
    const query = search.trim().toLowerCase();
    return payrolls.filter((record) => {
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const matchesSearch = !query || [
        record.payroll_no,
        record.user?.name,
        record.user?.email,
        record.user?.department?.name,
      ].some((value) => value?.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [payrolls, search, statusFilter]);

  const metrics = useMemo(() => {
    const total = filteredPayrolls.reduce((sum, record) => sum + Number(record.net_salary || 0), 0);
    const employeeCount = new Set(filteredPayrolls.map((record) => record.userId)).size;
    const awaiting = filteredPayrolls.filter((record) => record.status === PayrollStatus.submitted).length;
    const paid = filteredPayrolls.filter((record) => record.status === PayrollStatus.paid).length;
    return { total, employeeCount, awaiting, paid };
  }, [filteredPayrolls]);

  const departmentSummary = useMemo(() => {
    const summary = new Map<string, { employeeIds: Set<string>; total: number }>();
    for (const record of filteredPayrolls) {
      const name = record.user?.department?.name || "Unassigned";
      const entry = summary.get(name) || { employeeIds: new Set<string>(), total: 0 };
      entry.employeeIds.add(record.userId);
      entry.total += Number(record.net_salary || 0);
      summary.set(name, entry);
    }
    return [...summary.entries()].map(([department, values]) => ({
      department,
      employees: values.employeeIds.size,
      total: values.total,
    })).sort((a, b) => b.total - a.total);
  }, [filteredPayrolls]);

  const submitNewPayroll = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    const baseSalary = Number(form.get("base_salary"));
    const allowances = Number(form.get("allowances") || 0);
    const deductions = Number(form.get("deductions") || 0);
    if (!employeeId || !Number.isFinite(baseSalary) || baseSalary <= 0 || allowances < 0 || deductions < 0 || deductions > baseSalary + allowances) {
      toast.error("Choose an employee and enter valid salary amounts");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        base_salary: baseSalary,
        allowances,
        deductions,
        notes: String(form.get("notes") || "").trim() || undefined,
      };
      if (editingRecord) {
        await updatePayrollRecord(token, editingRecord.id, payload);
        toast.success("Draft payroll record updated");
      } else {
        await createPayrollRecord(token, {
          userId: employeeId,
          ...payload,
          period_start: period.start,
          period_end: period.end,
        });
        toast.success("Draft payroll record created");
      }
      setCreateOpen(false);
      setEditingRecord(null);
      await refreshPayroll(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create payroll record");
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (record: Payroll, status: PayrollStatus, extra: { paid_date?: string; payment_method?: string } = {}) => {
    if (!token) return;
    setBusyPayrollId(record.id);
    try {
      await updatePayrollRecord(token, record.id, { status, ...extra });
      toast.success(`Payroll ${record.payroll_no} marked ${STATUS_META[status].label.toLowerCase()}`);
      setPayingRecord(null);
      await refreshPayroll(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update payroll status");
    } finally {
      setBusyPayrollId(null);
    }
  };

  const submitPeriodForReview = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const result = await runPayroll(token, {
        period_start: period.start,
        period_end: period.end,
        month: period.monthNumber,
        year: period.year,
      });
      toast.success(`${result.payroll_count} payroll record(s) submitted for review`);
      await refreshPayroll(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit this payroll period");
    } finally {
      setSubmitting(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Payroll No.", "Employee", "Department", "Period Start", "Period End", "Base Salary", "Allowances", "Deductions", "Net Salary", "Status", "Paid Date"],
      ...filteredPayrolls.map((record) => [
        record.payroll_no,
        record.user?.name || "",
        record.user?.department?.name || "",
        record.period_start,
        record.period_end,
        record.base_salary,
        record.allowances,
        record.deductions,
        record.net_salary,
        STATUS_META[record.status]?.label || record.status,
        record.paid_date || "",
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `payroll-${selectedMonth}-page-${page}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!canViewPayroll) {
    return <div className="p-6"><Card><CardContent className="py-12 text-center text-muted-foreground">You do not have permission to view payroll records.</CardContent></Card></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="h-4 w-4 text-primary" /> Human Resources / Payroll</div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Payroll</h1>
            <p className="mt-1 text-sm text-muted-foreground">Prepare, review, approve, and record employee payments.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={exportCsv} disabled={!filteredPayrolls.length}>
              <Download className="mr-2 h-4 w-4" /> Export page CSV
            </Button>
            <Button variant="outline" onClick={() => void refreshPayroll(true)} disabled={refreshing}>
              {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Refresh
            </Button>
            {canManagePayroll && <Button onClick={() => { setEditingRecord(null); setEmployeeId(""); setCreateOpen(true); }}><Plus className="mr-2 h-4 w-4" /> New payroll</Button>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
            <div className="space-y-1.5"><Label htmlFor="payroll-month">Payroll period</Label><Input id="payroll-month" type="month" value={selectedMonth} onChange={(event) => { setPage(1); setSelectedMonth(event.target.value || getCurrentMonth()); }} className="w-full sm:w-52" /></div>
            <div className="space-y-1.5"><Label htmlFor="payroll-status">Status</Label><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger id="payroll-status" className="w-full sm:w-48"><SelectValue placeholder="All statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{Object.entries(STATUS_META).map(([value, meta]) => <SelectItem key={value} value={value}>{meta.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          {canManagePayroll && draftCount > 0 && <Button onClick={() => void submitPeriodForReview()} disabled={submitting}><Send className="mr-2 h-4 w-4" /> Submit {draftCount} draft{draftCount === 1 ? "" : "s"}</Button>}
        </div>

        {loadError && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{loadError}</div>}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Employees" value={String(metrics.employeeCount)} detail="On this page" icon={Users} />
          <MetricCard title="Net payroll" value={formatCurrency(metrics.total)} detail="For records on this page" icon={CircleDollarSign} />
          <MetricCard title="Awaiting approval" value={String(metrics.awaiting)} detail="Submitted on this page" icon={Clock3} />
          <MetricCard title="Paid records" value={String(metrics.paid)} detail="Paid on this page" icon={BadgeCheck} />
        </section>

        <Card className="overflow-hidden border-border bg-card shadow-sm">
          <CardHeader className="gap-3 border-b border-border sm:flex-row sm:items-center sm:justify-between">
            <div><CardTitle className="text-lg">Payroll records</CardTitle><p className="mt-1 text-sm text-muted-foreground">{totalRecords} record(s) for {selectedMonth} · page {page} of {Math.max(1, Math.ceil(totalRecords / 100))}</p></div>
            <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search this page" className="pl-9" /></div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="bg-muted/50 hover:bg-muted/50"><TableHead>Payroll No.</TableHead><TableHead>Employee</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Net pay</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /></TableCell></TableRow> : filteredPayrolls.length ? filteredPayrolls.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs">{record.payroll_no}</TableCell>
                      <TableCell><div className="font-medium text-foreground">{record.user?.name || "Employee"}</div><div className="text-xs text-muted-foreground">{record.user?.department?.name || record.user?.email || "Unassigned department"}</div></TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{safeFormatDate(record.period_start)} – {safeFormatDate(record.period_end)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">{formatCurrency(record.net_salary)}</TableCell>
                      <TableCell><PayrollStatusBadge status={record.status} /></TableCell>
                      <TableCell><div className="flex justify-end gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => setDetailsRecord(record)} aria-label={`View ${record.payroll_no}`}><Eye className="mr-1.5 h-4 w-4" /> View</Button>
                        {canManagePayroll && record.status === PayrollStatus.draft && <Button size="sm" variant="outline" onClick={() => { setEditingRecord(record); setEmployeeId(record.userId); setCreateOpen(true); }} aria-label={`Edit ${record.payroll_no}`}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>}
                        {canManagePayroll && record.status === PayrollStatus.draft && <Button size="sm" variant="outline" disabled={busyPayrollId === record.id} onClick={() => void changeStatus(record, PayrollStatus.submitted)}><Send className="mr-1.5 h-3.5 w-3.5" /> Submit</Button>}
                        {canManagePayroll && record.status === PayrollStatus.submitted && <Button size="sm" disabled={busyPayrollId === record.id} onClick={() => void changeStatus(record, PayrollStatus.approved)}><BadgeCheck className="mr-1.5 h-3.5 w-3.5" /> Approve</Button>}
                        {canManagePayroll && record.status === PayrollStatus.approved && <Button size="sm" disabled={busyPayrollId === record.id} onClick={() => { setPayingRecord(record); setPaymentMethod("bank_transfer"); }}><Wallet className="mr-1.5 h-3.5 w-3.5" /> Mark paid</Button>}
                        {busyPayrollId === record.id && <Loader2 className="h-4 w-4 animate-spin self-center text-primary" />}
                      </div></TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={6} className="h-32 text-center"><div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-muted-foreground"><FileText className="h-7 w-7 opacity-50" /><p>No payroll records match this period and filter.</p>{canManagePayroll && <Button variant="link" onClick={() => { setEditingRecord(null); setEmployeeId(""); setCreateOpen(true); }}>Create a draft payroll</Button>}</div></TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>Showing {totalRecords ? (page - 1) * 100 + 1 : 0}–{Math.min(page * 100, totalRecords)} of {totalRecords}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= Math.ceil(totalRecords / 100) || loading} onClick={() => setPage((current) => current + 1)}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader><CardTitle className="text-lg">Department summary</CardTitle><p className="text-sm text-muted-foreground">Calculated from the payroll records shown above.</p></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Department</TableHead><TableHead>Employees</TableHead><TableHead className="text-right">Net payroll</TableHead></TableRow></TableHeader><TableBody>
              {departmentSummary.length ? departmentSummary.map((row) => <TableRow key={row.department}><TableCell className="font-medium">{row.department}</TableCell><TableCell>{row.employees}</TableCell><TableCell className="text-right font-medium tabular-nums">{formatCurrency(row.total)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">No department data for this period.</TableCell></TableRow>}
            </TableBody></Table></div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setEditingRecord(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{editingRecord ? "Edit draft payroll" : "Create draft payroll"}</DialogTitle><DialogDescription>Enter reviewed salary figures for {selectedMonth}. Amounts are saved as a draft before they can be submitted or approved.</DialogDescription></DialogHeader>
          {employeeError && <div role="alert" className="rounded-md border border-warning-border bg-warning-muted p-3 text-sm text-warning">{employeeError}</div>}
          <form key={editingRecord?.id || "new-payroll"} id="create-payroll-form" onSubmit={submitNewPayroll} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="employee">Employee</Label><Select value={employeeId} onValueChange={setEmployeeId} required disabled={!employees.length || Boolean(editingRecord)}><SelectTrigger id="employee"><SelectValue placeholder={employees.length ? "Choose an employee" : "No active employees available"} /></SelectTrigger><SelectContent>{employees.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.name}{employee.department?.name ? ` · ${employee.department.name}` : ""}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5"><Label htmlFor="base_salary">Base salary (KES)</Label><Input id="base_salary" name="base_salary" type="number" min="0.01" step="0.01" defaultValue={editingRecord?.base_salary ?? ""} required /></div>
              <div className="space-y-1.5"><Label htmlFor="allowances">Allowances (KES)</Label><Input id="allowances" name="allowances" type="number" min="0" step="0.01" defaultValue={editingRecord?.allowances ?? 0} /></div>
              <div className="space-y-1.5"><Label htmlFor="deductions">Deductions (KES)</Label><Input id="deductions" name="deductions" type="number" min="0" step="0.01" defaultValue={editingRecord?.deductions ?? 0} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label>Period start</Label><Input value={editingRecord ? safeFormatDate(editingRecord.period_start) : period.start} readOnly /></div><div className="space-y-1.5"><Label>Period end</Label><Input value={editingRecord ? safeFormatDate(editingRecord.period_end) : period.end} readOnly /></div></div>
            <div className="space-y-1.5"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" defaultValue={editingRecord?.notes || ""} placeholder="Optional payroll notes" rows={3} /></div>
          </form>
          {employees.length === 0 && !employeeError && <p className="text-sm text-muted-foreground">There are no active employees to select.</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => { setCreateOpen(false); setEditingRecord(null); }}>Cancel</Button><Button form="create-payroll-form" type="submit" disabled={submitting || !employees.length}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {editingRecord ? "Save changes" : "Save draft"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailsRecord)} onOpenChange={(open) => !open && setDetailsRecord(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Payslip details</DialogTitle><DialogDescription>{detailsRecord?.payroll_no} · {detailsRecord?.user?.name}</DialogDescription></DialogHeader>
          {detailsRecord && <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-muted/30 p-4 text-sm"><Info label="Period" value={`${safeFormatDate(detailsRecord.period_start)} – ${safeFormatDate(detailsRecord.period_end)}`} /><Info label="Status" value={<PayrollStatusBadge status={detailsRecord.status} />} /><Info label="Department" value={detailsRecord.user?.department?.name || "Unassigned"} /><Info label="Paid date" value={detailsRecord.paid_date ? safeFormatDate(detailsRecord.paid_date) : "—"} /></div>
            <div className="space-y-2"><PayLine label="Base salary" amount={detailsRecord.base_salary} /><PayLine label="Allowances" amount={detailsRecord.allowances} /><PayLine label="Deductions" amount={-Number(detailsRecord.deductions)} /><div className="flex justify-between border-t border-border pt-3 text-base font-bold"><span>Net pay</span><span>{formatCurrency(detailsRecord.net_salary)}</span></div></div>
            {detailsRecord.notes && <div className="rounded-md border border-border p-3"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p><p className="whitespace-pre-wrap text-sm">{detailsRecord.notes}</p></div>}
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setDetailsRecord(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(payingRecord)} onOpenChange={(open) => !open && setPayingRecord(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Record payroll payment</DialogTitle><DialogDescription>Mark {payingRecord?.payroll_no} paid and record the payout in Finance.</DialogDescription></DialogHeader>
          {payingRecord && <div className="space-y-4"><div className="rounded-md bg-muted/50 p-4"><p className="text-sm text-muted-foreground">Employee</p><p className="font-medium">{payingRecord.user?.name}</p><p className="mt-2 text-sm text-muted-foreground">Net pay</p><p className="text-xl font-bold">{formatCurrency(payingRecord.net_salary)}</p></div>
            <div className="space-y-1.5"><Label htmlFor="payment-method">Payment method</Label><Select value={paymentMethod} onValueChange={setPaymentMethod}><SelectTrigger id="payment-method"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bank_transfer">Bank transfer</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="cash">Cash</SelectItem></SelectContent></Select></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setPayingRecord(null)}>Cancel</Button><Button disabled={!payingRecord || busyPayrollId === payingRecord.id} onClick={() => payingRecord && void changeStatus(payingRecord, PayrollStatus.paid, { paid_date: new Date().toISOString(), payment_method: paymentMethod })}>{busyPayrollId === payingRecord?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirm payment</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ title, value, detail, icon: Icon }: { title: string; value: string; detail: string; icon: ComponentType<{ className?: string }> }) {
  return <Card className="border-border bg-card shadow-sm"><CardContent className="flex items-start justify-between p-5"><div><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><div className="rounded-lg bg-primary/10 p-2.5 text-primary"><Icon className="h-5 w-5" /></div></CardContent></Card>;
}

function PayrollStatusBadge({ status }: { status: PayrollStatus }) {
  const meta = STATUS_META[status] || STATUS_META[PayrollStatus.draft];
  return <Badge variant="outline" className={meta.className}>{meta.label}</Badge>;
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><div className="mt-1 truncate font-medium text-foreground">{value}</div></div>;
}

function PayLine({ label, amount }: { label: string; amount: number }) {
  return <div className="flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><span className="font-medium tabular-nums">{formatCurrency(amount)}</span></div>;
}
