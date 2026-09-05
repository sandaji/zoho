"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ArrowLeft, Plus, Trash2, Loader2, Paperclip } from "lucide-react";
import { expenseReportService } from "@/lib/expense-report.service";
import { departmentService, type Department } from "@/lib/department.service";
import { toast } from "sonner";

interface LineItem {
  id: string;
  expenseDate: string;
  vendor: string;
  category: string;
  amount: number;
  description: string;
  receiptUrl: string;
}

const CATEGORIES = [
  "Travel",
  "Meals & Entertainment",
  "Office Supplies",
  "Software & Subscriptions",
  "Professional Services",
  "Utilities",
  "Other",
];

const today = () => new Date().toISOString().slice(0, 10);

export default function NewExpenseReportPage() {
  const router = useRouter();

  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    {
      id: "1",
      expenseDate: today(),
      vendor: "",
      category: "",
      amount: 0,
      description: "",
      receiptUrl: "",
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [submittingAs, setSubmittingAs] = useState<"DRAFT" | "SUBMITTED" | null>(null);

  useEffect(() => {
    departmentService
      .list()
      .then(setDepartments)
      .catch((error) => console.error("Failed to fetch departments:", error));
  }, []);

  const addLineItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).slice(2, 9),
        expenseDate: today(),
        vendor: "",
        category: "",
        amount: 0,
        description: "",
        receiptUrl: "",
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (items.length === 1) {
      toast.error("You must have at least one line item");
      return;
    }
    setItems(items.filter((item) => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

  const validate = (): boolean => {
    if (items.some((i) => !i.vendor.trim() || !i.category || i.amount <= 0)) {
      toast.error("Every line needs a vendor, a category, and an amount greater than zero");
      return false;
    }
    return true;
  };

  const handleSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    if (!validate()) return;
    try {
      setSubmitting(true);
      setSubmittingAs(status);
      await expenseReportService.create({
        departmentId: departmentId || undefined,
        notes: notes || undefined,
        status,
        items: items.map((i) => ({
          expenseDate: i.expenseDate,
          vendor: i.vendor,
          category: i.category,
          amount: i.amount,
          description: i.description || undefined,
          receiptUrl: i.receiptUrl || undefined,
        })),
      });
      toast.success(
        status === "DRAFT" ? "Expense report saved as draft" : "Expense report submitted for approval",
      );
      router.push("/dashboard/finance/expenses");
    } catch (error) {
      console.error("Failed to create expense report:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create expense report");
    } finally {
      setSubmitting(false);
      setSubmittingAs(null);
    }
  };

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
              <h1 className="text-2xl font-bold text-slate-900">Submit Expense Report</h1>
              <p className="text-slate-500">One line per receipt — date, vendor, category, amount</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handleSubmit("DRAFT")}
              disabled={submitting}
              className="text-slate-700"
            >
              {submitting && submittingAs === "DRAFT" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSubmit("SUBMITTED")}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting && submittingAs === "SUBMITTED" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Submit for Approval
            </Button>
          </div>
        </div>

        <Card className="border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Report Details</CardTitle>
            <CardDescription>Which department this should be charged to</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Department / Cost Center</label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <label className="block text-sm font-medium text-slate-700">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any context for the approver..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Expense Items</CardTitle>
                <CardDescription>
                  Receipt URL is a link to wherever you've uploaded the receipt image/PDF
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={addLineItem}
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">Date</label>
                    <Input
                      type="date"
                      value={item.expenseDate}
                      onChange={(e) => updateLineItem(item.id, "expenseDate", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">Vendor</label>
                    <Input
                      placeholder="e.g. Uber, Java House"
                      value={item.vendor}
                      onChange={(e) => updateLineItem(item.id, "vendor", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">Category</label>
                    <Select
                      value={item.category}
                      onValueChange={(v) => updateLineItem(item.id, "category", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">Amount (KES)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.amount}
                      onChange={(e) => updateLineItem(item.id, "amount", parseFloat(e.target.value) || 0)}
                      className="text-right"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(item.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">Description (optional)</label>
                    <Input
                      placeholder="What was this for?"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <Paperclip className="h-3 w-3" /> Receipt URL (optional)
                    </label>
                    <Input
                      placeholder="Link to the uploaded receipt"
                      value={item.receiptUrl}
                      onChange={(e) => updateLineItem(item.id, "receiptUrl", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 ml-auto max-w-sm">
          <CardContent className="pt-6 flex justify-between items-center text-lg font-bold text-slate-900">
            <span>Total:</span>
            <span className="text-emerald-600">
              KES {totalAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
