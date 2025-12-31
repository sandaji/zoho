"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown, 
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
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
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function GeneralLedgerPage() {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    journalId: "",
    lines: [
      { accountId: "", debit: 0, credit: 0, description: "" },
      { accountId: "", debit: 0, credit: 0, description: "" }
    ]
  });

  useEffect(() => {
    fetchEntries();
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const jRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/finance/gl/journals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const jData = await jRes.json();
      if (jData.status === "success") setJournals(jData.data);
    } catch (error) {
      console.error("Error fetching metadata:", error);
    }
  };

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/finance/gl/entries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setEntries(data.data);
      }
    } catch (error) {
      console.error("Error fetching GL entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { accountId: "", debit: 0, credit: 0, description: "" }]
    });
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...formData.lines];
    (newLines[index] as any)[field] = value;
    setFormData({ ...formData, lines: newLines });
  };

  const handleSubmit = async () => {
    const totalDebit = formData.lines.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = formData.lines.reduce((sum, l) => sum + Number(l.credit), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      showToast("Entries not balanced", `Total Debit (${totalDebit}) must equal Total Credit (${totalCredit})`, "error");
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/finance/gl/entries`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          ...formData,
          date: new Date(formData.date)
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        showToast("Journal Entry created", undefined, "success");
        setIsModalOpen(false);
        fetchEntries();
      } else {
        showToast("Error", data.message || "Failed to create entry", "error");
      }
    } catch (error) {
      showToast("Network error", undefined, "error");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">General Ledger</h1>
          <p className="text-muted-foreground">View and manage all journal entries and financial transactions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Manual Journal Entry</DialogTitle>
                <DialogDescription>Record a manual adjustment or custom transaction.</DialogDescription>
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
                      {journals.map(j => (
                        <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>General Description</Label>
                  <Input 
                    placeholder="Reference or overall description" 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
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
                      <TableHead className="w-[30%]">Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[15%]">Debit</TableHead>
                      <TableHead className="w-[15%]">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.lines.map((line, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Input 
                            placeholder="Account ID..." 
                            value={line.accountId}
                            onChange={(e) => handleLineChange(idx, "accountId", e.target.value)}
                            className="text-xs h-8"
                          />
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
                            value={line.debit}
                            onChange={(e) => handleLineChange(idx, "debit", Number(e.target.value))}
                            className="text-xs h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={line.credit}
                            onChange={(e) => handleLineChange(idx, "credit", Number(e.target.value))}
                            className="text-xs h-8"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <DialogFooter className="mt-6">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">Post Entry</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-50/50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entries.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50/50 border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Active Fiscal Year</CardTitle>
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

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search entries, accounts, or references..." 
              className="pl-9 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              Sort
            </Button>
          </div>
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
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-full ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : entries.filter(e => 
                !searchQuery || 
                e.entry_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.account?.account_name?.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No journal entries found.
                </TableCell>
              </TableRow>
            ) : (
              entries.filter(e => 
                !searchQuery || 
                e.entry_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.account?.account_name?.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((entry) => (
                <TableRow key={entry.id} className="hover:bg-slate-50/50 transition-colors">
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
                      <span className="font-medium text-sm">{entry.account?.account_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{entry.account?.account_code}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-slate-600">
                    {entry.description}
                  </TableCell>
                  <TableCell className="text-right font-medium text-sm">
                    {entry.debit > 0 ? `KES ${entry.debit.toLocaleString()}` : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium text-sm">
                    {entry.credit > 0 ? `KES ${entry.credit.toLocaleString()}` : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Export PDF</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">Delete Entry</DropdownMenuItem>
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
