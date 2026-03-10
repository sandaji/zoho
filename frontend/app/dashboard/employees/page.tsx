"use client";

import { useEffect, useState } from "react";
import {
  employeeService,
  Employee,
  EmployeeFormData,
  EmployeeTransfer,
} from "@/lib/employee.service";
import { branchService, Branch } from "@/lib/branch.service";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Users, Plus, Trash2, Edit2, History } from "lucide-react";

const ROLES = [
  { value: "cashier", label: "Cashier" },
  { value: "warehouse_staff", label: "Warehouse Staff" },
  { value: "driver", label: "Driver" },
  { value: "branch_manager", label: "Branch Manager" },
  { value: "hr", label: "HR" },
  { value: "accountant", label: "Accountant" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

export default function EmployeeManagement() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [transferHistory, setTransferHistory] = useState<EmployeeTransfer[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormData>({
    email: "",
    name: "",
    role: "cashier",
  });
  const [transferData, setTransferData] = useState({
    toBranchId: "",
    toRole: "cashier",
    effectiveDate: new Date().toISOString().split("T")[0],
    reason: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch data
  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empResult, branchResult] = await Promise.all([
        employeeService.getAllEmployees(token!),
        branchService.getAllBranches(token!),
      ]);
      const branchesData = branchResult.data?.branches || branchResult.data || [];
      setEmployees(empResult.data || []);
      setBranches(Array.isArray(branchesData) ? branchesData : []);
    } catch (error) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({ email: "", name: "", role: "cashier" });
    setSelectedEmployee(null);
    setIsEditing(false);
    setShowDialog(true);
  };

  const handleEdit = (employee: Employee) => {
    setFormData({
      email: employee.email,
      name: employee.name,
      phone: employee.phone,
      role: employee.role,
      branchId: employee.branchId,
    });
    setSelectedEmployee(employee);
    setIsEditing(true);
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.email || !formData.name) {
        toast.error("Please fill in required fields");
        return;
      }

      setIsSaving(true);

      if (isEditing && selectedEmployee) {
        await employeeService.updateEmployee(token!, selectedEmployee.id, formData);
        toast.success("Employee updated successfully");
      } else {
        await employeeService.createEmployee(token!, formData);
        toast.success("Employee created successfully");
      }

      setShowDialog(false);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save employee");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedEmployee || !transferData.toBranchId || !transferData.toRole) {
      toast.error("Please select branch and role");
      return;
    }

    try {
      setIsSaving(true);
      await employeeService.transferEmployee(token!, selectedEmployee.id, transferData);
      toast.success("Employee transferred successfully");
      setShowTransferDialog(false);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to transfer employee");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShowHistory = async (employee: Employee) => {
    try {
      setSelectedEmployee(employee);
      const result = await employeeService.getTransferHistory(token!, employee.id);
      setTransferHistory(result.data || []);
      setShowHistoryDialog(true);
    } catch (error: any) {
      toast.error("Failed to load transfer history");
    }
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;

    try {
      setIsSaving(true);
      await employeeService.deleteEmployee(token!, selectedEmployee.id);
      toast.success("Employee deleted successfully");
      setShowDeleteAlert(false);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete employee");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || emp.role === roleFilter;
    const matchesBranch = !branchFilter || emp.branchId === branchFilter;
    return matchesSearch && matchesRole && matchesBranch;
  });

  if (loading) {
    return <div className="p-6 text-center">Loading employees...</div>;
  }

  return (
    <div className="space-y-6 mx-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">STAFF MODULE</h1>
            <p className="text-sm text-muted-foreground">Manage employees, roles, and transfers</p>
          </div>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          New Staff
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px]"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="">All Roles</option>
          {ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="">All Branches</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      {/* Employees Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Role</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Branch</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((employee) => {
              const branch = branches.find((b) => b.id === employee.branchId);
              const roleLabel =
                ROLES.find((r) => r.value === employee.role)?.label || employee.role;
              return (
                <tr key={employee.id} className="border-t hover:bg-muted/50">
                  <td className="px-6 py-4 text-sm font-medium">{employee.name}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{employee.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <Badge variant="secondary">{roleLabel}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm">{branch ? branch.name : "-"}</td>
                  <td className="px-6 py-4 text-sm">
                    <Badge variant={employee.isActive ? "default" : "secondary"}>
                      {employee.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(employee)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {/* <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEmployee(employee);
                          setTransferData({
                            toBranchId: employee.branchId || "",
                            toRole: employee.role,
                            effectiveDate: new Date().toISOString().split("T")[0],
                            reason: "",
                          });
                          setShowTransferDialog(true);
                        }}
                        className="gap-1"
                      >
                        <ArrowRight className="w-4 h-4" />
                        Transfer8
                      </Button> */}

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedEmployee(employee);
                          setShowDeleteAlert(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShowHistory(employee)}
                        className="gap-1"
                      >
                        <History className="w-4 h-4" />
                        History
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No employees found. Create one to get started.</p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Employee" : "Create New Employee"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="employee@zoho.com"
                disabled={isEditing}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+254 20 1234567"
                className="mt-1"
              />
            </div>


            <div>
              <label className="text-sm font-medium">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Branch</label>
              <select
                value={formData.branchId || ""}
                onChange={(e) =>
                  setFormData({ ...formData, branchId: e.target.value || undefined })
                }
                className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              >
                <option value="">-- Select Branch --</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Employee</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted rounded">
              <p className="text-sm text-muted-foreground">Current Role</p>
              <p className="font-medium">
                {ROLES.find((r) => r.value === selectedEmployee?.role)?.label}
              </p>
              <p className="text-sm text-muted-foreground mt-2">Current Branch</p>
              <p className="font-medium">
                {branches.find((b) => b.id === selectedEmployee?.branchId)?.name || "-"}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Target Branch *</label>
              <select
                value={transferData.toBranchId}
                onChange={(e) => setTransferData({ ...transferData, toBranchId: e.target.value })}
                className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              >
                <option value="">-- Select Branch --</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Target Role *</label>
              <select
                value={transferData.toRole}
                onChange={(e) => setTransferData({ ...transferData, toRole: e.target.value })}
                className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Effective Date</label>
              <Input
                type="date"
                value={transferData.effectiveDate}
                onChange={(e) =>
                  setTransferData({
                    ...transferData,
                    effectiveDate: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Reason</label>
              <Input
                value={transferData.reason}
                onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                placeholder="e.g., Promotion, Restructuring"
                className="mt-1"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleTransfer} disabled={isSaving}>
                {isSaving ? "Processing..." : "Transfer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transfer History - {selectedEmployee?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {transferHistory.length > 0 ? (
              transferHistory.map((transfer) => (
                <div key={transfer.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">
                        {ROLES.find((r) => r.value === transfer.fromRole)?.label ||
                          transfer.fromRole}{" "}
                        → {ROLES.find((r) => r.value === transfer.toRole)?.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transfer.fromBranch?.name || "—"} → {transfer.toBranch?.name}
                      </p>
                    </div>
                    <Badge variant={transfer.approvedAt ? "default" : "secondary"}>
                      {transfer.approvedAt ? "Approved" : "Pending"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Date: {new Date(transfer.transferDate).toLocaleDateString()}
                  </p>
                  {transfer.reason && <p className="text-sm mt-2">Reason: {transfer.reason}</p>}
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No transfer history</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{selectedEmployee?.name}"? This action cannot be
            undone.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end pt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSaving}
            >
              {isSaving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
