"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { getApiUrl } from "@/lib/api-config";
import { getAuthHeadersWithToken } from "@/lib/api-utils";
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface JournalEntry {
  id: string;
  entry_no: string;
  entry_date: string;
  description: string;
  debit: number;
  credit: number;
  account?: { account_name: string; account_code: string };
  journal?: { name: string };
}

interface Journal {
  id: string;
  name: string;
  code: string;
}

interface Account {
  id: string;
  account_name: string;
  account_code: string;
  account_type: string;
}

interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
  description: string;
}

export default function GeneralLedgerPage() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Account search state for autocomplete
  const [accountSearches, setAccountSearches] = useState<string[]>(["", ""]);
  const [accountDropdowns, setAccountDropdowns] = useState<boolean[]>([false, false]);

  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    journalId: "",
    lines: [
      { accountId: "", debit: 0, credit: 0, description: "" },
      { accountId: "", debit: 0, credit: 0, description: "" },
    ] as JournalLine[],
  });

  const headers = getAuthHeadersWithToken(token || "");

  const fetchMetadata = useCallback(async () => {
    try {
      const [jRes, aRes] = await Promise.all([
        fetch(getApiUrl("/v1/finance/gl/journals"), { headers }),
        fetch(getApiUrl("/v1/finance/accounts"), { headers }),
      ]);
      const [jData, aData] = await Promise.all([jRes.json(), aRes.json()]);
      if (jData.status === "success") setJournals(jData.data);
      if (aData.success) setAccounts(aData.data);
    } catch (error) {
      console.error("Error fetching metadata:", error);
    }
  }, [token]);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(getApiUrl("/v1/finance/gl/entries"), { headers });
      const data = await res.json();
      if (data.status === "success") setEntries(data.data);
    } catch (error) {
      console.error("Error fetching GL entries:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchEntries();
      fetchMetadata();
    }
  }, [token, fetchEntries, fetchMetadata]);

  const handleAddLine = () => {
    setFormData((prev) => ({
      ...prev,
      lines: [...prev.lines, { accountId: "", debit: 0, credit: 0, description: "" }],
    }));
    setAccountSearches((prev) => [...prev, ""]);
    setAccountDropdowns((prev) => [...prev, false]);
  };

  const handleLineChange = (index: number, field: string, value: string | number) => {
    setFormData((prev) => {
      const newLines = [...prev.lines];
      (newLines[index] as any)[field] = value;
      return { ...prev, lines: newLines };
    });
  };

  const selectAccount = (index: number, account: Account) => {
    handleLineChange(index, "accountId", account.id);
    setAccountSearches((prev) => {
      const next = [...prev];
      next[index] = `${account.account_code} — ${account.account_name}`;
      return next;
    });
    setAccountDropdowns((prev) => {
      const next = [...prev];
      next[index] = false;
      return next;
    });
  };

  const filteredAccounts = (search: string) =>
    accounts.filter(
      (a) =>
        a.account_name.toLowerCase().includes(search.toLowerCase()) ||
        a.account_code.toLowerCase().includes(search.toLowerCase()),
    );

  const totalDebit = formData.lines.reduce((s, l) => s + Number(l.debit), 0);
  const totalCredit = formData.lines.reduce((s, l) => s + Number(l.credit), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;

  const handleSubmit = async () => {
    if (!isBalanced) {
      toast(
        `Entry not balanced — Debit ${totalDebit.toFixed(2)} ≠ Credit ${totalCredit.toFixed(2)}`,
        "error",
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(getApiUrl("/v1/finance/gl/entries"), {
        method: "POST",
        headers,
        body: JSON.stringify({ ...formData, date: new Date(formData.date) }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast("Journal entry posted successfully", "success");
        setIsModalOpen(false);
        fetchEntries();
        setFormData({
          date: format(new Date(), "yyyy-MM-dd"),
          description: "",
          journalId: "",
          lines: [
            { accountId: "", debit: 0, credit: 0, description: "" },
            { accountId: "", debit: 0, credit: 0, description: "" },
          ],
        });
        setAccountSearches(["", ""]);
      } else {
        toast(data.message || "Failed to create entry", "error");
      }
    } catch {
      toast("Network error — please try again", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = entries.filter(
    (e) =>
      !searchQuery ||
      e.entry_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.account?.account_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">General Ledger</h1>
          <p className="text-muted-foreground">
            View and manage all journal entries and financial transactions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-700 hover:bg-emerald-800">
                <Plus className="w-4 h-4 mr-2" />
                New Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Manual Journal Entry</DialogTitle>
                <DialogDescription>
                  Record a manual adjustment. Debits must equal Credits.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label>Entry Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Journal</Label>
                  <Select
                    value={formData.journalId}
                    onValueChange={(v) => setFormData({ ...formData, journalId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Journal" />
                    </SelectTrigger>
                    <SelectContent>
                      {journals.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Reference or overall description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              {/* Lines */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Entry Lines</h3>
                  <Button variant="outline" size="sm" onClick={handleAddLine}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Line
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[35%]">Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[14%]">Debit</TableHead>
                      <TableHead className="w-[14%]">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.lines.map((line, idx) => (
                      <TableRow key={idx}>
                        {/* Account autocomplete */}
                        <TableCell className="relative">
                          <Input
                            placeholder="Search account name or code…"
                            value={accountSearches[idx] ?? ""}
                            className="text-xs h-8"
                            onChange={(e) => {
                              const v = e.target.value;
                              setAccountSearches((prev) => {
                                const next = [...prev];
                                next[idx] = v;
                                return next;
                              });
                              setAccountDropdowns((prev) => {
                                const next = [...prev];
                                next[idx] = v.length >= 1;
                                return next;
                              });
                              if (!v) handleLineChange(idx, "accountId", "");
                            }}
                            onFocus={() => {
                              if ((accountSearches[idx] ?? "").length >= 1) {
                                setAccountDropdowns((prev) => {
                                  const next = [...prev];
                                  next[idx] = true;
                                  return next;
                                });
                              }
                            }}
                          />
                          {accountDropdowns[idx] && (
                            <div className="absolute z-50 mt-1 w-72 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg">
                              {filteredAccounts(accountSearches[idx] ?? "").length === 0 ? (
                                <p className="p-3 text-xs text-slate-400">No accounts found</p>
                              ) : (
                                filteredAccounts(accountSearches[idx] ?? "")
                                  .slice(0, 10)
                                  .map((a) => (
                                    <button
                                      key={a.id}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        selectAccount(idx, a);
                                      }}
                                    >
                                      <span className="font-mono text-slate-400 shrink-0">
                                        {a.account_code}
                                      </span>
                                      <span className="text-slate-800 truncate">{a.account_name}</span>
                                      <span className="ml-auto text-[10px] text-slate-400 capitalize shrink-0">
                                        {a.account_type}
                                      </span>
                                    </button>
                                  ))
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Line description"
                            value={line.description}
                            onChange={(e) => handleLineChange(idx, "description", e.target.value)}
                            className="text-xs h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={line.debit || ""}
                            onChange={(e) =>
                              handleLineChange(idx, "debit", Number(e.target.value))
                            }
                            className="text-xs h-8 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={line.credit || ""}
                            onChange={(e) =>
                              handleLineChange(idx, "credit", Number(e.target.value))
                            }
                            className="text-xs h-8 text-right"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    <TableRow className="bg-slate-50 font-semibold">
                      <TableCell colSpan={2} className="text-xs text-right text-slate-500">
                        Totals
                      </TableCell>
                      <TableCell className="text-xs text-right text-emerald-700">
                        {totalDebit.toLocaleString()}
                      </TableCell>
                      <TableCell
                        className={`text-xs text-right ${isBalanced ? "text-emerald-700" : "text-red-600"}`}
                      >
                        {totalCredit.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                {!isBalanced && totalDebit + totalCredit > 0 && (
                  <p className="text-xs text-red-600">
                    ⚠ Entry is not balanced — difference:{" "}
                    {Math.abs(totalDebit - totalCredit).toFixed(2)}
                  </p>
                )}
              </div>

              <DialogFooter className="mt-6">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!isBalanced || submitting}
                  className="bg-emerald-700 hover:bg-emerald-800"
                >
                  {submitting ? "Posting…" : "Post Entry"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-50/50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entries.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/50 border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600">
              Active Fiscal Year
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Date().getFullYear()}</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50 border-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">Open Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{format(new Date(), "MMMM yyyy")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Entries table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search entries, accounts, or references…"
              className="pl-9 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="ghost" size="sm">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            Sort
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Entry No</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <BookOpen className="h-8 w-8 opacity-40" />
                    <p className="text-sm font-medium">No journal entries found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-slate-50/50">
                  <TableCell className="text-sm font-medium">
                    {format(new Date(entry.entry_date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {entry.entry_no}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {entry.account?.account_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {entry.account?.account_code}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-slate-600">
                    {entry.description}
                  </TableCell>
                  <TableCell className="text-right font-medium text-sm text-emerald-700">
                    {entry.debit > 0 ? `KES ${entry.debit.toLocaleString()}` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium text-sm text-slate-600">
                    {entry.credit > 0 ? `KES ${entry.credit.toLocaleString()}` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-slate-200"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Export PDF</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          Reverse Entry
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
