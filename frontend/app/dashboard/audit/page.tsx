"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, ChevronDown, ChevronRight, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface AuditRow {
  id: string;
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  timestamp: string;
  ipAddress?: string | null;
  user?: { id: string; name?: string | null; email: string } | null;
  changes?: {
    method?: string;
    path?: string;
    operation?: string | null;
    statusCode?: number;
    outcome?: "OK" | "REFUSED";
    body?: unknown;
    email?: string;
    userAgent?: string;
  } | null;
}

const PAGE = 50;
const ACTION_COLOR: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
};

export default function AuditTrailPage() {
  const { user } = useAuth();
  const perms = user?.permissions ?? [];
  const allowed = perms.includes("audit.log.view") || perms.includes("admin.user.manage");

  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    user: "",
    q: "",
    entityId: "",
    action: "ALL",
    outcome: "ALL",
    startDate: "",
    endDate: "",
  });
  const set = (k: keyof typeof filters, v: string) => setFilters((p) => ({ ...p, [k]: v }));

  const fetchPage = useCallback(
    async (offset: number) => {
      const qs = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
      if (filters.user.trim()) qs.set("user", filters.user.trim());
      if (filters.q.trim()) qs.set("q", filters.q.trim());
      if (filters.entityId.trim()) qs.set("entityId", filters.entityId.trim());
      if (filters.action !== "ALL") qs.set("action", filters.action);
      if (filters.outcome !== "ALL") qs.set("outcome", filters.outcome);
      if (filters.startDate) qs.set("startDate", filters.startDate);
      if (filters.endDate) qs.set("endDate", filters.endDate);
      const res = await apiClient.request<AuditRow[]>(`/v1/audit-logs?${qs}`, "GET");
      if (!res.success) throw new Error(res.error?.message || "Failed to load audit trail");
      return (res.data as AuditRow[]) ?? [];
    },
    [filters],
  );

  const search = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchPage(0);
      setRows(data);
      setMore(data.length === PAGE);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load audit trail");
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    if (allowed) search();
    else setLoading(false);
    // initial load only; later searches are explicit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  const loadMore = async () => {
    try {
      const data = await fetchPage(rows.length);
      setRows((r) => [...r, ...data]);
      setMore(data.length === PAGE);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load more");
    }
  };

  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-slate-500">
        <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        You don't have permission to view the audit trail.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Audit Trail</h1>
        <p className="text-slate-500">
          Every change made in the system — who did it, when, from where, and what was sent.
          Paste a record's ID to see everything that was ever done to it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <Input placeholder="Person (name or email)" value={filters.user} onChange={(e) => set("user", e.target.value)} />
        <Input placeholder="Record ID" value={filters.entityId} onChange={(e) => set("entityId", e.target.value)} />
        <Input placeholder="Text in request path, e.g. /orders" value={filters.q} onChange={(e) => set("q", e.target.value)} />
        <div className="flex gap-2">
          <Select value={filters.action} onValueChange={(v) => set("action", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Any action</SelectItem>
              <SelectItem value="CREATE">Create</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.outcome} onValueChange={(v) => set("outcome", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Any outcome</SelectItem>
              <SelectItem value="OK">Succeeded</SelectItem>
              <SelectItem value="REFUSED">Refused</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-slate-500">From</label>
          <Input type="date" value={filters.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500">To</label>
          <Input type="date" value={filters.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </div>
        <div className="flex items-end gap-2 md:col-span-2">
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={search} disabled={loading}>
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setFilters({ user: "", q: "", entityId: "", action: "ALL", outcome: "ALL", startDate: "", endDate: "" });
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>What</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-500" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                  Nothing matches those filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const isOpen = openId === r.id;
                const c = r.changes ?? {};
                return (
                  <Fragment key={r.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setOpenId(isOpen ? null : r.id)}
                    >
                      <TableCell>
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(r.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.user ? (
                          <>
                            <p className="font-medium text-slate-800">{r.user.name || r.user.email}</p>
                            {r.user.name && <p className="text-xs text-slate-500">{r.user.email}</p>}
                          </>
                        ) : (
                          <span className="text-slate-500">{c.email ? `Login attempt: ${c.email}` : "Unknown"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={ACTION_COLOR[r.action]}>{r.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <p className="font-medium text-slate-800">
                          {r.entityType}
                          {c.operation ? ` → ${c.operation}` : ""}
                        </p>
                        <p className="font-mono text-xs text-slate-500">{r.entityId}</p>
                      </TableCell>
                      <TableCell>
                        {c.outcome === "REFUSED" ? (
                          <Badge className="bg-amber-100 text-amber-800">Refused ({c.statusCode})</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700">{c.statusCode ?? "OK"}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{r.ipAddress || "-"}</TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow className="bg-slate-50">
                        <TableCell />
                        <TableCell colSpan={6}>
                          <p className="mb-1 font-mono text-xs text-slate-600">
                            {c.method} {c.path}
                          </p>
                          {c.userAgent && <p className="mb-2 text-xs text-slate-400">{c.userAgent}</p>}
                          <pre className="max-h-64 overflow-auto rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700">
                            {c.body !== undefined ? JSON.stringify(c.body, null, 2) : "No request body recorded."}
                          </pre>
                          <p className="mt-1 text-xs text-slate-400">Passwords and tokens are never stored.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {more && !loading && (
        <div className="text-center">
          <Button variant="outline" onClick={loadMore}>Load more</Button>
        </div>
      )}
    </div>
  );
}
