"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Kind = "INVOICE" | "PAYMENT" | "CREDIT_NOTE" | "VOID";
interface Entry {
  date: string;
  kind: Kind;
  invoiceNumber: string;
  description: string;
  method: string | null;
  paymentReference: string | null;
  debit: number;
  credit: number;
  balance: number;
  salesDocumentId: string | null;
  recordedByName: string | null;
}
interface Statement {
  customer: { id: string; code: string; name: string; phone: string | null; email: string | null; creditLimit: number; salesmanId: string | null; salesmanName: string | null };
  from: string | null;
  to: string | null;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  currentLedgerBalance: number;
  recordedBalance: number;
  difference: number;
  truncated: boolean;
  entries: Entry[];
}
interface Salesman {
  id: string;
  name: string;
}

const KIND_LABEL: Record<Kind, string> = { INVOICE: "Invoice", PAYMENT: "Payment", CREDIT_NOTE: "Credit note", VOID: "Void" };
const KIND_STYLE: Record<Kind, string> = {
  INVOICE: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
  PAYMENT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  CREDIT_NOTE: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
  VOID: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200",
};
const kes = (n: number) => n.toLocaleString("en-KE", { style: "currency", currency: "KES" });
const money = (n: number) => (n ? kes(n) : "");

export default function CustomerStatementPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [salesmanId, setSalesmanId] = useState("");
  const [saving, setSaving] = useState(false);

  const headers = useCallback(() => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }), [token]);
  const qs = () => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const s = q.toString();
    return s ? `?${s}` : "";
  };

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      setLoading(true);
      const q = new URLSearchParams();
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      const res = await fetch(`${API_BASE_URL}/v1/customers/${id}/statement${q.toString() ? `?${q}` : ""}`, { headers: headers() });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || json?.error || json?.message || "Failed to load statement");
      setData(json.data);
      setSalesmanId(json.data.customer.salesmanId ?? "");
    } catch (e) {
      showToast("Error", e instanceof Error ? e.message : "Failed to load statement", "error");
    } finally {
      setLoading(false);
    }
  }, [token, id, from, to, headers, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/v1/customers/salesmen`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setSalesmen(j.data ?? []))
      .catch(() => undefined);
  }, [token, headers]);

  const saveSalesman = async () => {
    if (!salesmanId) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE_URL}/v1/customers/${id}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ salesmanId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message || j?.error || "Could not change salesman");
      }
      showToast("Success", "Salesman updated", "success");
      load();
    } catch (e) {
      showToast("Error", e instanceof Error ? e.message : "Could not change salesman", "error");
    } finally {
      setSaving(false);
    }
  };

  const downloadCsv = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/customers/${id}/statement.csv${qs()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `statement-${data?.customer.code ?? "customer"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showToast("Error", e instanceof Error ? e.message : "Export failed", "error");
    }
  };

  const c = data?.customer;
  const overLimit = !!c && c.creditLimit > 0 && (data?.currentLedgerBalance ?? 0) > c.creditLimit;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <Link href="/dashboard/crm/customers" className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" /> Customers
          </Link>
          <h2 className="text-2xl font-bold text-foreground">{c ? c.name : "Customer statement"}</h2>
          {c && (
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{c.code}</span>
              {c.phone ? ` · ${c.phone}` : ""}
              {c.email ? ` · ${c.email}` : ""}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadCsv} disabled={!data}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()} disabled={!data}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* Print header (screen shows the block above) */}
      {c && (
        <div className="hidden print:block">
          <h2 className="text-xl font-bold">Statement of account: {c.name} ({c.code})</h2>
          <p className="text-sm">
            Salesman: {c.salesmanName ?? "Unassigned"} · Period: {data?.from ?? "start"} to {data?.to ?? "today"}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <div>
          <Label htmlFor="from">From</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
        </div>
        <div>
          <Label htmlFor="to">To</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
        </div>
        {(from || to) && (
          <Button
            variant="ghost"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            Clear dates
          </Button>
        )}
        <div className="ml-auto flex items-end gap-2">
          <div>
            <Label htmlFor="salesman">Salesman</Label>
            <select
              id="salesman"
              value={salesmanId}
              onChange={(e) => setSalesmanId(e.target.value)}
              className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark]"
            >
              <option value="">{c?.salesmanId ? "—" : "Unassigned — choose"}</option>
              {salesmen.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={saveSalesman} disabled={saving || !salesmanId || salesmanId === c?.salesmanId}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Opening balance" value={kes(data.openingBalance)} />
            <Stat label="Total debit" value={kes(data.totalDebit)} />
            <Stat label="Total credit" value={kes(data.totalCredit)} />
            <Stat label="Closing balance" value={kes(data.closingBalance)} strong />
            <Stat label="Salesman" value={c?.salesmanName ?? "Unassigned"} warn={!c?.salesmanId} />
          </div>

          {overLimit && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Balance of {kes(data.currentLedgerBalance)} is over the credit limit of {kes(c!.creditLimit)}.
            </div>
          )}
          {Math.abs(data.difference) >= 0.01 && (
            <div className="rounded-md border border-amber-400/50 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200 print:hidden">
              The balance stored on the customer record ({kes(data.recordedBalance)}) differs from the ledger ({kes(data.currentLedgerBalance)}) by{" "}
              {kes(data.difference)}. This usually means an opening balance was typed in when the customer was created.
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice no.</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.from && (
                  <TableRow className="bg-muted/40">
                    <TableCell colSpan={6} className="text-sm font-medium">
                      Balance brought forward
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">{kes(data.openingBalance)}</TableCell>
                  </TableRow>
                )}
                {data.entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No transactions in this period.
                    </TableCell>
                  </TableRow>
                )}
                {data.entries.map((e, i) => (
                  <TableRow key={`${e.kind}-${e.salesDocumentId}-${i}`}>
                    <TableCell className="whitespace-nowrap text-sm">{new Date(e.date).toLocaleDateString("en-KE")}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {e.salesDocumentId ? (
                        <Link href={`/dashboard/pos/documents/${e.salesDocumentId}`} className="underline-offset-2 hover:underline">
                          {e.invoiceNumber}
                        </Link>
                      ) : (
                        e.invoiceNumber
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={KIND_STYLE[e.kind]}>
                        {KIND_LABEL[e.kind]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{e.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {[e.method, e.paymentReference, e.recordedByName && `by ${e.recordedByName}`].filter(Boolean).join(" · ")}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{money(e.debit)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-emerald-700 dark:text-emerald-300">{money(e.credit)}</TableCell>
                    <TableCell className={cn("text-right font-mono text-sm font-semibold", e.balance > 0 ? "text-foreground" : "text-emerald-700 dark:text-emerald-300")}>
                      {kes(e.balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data.truncated && <p className="text-sm text-muted-foreground">Showing the latest 5,000 lines. Narrow the dates to see earlier ones.</p>}
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value, strong, warn }: { label: string; value: string; strong?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-sm font-mono", strong && "text-base font-bold", warn && "text-destructive")}>{value}</p>
    </div>
  );
}
