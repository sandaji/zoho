"use client";

import { useEffect, useState } from "react";
import { AdminTable, Column } from "./AdminTable";
import {
  Warehouse,
  Branch,
  fetchWarehouses,
  fetchBranches,
  createWarehouse,
  updateWarehouse,
} from "@/lib/admin-api";
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

export default function WarehousesSection() {
  const { token } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Warehouse | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Warehouse> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateOpen, setCreateOpen] = useState(false);

  const loadWarehouses = () => {
    if (!token) return;
    setLoading(true);
    fetchWarehouses(token)
      .then(setWarehouses)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadWarehouses();
    // Branches are needed for the "Create Warehouse" branch picker.
    if (token) fetchBranches(token).then(setBranches).catch(console.error);
  }, [token]);

  const handleEdit = () => {
    if (selected) {
      setEditData({ ...selected });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!editData || !token || !editData.id) return;
    setIsSaving(true);
    try {
      const updated = await updateWarehouse(token, editData.id, {
        name: editData.name,
        location: editData.location,
        capacity: editData.capacity,
        isActive: editData.isActive,
      });
      setWarehouses(warehouses.map((w) => (w.id === updated.id ? updated : w)));
      setSelected(updated);
      setIsEditing(false);
      setEditData(null);
      toast.success("Warehouse updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update warehouse");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(null);
  };

  const columns: Column<Warehouse>[] = [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "location", label: "Location" },
    {
      key: "branch.name",
      label: "Branch",
      render: (branchName) => (branchName as string) || "-",
    },
    {
      key: "capacity",
      label: "Capacity",
      render: (capacity) => (capacity as number).toLocaleString(),
    },
    {
      key: "_count.inventory",
      label: "Inventory Count",
      render: (inventory) => String(inventory || 0),
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
        title="Warehouses"
        data={warehouses}
        columns={columns}
        loading={loading}
        searchKeys={["name", "code", "location", "branch.name"]}
        headerActions={<Button onClick={() => setCreateOpen(true)}>Create Warehouse</Button>}
        actions={(warehouse) => (
          <Button variant="outline" size="sm" onClick={() => setSelected(warehouse)}>
            View Details
          </Button>
        )}
      />

      <Dialog
        open={!!selected}
        onOpenChange={() => {
          setSelected(null);
          setIsEditing(false);
          setEditData(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center justify-between w-full pr-6">
              <DialogTitle>{isEditing ? "Edit Warehouse" : "Warehouse Details"}</DialogTitle>
              {!isEditing && (
                <Button size="sm" onClick={handleEdit} className="ml-auto">
                  Edit
                </Button>
              )}
            </div>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Code</p>
                  <p className="text-sm">{selected.code}</p>
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
                    <p className="text-sm">{selected.name}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Location</p>
                  {isEditing ? (
                    <Input
                      value={editData?.location || ""}
                      onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm">{selected.location}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Branch</p>
                  {/* Branch isn't editable here — moving a warehouse between branches has
                      knock-on effects on inventory/document sequencing that are out of
                      scope for a simple field edit. */}
                  <p className="text-sm">{selected.branch?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Capacity</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editData?.capacity ?? ""}
                      onChange={(e) =>
                        setEditData({ ...editData, capacity: parseInt(e.target.value) || 0 })
                      }
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold">{selected.capacity.toLocaleString()} units</p>
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
                    <Badge variant={selected.isActive ? "default" : "secondary"}>
                      {selected.isActive ? "Active" : "Inactive"}
                    </Badge>
                  )}
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

      <CreateWarehouseDialog
        isOpen={isCreateOpen}
        branches={branches}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setCreateOpen(false);
          loadWarehouses();
        }}
      />
    </>
  );
}

function CreateWarehouseDialog({
  isOpen,
  branches,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  branches: Branch[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { token } = useAuth();
  const [form, setForm] = useState({
    code: "",
    name: "",
    location: "",
    capacity: "",
    branchId: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!token || !form.code || !form.name || !form.location || !form.capacity || !form.branchId) {
      toast.error("Code, name, location, capacity and branch are all required.");
      return;
    }
    setSubmitting(true);
    try {
      await createWarehouse(token, {
        code: form.code,
        name: form.name,
        location: form.location,
        capacity: parseInt(form.capacity, 10),
        branchId: form.branchId,
      });
      toast.success("Warehouse created");
      setForm({ code: "", name: "", location: "", capacity: "", branchId: "" });
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create warehouse");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Warehouse</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Branch</Label>
            <select
              value={form.branchId}
              onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
              className="w-full px-3 py-2 border border-input rounded-md text-sm"
            >
              <option value="">Select a branch...</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Code</Label>
            <Input
              placeholder="e.g. WH-NBO-01"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="e.g. Nairobi Main Warehouse"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Capacity (units)</Label>
            <Input
              type="number"
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating..." : "Create Warehouse"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
