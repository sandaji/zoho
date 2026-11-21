"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, Smartphone, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mpesaService, type MpesaRequest } from "@/lib/mpesa.service";

interface Props {
  /** Amount to request (whole shillings). */
  amount: number;
  defaultPhone?: string;
  /** Called once the customer has paid; the receipt code is what gets recorded on the sale. */
  onPaid: (receiptNumber: string) => void;
  /** Called when a previously confirmed payment should be forgotten (a new request was started). */
  onReset: () => void;
}

/**
 * Request an M-Pesa payment on the customer's phone and follow it to the end.
 * The receipt code it returns fills the payment reference and confirms the payment,
 * and the server links that receipt to the sale and checks the amount.
 */
export function POSMpesaStk({ amount, defaultPhone, onPaid, onReset }: Props) {
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [req, setReq] = useState<MpesaRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<boolean | null>(null);
  const startedAt = useRef<number>(0);
  const paidRef = useRef(false);

  useEffect(() => setPhone(defaultPhone ?? ""), [defaultPhone]);

  useEffect(() => {
    mpesaService
      .status()
      .then((s) => setLive(s.configured))
      .catch(() => setLive(null));
  }, []);

  // Poll while the request is pending; ask Safaricom directly once it has been quiet for a minute.
  useEffect(() => {
    if (!req || req.status !== "PENDING") return;
    const t = setInterval(async () => {
      try {
        const waited = Date.now() - startedAt.current;
        const next = waited > 60_000 ? await mpesaService.query(req.id) : await mpesaService.get(req.id);
        setReq(next);
        if (next.status === "SUCCESS" && next.receiptNumber && !paidRef.current) {
          paidRef.current = true;
          onPaid(next.receiptNumber);
        }
      } catch {
        /* keep polling */
      }
    }, 3000);
    return () => clearInterval(t);
  }, [req, onPaid]);

  const send = async () => {
    setError(null);
    const whole = Math.ceil(amount);
    if (whole < 1) return setError("Nothing to charge yet");
    setBusy(true);
    try {
      paidRef.current = false;
      onReset();
      const r = await mpesaService.request({ phone: phone.trim(), amount: whole, description: "POS sale" });
      startedAt.current = Date.now();
      setReq(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the request");
    } finally {
      setBusy(false);
    }
  };

  const pending = req?.status === "PENDING";
  const paid = req?.status === "SUCCESS";
  const failed = req && ["FAILED", "CANCELLED", "TIMEOUT"].includes(req.status);

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Smartphone className="h-4 w-4" /> Request M-Pesa payment
        {live === false && <span className="text-xs font-normal text-amber-600">(not configured: enter the code by hand below)</span>}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="07XX XXX XXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={pending || paid}
          inputMode="tel"
        />
        <Button type="button" onClick={send} disabled={busy || pending || paid || live === false || !phone.trim()}>
          {busy || pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
        </Button>
      </div>
      {pending && <p className="text-xs text-muted-foreground">Waiting for the customer to enter their PIN…</p>}
      {paid && (
        <p className="flex items-center gap-1 text-xs text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Paid. Receipt {req?.receiptNumber}
        </p>
      )}
      {failed && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <XCircle className="h-4 w-4" /> {req?.resultDesc || req?.status}. You can send it again.
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
