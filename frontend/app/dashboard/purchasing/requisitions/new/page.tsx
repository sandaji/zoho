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
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { requisitionService } from "@/lib/requisition.service";
import { departmentService, type Department } from "@/lib/department.service";
import { toast } from "sonner";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  estimatedUnitCost: number;
}

export default function NewRequisitionPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projectCode, setProjectCode] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { id: "1", description: "", quantity: 1, estimatedUnitCost: 0 },
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
      { id: Math.random().toString(36).slice(2, 9), description: "", quantity: 1, estimatedUnitCost: 0 },
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

  const estimatedTotal = items.reduce((sum, i) => sum + i.quantity * i.estimatedUnitCost, 0);

  const validate = (): boolean => {
    if (!user?.branchId) {
      toast.error("Your account isn't assigned to a branch");
      return false;
    }
    if (items.some((i) => !i.description.trim() || i.quantity <= 0)) {
      toast.error("Every line needs a description and a quantity greater than zero");
      return false;
    }
    return true;
  };

  const handleSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    if (!validate()) return;
    try {
      setSubmitting(true);
      setSubmittingAs(status);
      await requisitionService.create({
        branchId: user!.branchId!,
        departmentId: departmentId || undefined,
        projectCode: projectCode || undefined,
        notes: notes || undefined,
        status,
        items: items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          estimatedUnitCost: i.estimatedUnitCost,
        })),
      });
      toast.success(
        status === "DRAFT" ? "Requisition saved as draft" : "Requisition submitted for approval",
      );
      router.push("/dashboard/purchasing/requisitions");
    } catch (error) {
      console.error("Failed to create requisition:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create requisition");
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
            <Link href="/dashboard/purchasing/requisitions">
              <Button variant="ghost" size="sm" className="hover:text-emerald-600">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">New Purchase Requisition</h1>
              <p className="text-slate-500">
                Describe what you need and roughly what it costs — procurement picks the vendor
                once this is approved.
              </p>
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
            <CardTitle className="text-lg">Requisition Details</CardTitle>
            <CardDescription>Cost center and project code drive who it routes to</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Department / Cost Center
                </label>
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
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Project Code</label>
                <Input
                  placeholder="Optional"
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <label className="block text-sm font-medium text-slate-700">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Why this is needed, any context for the approver..."
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
                <CardTitle className="text-lg">Line Items</CardTitle>
                <CardDescription>What you need, and a rough estimate of cost</CardDescription>
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
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-64">Description</TableHead>
                  <TableHead className="min-w-24 text-right">Quantity</TableHead>
                  <TableHead className="min-w-32 text-right">Est. Unit Cost</TableHead>
                  <TableHead className="min-w-28 text-right">Est. Total</TableHead>
                  <TableHead className="w-12 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Input
                        placeholder="e.g. 10x ergonomic office chairs"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(item.id, "quantity", parseInt(e.target.value) || 1)
                        }
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.estimatedUnitCost}
                        onChange={(e) =>
                          updateLineItem(
                            item.id,
                            "estimatedUnitCost",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">
                      KES {(item.quantity * item.estimatedUnitCost).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(item.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-slate-200 ml-auto max-w-sm">
          <CardContent className="pt-6 flex justify-between items-center text-lg font-bold text-slate-900">
            <span>Estimated Total:</span>
            <span className="text-emerald-600">
              KES {estimatedTotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
