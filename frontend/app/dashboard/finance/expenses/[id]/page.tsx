"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Send,
  BookCheck,
  Paperclip,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { expenseReportService, type ExpenseReport } from "@/lib/expense-report.service";
import { toast } from "sonner";

const STATUS_COLOR_MAP: Record<ExpenseReport["status"], string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  REJECTED: "bg-red-100 text-red-800",
  POSTED: "bg-slate-100 text-slate-800",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export default function ExpenseReportDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const id = params.id as string;

  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const permissions = user?.permissions || [];
  const canApprove = (level: "standard" | "high_value" | "executive") =>
    permissions.includes(`finance.expense.approve_${level}`) ||
    permissions.includes("finance.expense.approve_executive");
  const canPost = permissions.includes("finance.expense.post");

  const approvalLevel = report
    ? report.totalAmount < 10000
      ? "standard"
      : report.totalAmount < 100000
        ? "high_value"
        : "executive"
    : "standard";

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await expenseReportService.getById(id);
      setReport(data);
    } catch (error) {
      console.error("Failed to fetch expense report:", error);
      toast.error("Failed to load expense report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchReport();
  }, [id]);

  const handleStatusChange = async (status: string, reason?: string) => {
    try {
      setActing(true);
      await expenseReportService.updateStatus(id, status, reason);
      toast.success(`Expense report ${status.toLowerCase()}`);
      setRejectOpen(false);
      setRejectionReason("");
      fetchReport();
    } catch (error) {
      console.error("Failed to update expense report:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update expense report");
    } finally {
      setActing(false);
    }
  };

  const handlePost = async () => {
    try {
      setActing(true);
      await expenseReportService.postToGL(id);
      toast.success("Posted to the General Ledger");
      fetchReport();
    } catch (error) {
      console.error("Failed to post expense report:", error);
      toast.error(error instanceof Error ? error.message : "Failed to post expense report");
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <p className="text-slate-500">Expense report not found.</p>
      </div>
    );
  }

  const isOwner = report.employeeId === user?.id;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/finance/expenses">
              <Button variant="ghost" size="sm" className="hover:text-emerald-600">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{report.expenseNumber}</h1>
              <Badge className={STATUS_COLOR_MAP[report.status]}>{report.status.replace(/_/g, " ")}</Badge>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            {report.status === "DRAFT" && isOwner && (
              <Button
                onClick={() => handleStatusChange("SUBMITTED")}
                disabled={acting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Send className="h-4 w-4 mr-2" />
                Submit for Approval
              </Button>
            )}
            {report.status === "SUBMITTED" && !isOwner && canApprove(approvalLevel) && (
              <>
                <Button
                  onClick={() => handleStatusChange("APPROVED")}
                  disabled={acting}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRejectOpen(true)}
                  disabled={acting}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            {report.status === "SUBMITTED" && isOwner && canApprove(approvalLevel) && (
              <p className="text-xs text-slate-500">
                You can't approve your own expense report — segregation of duties.
              </p>
            )}
            {report.status === "APPROVED" && canPost && (
              <Button onClick={handlePost} disabled={acting} className="bg-emerald-600 hover:bg-emerald-700">
                <BookCheck className="h-4 w-4 mr-2" />
                Post to GL
              </Button>
            )}
          </div>
        </div>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-slate-500">Employee</p>
              <p className="font-medium text-slate-900">{report.employee?.name || report.employee?.email}</p>
            </div>
            <div>
              <p className="text-slate-500">Department</p>
              <p className="font-medium text-slate-900">{report.department?.name || "-"}</p>
            </div>
            <div>
              <p className="text-slate-500">Total Amount</p>
              <p className="font-medium text-slate-900">
                KES {report.totalAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
              </p>
            </div>
            {report.notes && (
              <div className="md:col-span-3">
                <p className="text-slate-500">Notes</p>
                <p className="text-slate-700">{report.notes}</p>
              </div>
            )}
            {report.status === "REJECTED" && report.rejectedReason && (
              <div className="md:col-span-3 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 font-medium">Rejection reason</p>
                <p className="text-red-600">{report.rejectedReason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Expense Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.items.map((item, idx) => (
                  <TableRow key={item.id || idx}>
                    <TableCell>{new Date(item.expenseDate).toLocaleDateString()}</TableCell>
                    <TableCell>{item.vendor}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-slate-600">{item.description || "-"}</TableCell>
                    <TableCell className="text-right font-semibold">
                      KES {item.amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.receiptUrl ? (
                        <a
                          href={item.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:underline inline-flex items-center gap-1"
                        >
                          <Paperclip className="h-3 w-3" /> View
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end mt-4 text-lg font-bold text-slate-900">
              Total: KES {report.totalAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Expense Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="block text-sm font-medium text-slate-700">Rejection Reason</label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              rows={3}
              placeholder="Explain what needs to change..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={acting}>
              Cancel
            </Button>
            <Button
              onClick={() => handleStatusChange("REJECTED", rejectionReason)}
              disabled={acting || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {acting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
