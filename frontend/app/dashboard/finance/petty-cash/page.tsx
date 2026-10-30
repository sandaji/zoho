"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, ArrowDownCircle, ArrowUpCircle, Ban } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  pettyCashService,
  PETTY_CATEGORIES,
  type PettyCashFund,
  type PettyCashEntry,
} from "@/lib/petty-cash.service";
import { toast } from "sonner";

const kes = (n: number) =>
  `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const who = (p?: { name?: string | null; email: string } | null) => p?.name || p?.email || "-";

type Dialogs = "create" | "topup" | "pay" | "void" | null;

export default function PettyCashPage() {
  const { user } = useAuth();
  const perms = user?.permissions ?? [];
  const canManage = perms.includes("finance.pettycash.manage");

  const [funds, setFunds] = useState<PettyCashFund[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [fund, setFund] = useState<PettyCashFund | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [voidTarget, setVoidTarget] = useState<PettyCashEntry | null>(null);

  // form state (shared; reset when a dialog opens)
  const [f, setF] = useState({
    name: "",
    custodianEmail: "",
    imprest: 0,
    max: 0,
    amount: 0,
    source: "cash",
    payee: "",
    category: "",
    description: "",
    receiptRef: "",
    reason: "",
  });
  const set = (k: keyof typeof f, v: string | number) => setF((p) => ({ ...p, [k]: v }));

  const loadFunds = useCallback(async () => {
    try {
      const list = await pettyCashService.listFunds();
      setFunds(list);
      setActiveId((cur) => cur ?? list[0]?.id ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load petty cash");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFund = useCallback(async (id: string) => {
    try {
      setFund(await pettyCashService.getFund(id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load fund");
    }
  }, []);

  useEffect(() => {
    loadFunds();
  }, [loadFunds]);
  useEffect(() => {
    if (activeId) loadFund(activeId);
    else setFund(null);
  }, [activeId, loadFund]);

  const open = (d: Dialogs) => {
    setF((p) => ({
      ...p,
      amount: 0,
      payee: "",
      category: "",
      description: "",
      receiptRef: "",
      reason: "",
      // suggest the amount that restores the float
      ...(d === "topup" && fund ? { amount: Math.max(fund.imprestAmount - fund.balance, 0) } : {}),
    }));
    setDialog(d);
  };

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      setBusy(true);
      await fn();
      toast.success(ok);
      setDialog(null);
      await loadFunds();
      if (activeId) await loadFund(activeId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const isCustodian = !!fund && fund.custodianId === user?.id;
  const spent = fund ? fund.imprestAmount - fund.balance : 0;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Petty Cash</h1>
          <p className="text-slate-500">
            {canManage
              ? "Imprest funds held by custodians. Top up to restore the float."
              : "Your petty cash float and every payment made from it."}
          </p>
        </div>
        {canManage && (
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => open("create")}>
            <Plus className="mr-2 h-4 w-4" />
            New Fund
          </Button>
        )}
      </div>

      {funds.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center text-slate-500">
            {canManage
              ? "No petty cash funds yet. Create one and name its custodian."
              : "You are not the custodian of a petty cash fund."}
          </CardContent>
        </Card>
      ) : (
        <>
          {funds.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {funds.map((x) => (
                <Button
                  key={x.id}
                  size="sm"
                  variant={x.id === activeId ? "default" : "outline"}
                  className={x.id === activeId ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                  onClick={() => setActiveId(x.id)}
                >
                  {x.name}
                </Button>
              ))}
            </div>
          )}

          {fund && (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card className="border-slate-200 md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Cash on hand — {fund.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-900">{kes(fund.balance)}</div>
                    <p className="mt-1 text-xs text-slate-500">
                      Custodian: {who(fund.custodian)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Float
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-slate-900">{kes(fund.imprestAmount)}</div>
                    <p className="mt-1 text-xs text-slate-500">Max per payment {kes(fund.maxPerTransaction)}</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      To replenish
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-amber-600">{kes(Math.max(spent, 0))}</div>
                    <p className="mt-1 text-xs text-slate-500">Spent since last top-up</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap gap-3">
                {isCustodian && (
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => open("pay")}>
                    <ArrowUpCircle className="mr-2 h-4 w-4" />
                    Pay Out
                  </Button>
                )}
                {canManage && !isCustodian && (
                  <Button variant="outline" onClick={() => open("topup")}>
                    <ArrowDownCircle className="mr-2 h-4 w-4" />
                    Top Up
                  </Button>
                )}
                {canManage && isCustodian && (
                  <p className="self-center text-xs text-slate-500">
                    You are this fund's custodian, so someone else must top it up or void entries.
                  </p>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Entry #</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Recorded by</TableHead>
                      <TableHead className="text-right">In</TableHead>
                      <TableHead className="text-right">Out</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      {canManage && <TableHead />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(fund.entries ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canManage ? 8 : 7} className="h-20 text-center text-slate-500">
                          No movements yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      fund.entries!.map((e) => (
                        <TableRow key={e.id} className={e.voidedAt ? "opacity-50" : ""}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {new Date(e.entryDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{e.entryNumber}</TableCell>
                          <TableCell className="text-sm">
                            <p className="font-medium text-slate-800">
                              {e.type === "TOPUP" ? "Top-up" : `${e.payee} · ${e.category}`}
                              {e.voidedAt && (
                                <Badge className="ml-2 bg-red-100 text-red-700">VOID</Badge>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">
                              {e.description}
                              {e.receiptRef ? ` · receipt ${e.receiptRef}` : ""}
                              {e.voidedAt ? ` · voided by ${who(e.voidedBy)}: ${e.voidReason}` : ""}
                            </p>
                          </TableCell>
                          <TableCell className="text-sm">{who(e.recordedBy)}</TableCell>
                          <TableCell className="text-right text-sm text-emerald-700">
                            {e.type === "TOPUP" ? kes(e.amount) : ""}
                          </TableCell>
                          <TableCell className="text-right text-sm text-red-600">
                            {e.type === "DISBURSEMENT" ? kes(e.amount) : ""}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold">
                            {kes(e.balanceAfter)}
                          </TableCell>
                          {canManage && (
                            <TableCell className="text-right">
                              {!e.voidedAt && e.recordedById !== user?.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-400 hover:text-red-600"
                                  title="Void entry"
                                  onClick={() => {
                                    setVoidTarget(e);
                                    open("void");
                                  }}
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </>
      )}

      {/* Create fund */}
      <Dialog open={dialog === "create"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Petty Cash Fund</DialogTitle>
            <DialogDescription>The float is the most the custodian holds. Fund it with a top-up afterwards.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Fund name, e.g. Head Office Petty Cash" value={f.name} onChange={(e) => set("name", e.target.value)} />
            <Input placeholder="Custodian's email" value={f.custodianEmail} onChange={(e) => set("custodianEmail", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Float (KES)</label>
                <Input type="number" min="0" value={f.imprest} onChange={(e) => set("imprest", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs text-slate-500">Max per payment (KES)</label>
                <Input type="number" min="0" value={f.max} onChange={(e) => set("max", parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>Cancel</Button>
            <Button
              disabled={busy}
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() =>
                run(async () => {
                  const created = await pettyCashService.createFund({
                    name: f.name,
                    custodianEmail: f.custodianEmail,
                    imprestAmount: f.imprest,
                    maxPerTransaction: f.max,
                  });
                  setActiveId(created.id);
                }, "Fund created")
              }
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Top up */}
      <Dialog open={dialog === "topup"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Top Up {fund?.name}</DialogTitle>
            <DialogDescription>
              Cash moves from the source below into petty cash. The fund can't go above its float.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-slate-500">Amount (KES)</label>
              <Input type="number" min="0" value={f.amount} onChange={(e) => set("amount", parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Taken from</label>
              <Select value={f.source} onValueChange={(v) => set("source", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash on hand</SelectItem>
                  <SelectItem value="bank">Bank account</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Note (optional)" value={f.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>Cancel</Button>
            <Button
              disabled={busy || f.amount <= 0}
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() =>
                fund &&
                run(
                  () => pettyCashService.topUp(fund.id, { amount: f.amount, source: f.source, description: f.description || undefined }),
                  "Fund topped up",
                )
              }
            >
              Top Up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay out */}
      <Dialog open={dialog === "pay"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Out of Petty Cash</DialogTitle>
            <DialogDescription>
              Balance {fund ? kes(fund.balance) : ""} · limit {fund ? kes(fund.maxPerTransaction) : ""} per payment.
              Larger amounts need a payment voucher.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Amount (KES)</label>
                <Input type="number" min="0" value={f.amount} onChange={(e) => set("amount", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs text-slate-500">Category</label>
                <Select value={f.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    {PETTY_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Input placeholder="Paid to" value={f.payee} onChange={(e) => set("payee", e.target.value)} />
            <Input placeholder="What was it for?" value={f.description} onChange={(e) => set("description", e.target.value)} />
            <Input placeholder="Receipt / slip number (optional)" value={f.receiptRef} onChange={(e) => set("receiptRef", e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>Cancel</Button>
            <Button
              disabled={busy || f.amount <= 0 || !f.payee.trim() || !f.category || !f.description.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() =>
                fund &&
                run(
                  () =>
                    pettyCashService.disburse(fund.id, {
                      amount: f.amount,
                      payee: f.payee,
                      category: f.category,
                      description: f.description,
                      receiptRef: f.receiptRef || undefined,
                    }),
                  "Payment recorded",
                )
              }
            >
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void */}
      <Dialog open={dialog === "void"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void {voidTarget?.entryNumber}</DialogTitle>
            <DialogDescription>
              This reverses the entry in the ledger and puts the cash back. The original stays on record, marked void.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input placeholder="Reason (required)" value={f.reason} onChange={(e) => set("reason", e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>Cancel</Button>
            <Button
              disabled={busy || !f.reason.trim()}
              className="bg-red-600 hover:bg-red-700"
              onClick={() => voidTarget && run(() => pettyCashService.voidEntry(voidTarget.id, f.reason), "Entry voided")}
            >
              Void Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
