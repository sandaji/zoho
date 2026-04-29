"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Users,
  Warehouse,
  MapPin,
  Pencil,
  Trash2,
  Phone,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  type BranchSummary,
} from "@/lib/api/branch-api";

// ─── Types ───────────────────────────────────────────────────────────────────

// Re-use the canonical type from branch-api — no local duplication
type Branch = BranchSummary;

interface BranchFormData {
  code: string;
  name: string;
  city: string;
  address: string;
  phone: string;
}

const EMPTY_FORM: BranchFormData = {
  code: "",
  name: "",
  city: "",
  address: "",
  phone: "",
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BranchesPage() {
  const { token } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState<BranchFormData>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Fetch ───────────────────────────────────────────────────────────────

  const fetchBranches = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await listBranches(token);
      setBranches(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load branches";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // ─── Create / Edit ──────────────────────────────────────────────────────

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditingBranch(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (branch: Branch) => {
    setDialogMode("edit");
    setEditingBranch(branch);
    setForm({
      code: branch.code,
      name: branch.name,
      city: branch.city,
      address: branch.address || "",
      phone: branch.phone || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.city.trim()) {
      toast.error("Code, Name, and City are required.");
      return;
    }
    if (!token) return;

    setIsSaving(true);
    try {
      if (dialogMode === "create") {
        await createBranch(token, {
          code:    form.code.trim(),
          name:    form.name.trim(),
          city:    form.city.trim(),
          address: form.address.trim() || undefined,
          phone:   form.phone.trim()   || undefined,
        });
        toast.success("Branch created successfully");
      } else if (editingBranch) {
        await updateBranch(token, editingBranch.id, {
          name:    form.name.trim(),
          city:    form.city.trim(),
          address: form.address.trim() || undefined,
          phone:   form.phone.trim()   || undefined,
        });
        toast.success("Branch updated successfully");
      }
      setDialogOpen(false);
      fetchBranches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────

  const openDeleteDialog = (branch: Branch) => {
    setDeletingBranch(branch);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingBranch || !token) return;
    setIsDeleting(true);
    try {
      await deleteBranch(token, deletingBranch.id);
      toast.success("Branch deleted successfully");
      setDeleteDialogOpen(false);
      fetchBranches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete branch");
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Toggle Active ──────────────────────────────────────────────────────

  const toggleActive = async (branch: Branch) => {
    if (!token) return;
    try {
      await updateBranch(token, branch.id, { isActive: !branch.isActive });
      toast.success(branch.isActive ? "Branch deactivated" : "Branch activated");
      fetchBranches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update branch status");
    }
  };

  // ─── Computed ───────────────────────────────────────────────────────────

  const filteredBranches = branches.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      b.city.toLowerCase().includes(q)
    );
  });

  const totalEmployees = branches.reduce((s, b) => s + b.employeeCount, 0);
  const totalWarehouses = branches.reduce((s, b) => s + b.warehouseCount, 0);
  const activeBranches = branches.filter((b) => b.isActive).length;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Branch Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your company locations and branch assignments
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={openCreateDialog}
            className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Branch
          </Button>
          <Button
            onClick={fetchBranches}
            disabled={isLoading}
            variant="outline"
            className="border-slate-300 dark:border-slate-600"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Building2 className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Total Branches
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {branches.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Active
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {activeBranches}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-violet-500/10">
                <Users className="h-6 w-6 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Total Employees
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {totalEmployees}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <Warehouse className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Total Warehouses
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {totalWarehouses}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              id="branch-search"
              placeholder="Search branches by name, code, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-slate-300 dark:border-slate-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && branches.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-slate-400" />
            <p className="text-slate-600 dark:text-slate-400">
              Loading branches...
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Branches Table */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Branches ({filteredBranches.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 dark:border-slate-700">
                      <TableHead className="text-slate-500 dark:text-slate-400 font-semibold">
                        Code
                      </TableHead>
                      <TableHead className="text-slate-500 dark:text-slate-400 font-semibold">
                        Name
                      </TableHead>
                      <TableHead className="text-slate-500 dark:text-slate-400 font-semibold">
                        City
                      </TableHead>
                      <TableHead className="text-slate-500 dark:text-slate-400 font-semibold">
                        Phone
                      </TableHead>
                      <TableHead className="text-slate-500 dark:text-slate-400 font-semibold text-center">
                        Employees
                      </TableHead>
                      <TableHead className="text-slate-500 dark:text-slate-400 font-semibold text-center">
                        Warehouses
                      </TableHead>
                      <TableHead className="text-slate-500 dark:text-slate-400 font-semibold text-center">
                        Status
                      </TableHead>
                      <TableHead className="text-slate-500 dark:text-slate-400 font-semibold text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBranches.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-12 text-slate-500 dark:text-slate-400"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Building2 className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                            <p className="font-medium">No branches found</p>
                            <p className="text-sm">
                              {search
                                ? "Try adjusting your search"
                                : "Get started by adding your first branch"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBranches.map((branch) => (
                        <TableRow
                          key={branch.id}
                          className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <TableCell className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {branch.code}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900 dark:text-white">
                            {branch.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                              <MapPin className="h-3.5 w-3.5" />
                              {branch.city}
                            </div>
                          </TableCell>
                          <TableCell>
                            {branch.phone ? (
                              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                <Phone className="h-3.5 w-3.5" />
                                {branch.phone}
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-sm">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="secondary"
                              className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                            >
                              <Users className="h-3 w-3 mr-1" />
                              {branch.employeeCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="secondary"
                              className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                            >
                              <Warehouse className="h-3 w-3 mr-1" />
                              {branch.warehouseCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <button
                              onClick={() => toggleActive(branch)}
                              title={
                                branch.isActive
                                  ? "Click to deactivate"
                                  : "Click to activate"
                              }
                            >
                              {branch.isActive ? (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 cursor-pointer border-0">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 cursor-pointer border-0">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Inactive
                                </Badge>
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400"
                                onClick={() => openEditDialog(branch)}
                                title="Edit branch"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                                onClick={() => openDeleteDialog(branch)}
                                title="Delete branch"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Create / Edit Dialog ────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              {dialogMode === "create" ? "Add New Branch" : "Edit Branch"}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              {dialogMode === "create"
                ? "Create a new branch location for your organization."
                : `Editing branch "${editingBranch?.name}".`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="branch-code"
                className="text-slate-700 dark:text-slate-300"
              >
                Branch Code *
              </Label>
              <Input
                id="branch-code"
                placeholder="e.g. NRB-001"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                disabled={dialogMode === "edit"}
                className="border-slate-300 dark:border-slate-600"
              />
              {dialogMode === "edit" && (
                <p className="text-xs text-slate-400">
                  Branch code cannot be changed after creation.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="branch-name"
                className="text-slate-700 dark:text-slate-300"
              >
                Branch Name *
              </Label>
              <Input
                id="branch-name"
                placeholder="e.g. Nairobi Main"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border-slate-300 dark:border-slate-600"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="branch-city"
                className="text-slate-700 dark:text-slate-300"
              >
                City *
              </Label>
              <Input
                id="branch-city"
                placeholder="e.g. Nairobi"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="border-slate-300 dark:border-slate-600"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="branch-address"
                className="text-slate-700 dark:text-slate-300"
              >
                Address
              </Label>
              <Input
                id="branch-address"
                placeholder="e.g. 123 Moi Avenue"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="border-slate-300 dark:border-slate-600"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="branch-phone"
                className="text-slate-700 dark:text-slate-300"
              >
                Phone
              </Label>
              <Input
                id="branch-phone"
                placeholder="e.g. +254 700 000 000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="border-slate-300 dark:border-slate-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-slate-300 dark:border-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : dialogMode === "create" ? (
                "Create Branch"
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ─────────────────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">
              Delete Branch
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {deletingBranch?.name}
              </span>
              ? This action cannot be undone. The branch must have no employees,
              warehouses, or sales records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-300 dark:border-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
