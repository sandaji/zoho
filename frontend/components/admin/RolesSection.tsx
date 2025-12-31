"use client";

import { useEffect, useState } from "react";
import { AdminTable, Column } from "./AdminTable";
import { Role, fetchRoles, deleteRole, createRole } from "@/lib/rbac-api";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast-context";
import { RolePermissionsDialog } from "./RolePermissionsDialog";
import { Plus, Shield, Trash2, Key } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Extend the Role type to include the _count property if it's not already defined in rbac-api.ts
interface RoleWithCount extends Role {
  isSystem?: boolean;
  _count?: {
    permissions: number;
    users: number;
  };
}

export default function RolesSection() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [roles, setRoles] = useState<RoleWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<RoleWithCount | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", code: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRoles = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await fetchRoles(token) as RoleWithCount[];
      setRoles(data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load roles";
      toast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadRoles();
    }
  }, [token]);

  const handleDeleteRole = async (id: string) => {
    if (!token || !confirm("Are you sure you want to delete this role?")) return;
    try {
      await deleteRole(token, id);
      toast("Role deleted successfully", "success");
      loadRoles();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete role";
      toast(errorMessage, "error");
    }
  };

  const handleCreateRole = async () => {
    if (!token || !newRole.name || !newRole.code) return;
    try {
      setIsSubmitting(true);
      await createRole(token, newRole);
      toast("Role created successfully", "success");
      setIsCreateDialogOpen(false);
      setNewRole({ name: "", code: "", description: "" });
      loadRoles();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create role";
      toast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<RoleWithCount>[] = [
    {
      key: "name",
      label: "Role Name",
      render: (name: string, role: RoleWithCount) => (
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-400" />
          <span className="font-medium text-slate-900">{name}</span>
          {role.isSystem && (
            <Badge variant="secondary" className="text-[10px] py-0 h-4">System</Badge>
          )}
        </div>
      ),
    },
    {
      key: "code",
      label: "Code",
      render: (code: string) => <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{code}</code>,
    },
    {
      key: "_count",
      label: "Permissions",
      render: (count: { permissions: number; users: number } | undefined) => (
        <Badge variant="outline" className="font-mono">
          {count?.permissions || 0} Permissions
        </Badge>
      ),
    },
    {
      key: "_count",
      label: "Users",
      render: (count: { permissions: number; users: number } | undefined) => (
        <span className="text-sm text-slate-600">
          {count?.users || 0} Users
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Access Roles</h2>
          <p className="text-sm text-slate-500 mt-1">Manage system roles and their assigned permissions</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Role
        </Button>
      </div>

      <AdminTable
        title="Access Roles"
        data={roles}
        columns={columns}
        loading={loading}
        searchKeys={["name", "code", "description"]}
        actions={(role: RoleWithCount) => (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setSelectedRole(role)}
            >
              <Key className="w-3.5 h-3.5" />
              Permissions
            </Button>
            {!role.isSystem && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => handleDeleteRole(role.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      />

      {/* Permissions Management Dialog */}
      <RolePermissionsDialog
        role={selectedRole}
        open={!!selectedRole}
        onOpenChange={(open: boolean) => !open && setSelectedRole(null)}
        onUpdated={loadRoles}
      />

      {/* Create Role Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>Define a new role and its unique identifier code.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                placeholder="e.g. Sales Representative"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-code">Role Code</Label>
              <Input
                id="role-code"
                placeholder="e.g. sales_rep"
                value={newRole.code}
                onChange={(e) => setNewRole({ ...newRole, code: e.target.value })}
              />
              <p className="text-[10px] text-slate-500 italic">This is used internally by the system</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-desc">Description</Label>
              <Input
                id="role-desc"
                placeholder="Brief description of the role's purpose"
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateRole} disabled={isSubmitting || !newRole.name || !newRole.code}>
              {isSubmitting ? "Creating..." : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
