"use client";

import { useEffect, useState } from "react";
import { AdminTable, Column } from "./AdminTable";
import { Branch, fetchBranches, createBranch, updateBranch } from "@/lib/admin-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";

export default function BranchesSection() {
  const { token } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Branch> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateOpen, setCreateOpen] = useState(false);

  const loadBranches = () => {
    if (!token) return;
    setLoading(true);
    const promise = fetchBranches(token);

    promise
      .then(setBranches)
      .catch(() => {
        // Errors are handled by the toast
      })
      .finally(() => setLoading(false));

    toast.promise(promise, {
      loading: "Loading branches...",
      success: "Branches loaded successfully",
      error: "Failed to load branches",
    });
  };

  useEffect(() => {
    loadBranches();
  }, [token]);

  const handleEdit = () => {
    if (selectedBranch) {
      setEditData({ ...selectedBranch });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!editData || !token || !editData.id) return;
    setIsSaving(true);
    try {
      const updated = await updateBranch(token, editData.id, {
        name: editData.name,
        city: editData.city,
        address: editData.address ?? undefined,
        phone: editData.phone ?? undefined,
        isActive: editData.isActive,
      });
      setBranches(branches.map((b) => (b.id === updated.id ? updated : b)));
      setSelectedBranch(updated);
      setIsEditing(false);
      setEditData(null);
      toast.success("Branch updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update branch");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(null);
  };

  const columns: Column<Branch>[] = [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "city", label: "City" },
    {
      key: "phone",
      label: "Phone",
      render: (phone) => <>{phone || "-"}</>,
    },
    {
      key: "isActive",
      label: "Status",
      render: (isActive) => (
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <AdminTable
        title="Branches"
        data={branches}
        columns={columns}
        loading={loading}
        searchKeys={["name", "code", "city"]}
        headerActions={<Button onClick={() => setCreateOpen(true)}>Create Branch</Button>}
        actions={(branch) => (
            <Button variant="outline" size="sm" onClick={() => setSelectedBranch(branch)}>
                View Details
            </Button>
        )}
      />

      <Dialog
        open={!!selectedBranch}
        onOpenChange={() => {
          setSelectedBranch(null);
          setIsEditing(false);
          setEditData(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center justify-between w-full pr-6">
              <DialogTitle>{isEditing ? "Edit Branch" : "Branch Details"}</DialogTitle>
              {!isEditing && (
                <Button size="sm" onClick={handleEdit} className="ml-auto">
                  Edit
                </Button>
              )}
            </div>
          </DialogHeader>
          {selectedBranch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Code</p>
                  {/* Code isn't editable — it's used as the branch's document-sequence key elsewhere in the app. */}
                  <p className="text-sm">{selectedBranch.code}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  {isEditing ? (
                    <Input
                      value={editData?.name || ""}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm">{selectedBranch.name}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">City</p>
                  {isEditing ? (
                    <Input
                      value={editData?.city || ""}
                      onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm">{selectedBranch.city}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  {isEditing ? (
                    <Input
                      value={editData?.phone || ""}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm">{selectedBranch.phone || "-"}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Address</p>
                  {isEditing ? (
                    <Input
                      value={editData?.address || ""}
                      onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm">{selectedBranch.address || "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  {isEditing ? (
                    <select
                      value={editData?.isActive ? "active" : "inactive"}
                      onChange={(e) =>
                        setEditData({ ...editData, isActive: e.target.value === "active" })
                      }
                      className="mt-1 w-full px-3 py-2 border border-input rounded-md text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  ) : (
                    <Badge variant={selectedBranch.isActive ? "default" : "secondary"}>
                      {selectedBranch.isActive ? "Active" : "Inactive"}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-sm">
                    {new Date(selectedBranch.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {isEditing && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CreateBranchDialog
        isOpen={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setCreateOpen(false);
          loadBranches();
        }}
      />
    </>
  );
}

function CreateBranchDialog({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { token } = useAuth();
  const [form, setForm] = useState({ code: "", name: "", city: "", address: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!token || !form.code || !form.name || !form.city) {
      toast.error("Code, name and city are required.");
      return;
    }
    setSubmitting(true);
    try {
      await createBranch(token, form);
      toast.success("Branch created");
      setForm({ code: "", name: "", city: "", address: "", phone: "" });
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create branch");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Branch</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Code</Label>
            <Input
              placeholder="e.g. NBO"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            />
            <p className="text-[10px] text-slate-500 italic">
              Must be unique — used as this branch's document-sequence key.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="e.g. Nairobi CBD"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input
              placeholder="e.g. Nairobi"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating..." : "Create Branch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
