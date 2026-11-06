"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, RefreshCw, Smartphone, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHasPermission } from "@/hooks/use-permissions";
import { mpesaService, MPESA_STATUS_COLORS, type MpesaRequest } from "@/lib/mpesa.service";

const err = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const when = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");
const kes = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;

export default function MpesaPage() {
  const { hasPermission } = useHasPermission();
  const canInitiate = hasPermission("sales.mpesa.initiate");
  const [rows, setRows] = useState<MpesaRequest[]>([]);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [asking, setAsking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await mpesaService.list({ status: status === "ALL" ? undefined : status, search: search.trim() || undefined }));
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
  useEffect(() => {
    mpesaService.status().then((s) => setConfigured(s.configured)).catch(() => setConfigured(null));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">M-Pesa payments</h1>
          <p className="text-sm text-muted-foreground">
            Send a payment prompt to the customer&apos;s phone. When they pay, the M-Pesa code appears here: enter it as the payment reference at the till. A code can only pay for one sale.
          </p>
        </div>
        {canInitiate && (
          <Button size="sm" disabled={configured === false} onClick={() => setAsking(true)}>
            <Smartphone className="mr-1 h-4 w-4" /> Request payment
          </Button>
        )}
      </div>
      {configured === false && <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">M-Pesa is not set up on the server yet. An administrator needs to add the Daraja settings.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            {["PENDING", "SUCCESS", "FAILED", "CANCELLED", "TIMEOUT"].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input className="max-w-xs" placeholder="Phone, M-Pesa code or reference…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>M-Pesa code</TableHead>
                <TableHead>Used on sale</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No M-Pesa requests.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-sm">{when(r.createdAt)}</TableCell>
                  <TableCell>{r.phone}</TableCell>
                  <TableCell className="text-right tabular-nums">{kes(r.amount)}</TableCell>
                  <TableCell>{r.accountReference}</TableCell>
                  <TableCell className="font-mono text-sm">{r.receiptNumber ?? "—"}</TableCell>
                  <TableCell>{r.salesDocumentId ? "Yes" : "—"}</TableCell>
                  <TableCell>
                    <Badge className={MPESA_STATUS_COLORS[r.status]} title={r.resultDesc ?? undefined}>
                      {r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <RequestDialog open={asking} onClose={() => setAsking(false)} onDone={load} />
    </div>
  );
}

function RequestDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ phone: "", amount: "", reference: "" });
  const [busy, setBusy] = useState(false);
  const [req, setReq] = useState<MpesaRequest | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  useEffect(() => {
    if (!open) {
      stop();
      setReq(null);
    }
  }, [open]);

  const follow = (id: string) => {
    stop();
    let ticks = 0;
    timer.current = setInterval(async () => {
      ticks += 1;
      try {
        const r = await mpesaService.get(id);
        setReq(r);
        if (r.status !== "PENDING") {
          stop();
          onDone();
        } else if (ticks === 20) {
          // 60s without a callback: ask Safaricom directly
          const q = await mpesaService.query(id);
          setReq(q);
          if (q.status !== "PENDING") {
            stop();
            onDone();
          }
        }
      } catch {
        /* keep trying */
      }
    }, 3000);
  };

  const send = async () => {
    setBusy(true);
    try {
      const r = await mpesaService.request({ phone: f.phone, amount: Number(f.amount), reference: f.reference || undefined });
      setReq(r);
      follow(r.id);
      onDone();
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request M-Pesa payment</DialogTitle>
          <DialogDescription>The customer gets a prompt on their phone and enters their M-Pesa PIN.</DialogDescription>
        </DialogHeader>
        {!req ? (
          <div className="grid gap-3">
            <div>
              <Label>Customer phone</Label>
              <Input placeholder="0712 345 678" value={f.phone} onChange={(e) => setF((x) => ({ ...x, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Amount (KSh)</Label>
              <Input type="number" min={1} value={f.amount} onChange={(e) => setF((x) => ({ ...x, amount: e.target.value }))} />
            </div>
            <div>
              <Label>Reference (optional, up to 12 characters)</Label>
              <Input maxLength={12} placeholder="e.g. INV-1042" value={f.reference} onChange={(e) => setF((x) => ({ ...x, reference: e.target.value }))} />
            </div>
            <Button disabled={busy || !f.phone.trim() || !(Number(f.amount) >= 1)} onClick={send}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send prompt
            </Button>
          </div>
        ) : (
          <div className="space-y-3 text-center">
            {req.status === "PENDING" && (
              <>
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-sm">
                  Waiting for {req.phone} to approve {kes(req.amount)}…
                </p>
              </>
            )}
            {req.status === "SUCCESS" && (
              <>
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <p className="font-medium">Paid {kes(req.paidAmount ?? req.amount)}</p>
                <p className="text-sm text-muted-foreground">M-Pesa code</p>
                <p className="font-mono text-2xl font-semibold">{req.receiptNumber ?? "arriving…"}</p>
                <p className="text-xs text-muted-foreground">Use this code as the payment reference at the till.</p>
              </>
            )}
            {["FAILED", "CANCELLED", "TIMEOUT"].includes(req.status) && (
              <>
                <XCircle className="mx-auto h-10 w-10 text-rose-600" />
                <p className="font-medium">{req.status === "CANCELLED" ? "The customer cancelled" : req.status === "TIMEOUT" ? "No response from the customer" : "Payment failed"}</p>
                {req.resultDesc && <p className="text-sm text-muted-foreground">{req.resultDesc}</p>}
              </>
            )}
            {req.status !== "PENDING" && (
              <Button
                variant="outline"
                onClick={() => {
                  setReq(null);
                  setF({ phone: "", amount: "", reference: "" });
                }}
              >
                New request
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
