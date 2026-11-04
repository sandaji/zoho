"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useHasPermission } from "@/hooks/use-permissions";
import { rfqService, type Scorecard, type VendorScore } from "@/lib/rfq.service";

const err = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const pct = (n: number | null | undefined) => (n == null ? "—" : `${n}%`);
const sc = (n: number | null | undefined) => (n == null ? "—" : `${n}/5`);

export default function SupplierScorecardsPage() {
  const [rows, setRows] = useState<{ id: string; code: string; name: string; score: VendorScore }[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      rfqService
        .scorecards(search.trim() || undefined)
        .then(setRows)
        .catch((e) => toast.error(err(e)))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Supplier scorecards</h1>
        <p className="text-sm text-muted-foreground">
          System score comes from the last 12 months of deliveries (on time, fully received). Manual evaluations by staff are blended in at 40%.
        </p>
      </div>
      <Input className="max-w-xs" placeholder="Search suppliers…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">LPOs (12m)</TableHead>
                <TableHead className="text-right">On time</TableHead>
                <TableHead className="text-right">Fill rate</TableHead>
                <TableHead className="text-right">Manual</TableHead>
                <TableHead className="text-right">Overall</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No suppliers found.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpenId(r.id)}>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.code}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.score.poCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(r.score.onTimePct)}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(r.score.fillRatePct)}</TableCell>
                  <TableCell className="text-right tabular-nums">{sc(r.score.manual?.overall)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{sc(r.score.combined)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ScorecardDialog vendorId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function ScorecardDialog({ vendorId, onClose }: { vendorId: string | null; onClose: () => void }) {
  const { hasPermission } = useHasPermission();
  const canEvaluate = hasPermission("purchasing.vendor.evaluate");
  const [s, setS] = useState<Scorecard | null>(null);
  const [f, setF] = useState({ delivery: "4", quality: "4", price: "4", service: "4", comments: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setS(null);
    if (!vendorId) return;
    rfqService.scorecard(vendorId).then(setS).catch((e) => {
      toast.error(err(e));
      onClose();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  const submit = async () => {
    if (!vendorId) return;
    setBusy(true);
    try {
      setS(await rfqService.evaluate(vendorId, { delivery: +f.delivery, quality: +f.quality, price: +f.price, service: +f.service, comments: f.comments || undefined }));
      toast.success("Evaluation saved for this month");
    } catch (e) {
      toast.error(err(e));
    } finally {
      setBusy(false);
    }
  };

  const rating = (k: "delivery" | "quality" | "price" | "service") => (
    <div>
      <Label className="capitalize">{k}</Label>
      <Input type="number" min={1} max={5} value={f[k]} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} />
    </div>
  );

  return (
    <Dialog open={!!vendorId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {!s ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{s.vendor.name}</DialogTitle>
              <DialogDescription>
                {s.vendor.code} · terms {s.vendor.paymentTerms} · usual lead time {s.vendor.leadTimeDays} days · {s.quotesSubmitted} RFQ quotes submitted
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["On time", pct(s.score.onTimePct)],
                ["Fill rate", pct(s.score.fillRatePct)],
                ["System", sc(s.score.systemScore)],
                ["Overall", sc(s.score.combined)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">{k}</div>
                  <div className="text-lg font-semibold tabular-nums">{v}</div>
                </div>
              ))}
            </div>

            <div>
              <h3 className="mb-1 text-sm font-semibold">Evaluations</h3>
              {s.evaluations.length === 0 ? (
                <p className="text-sm text-muted-foreground">None yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead className="text-right">Deliv.</TableHead>
                      <TableHead className="text-right">Qual.</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Serv.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {s.evaluations.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{e.period}</TableCell>
                        <TableCell>{e.evaluator}</TableCell>
                        <TableCell className="text-right">{e.delivery}</TableCell>
                        <TableCell className="text-right">{e.quality}</TableCell>
                        <TableCell className="text-right">{e.price}</TableCell>
                        <TableCell className="text-right">{e.service}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {canEvaluate && (
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                <h3 className="text-sm font-semibold">Rate this supplier (1–5, one rating per month, re-saving replaces yours)</h3>
                <div className="grid grid-cols-4 gap-2">
                  {rating("delivery")}
                  {rating("quality")}
                  {rating("price")}
                  {rating("service")}
                </div>
                <Input placeholder="Comments (optional)" value={f.comments} onChange={(e) => setF((x) => ({ ...x, comments: e.target.value }))} />
                <Button size="sm" disabled={busy} onClick={submit}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save evaluation
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
