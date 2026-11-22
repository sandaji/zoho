"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, UserCheck } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { authFetch } from "@/lib/api-client";

interface Row {
  id: string;
  code: string;
  name: string;
  phone?: string | null;
}

/**
 * Clean-up for customers that have no salesman: tick the ones you want, pick a salesman, apply.
 * Only lists customers without a salesman, so it is empty once everyone is assigned.
 */
export function BulkAssignDialog({
  token,
  salesmen,
  onDone,
  onError,
}: {
  token: string | null | undefined;
  salesmen: { id: string; name: string }[];
  onDone: (updated: number) => void;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [salesmanId, setSalesmanId] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  // The parent passes fresh callbacks every render; keep the latest in a ref so loading doesn't re-run each time.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/v1/customers?salesmanId=none&limit=200&search=${encodeURIComponent(filter)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || json?.error || "Could not load customers");
      setRows(json.data ?? []);
      setTotal(json.total ?? (json.data ?? []).length);
      setPicked(new Set());
    } catch (e) {
      onErrorRef.current(e instanceof Error ? e.message : "Could not load customers");
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [open, load]);

  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allPicked = rows.length > 0 && picked.size === rows.length;

  const apply = async () => {
    if (!salesmanId || picked.size === 0) return;
    setSaving(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/v1/customers/assign-salesman`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ customerIds: [...picked], salesmanId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || json?.error || "Could not assign");
      onDone(json.data?.updated ?? picked.size);
      await load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not assign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserCheck className="mr-2 h-4 w-4" />
          Assign salesmen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Customers without a salesman</DialogTitle>
          <DialogDescription>
            {total === 0 && !loading ? "Everyone has a salesman." : `${total} customer${total === 1 ? "" : "s"} still need one. Tick them, choose a salesman, apply.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <Label htmlFor="bulk-filter">Search</Label>
            <input
              id="bulk-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Name, code or phone"
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="bulk-salesman">Salesman</Label>
            <select
              id="bulk-salesman"
              value={salesmanId}
              onChange={(e) => setSalesmanId(e.target.value)}
              className="mt-1 h-9 w-56 rounded-md border border-input bg-background px-3 text-sm [color-scheme:light] dark:[color-scheme:dark]"
            >
              <option value="">Choose…</option>
              {salesmen.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={apply} disabled={saving || !salesmanId || picked.size === 0}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Assign ${picked.size || ""}`.trim()}
          </Button>
        </div>

        <div className="max-h-[50vh] overflow-auto rounded-md border border-border">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="w-8 p-2">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={allPicked}
                      onChange={() => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.id)))}
                    />
                  </th>
                  <th className="p-2 text-left font-medium">Code</th>
                  <th className="p-2 text-left font-medium">Name</th>
                  <th className="p-2 text-left font-medium">Phone</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/50">
                    <td className="p-2">
                      <input type="checkbox" checked={picked.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.name}`} />
                    </td>
                    <td className="p-2 font-mono text-xs text-muted-foreground">{r.code}</td>
                    <td className="p-2">{r.name}</td>
                    <td className="p-2 text-muted-foreground">{r.phone || "-"}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      Nothing to assign.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        {total > rows.length && <p className="text-xs text-muted-foreground">Showing the first {rows.length}. Apply, and the next ones load.</p>}
      </DialogContent>
    </Dialog>
  );
}
