"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
import { Plus, Search, Eye, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { expenseReportService, type ExpenseReport } from "@/lib/expense-report.service";
import { toast } from "sonner";

type Status = ExpenseReport["status"];

const STATUS_COLOR_MAP: Record<Status, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  REJECTED: "bg-red-100 text-red-800",
  POSTED: "bg-slate-100 text-slate-800",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export default function ExpenseReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "ALL">("ALL");

  const canViewAll = user?.permissions?.includes("finance.expense.view_all") ?? false;

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await expenseReportService.list();
      setReports(data.reports || []);
    } catch (error) {
      console.error("Failed to fetch expense reports:", error);
      toast.error("Failed to load expense reports");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(
    () =>
      reports.filter((r) => {
        const matchesSearch =
          r.expenseNumber.toLowerCase().includes(search.toLowerCase()) ||
          (r.employee?.name || r.employee?.email || "").toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [reports, search, statusFilter],
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expense Reports</h1>
          <p className="text-slate-500">
            {canViewAll
              ? "All employee expense submissions, across the company"
              : "Your submitted expenses and their approval status"}
          </p>
        </div>
        <Link href="/dashboard/finance/expenses/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            Submit Expense
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by expense number or employee..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "ALL")}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="POSTED">Posted to GL</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Expense #</TableHead>
              {canViewAll && <TableHead>Employee</TableHead>}
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={canViewAll ? 6 : 5} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mx-auto" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canViewAll ? 6 : 5} className="h-24 text-center text-slate-500">
                  No expense reports found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id} className="hover:bg-emerald-50/50">
                  <TableCell>
                    <Link
                      href={`/dashboard/finance/expenses/${r.id}`}
                      className="font-medium text-emerald-600 hover:underline"
                    >
                      {r.expenseNumber}
                    </Link>
                  </TableCell>
                  {canViewAll && (
                    <TableCell className="text-slate-700">
                      {r.employee?.name || r.employee?.email}
                    </TableCell>
                  )}
                  <TableCell className="text-slate-700">{r.department?.name || "-"}</TableCell>
                  <TableCell className="text-right font-semibold text-slate-900">
                    KES {r.totalAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLOR_MAP[r.status]}>{r.status.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/finance/expenses/${r.id}`}>
                      <Button variant="ghost" size="sm" className="hover:text-emerald-600">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
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
