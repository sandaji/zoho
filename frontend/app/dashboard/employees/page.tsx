"use client";

import { useEffect, useMemo, useState } from "react";
import {
  employeeService,
  Employee,
  EmployeeFormData,
  EmployeeTransfer,
  Department,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTable, createColumnHelper, type SortingState } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { tableFeaturesConfig, type AppTableFeatures } from "@/lib/table/table-features";
import { toast } from "sonner";
import { Users, Plus, Trash2, Edit2, History, Settings } from "lucide-react";

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

const employeeColumnHelper = createColumnHelper<AppTableFeatures, Employee>();

// Branches and the row action handlers are all component state/closures, so
// this is rebuilt via useMemo in the component (mirrors inventory-table.tsx's
// buildColumns pattern) rather than living at module scope.
function buildEmployeeColumns(
  branches: Branch[],
  onEdit: (employee: Employee) => void,
  onDelete: (employee: Employee) => void,
  onHistory: (employee: Employee) => void
) {
  return employeeColumnHelper.columns([
    employeeColumnHelper.accessor((row) => row.employeeCode, {
      id: "employeeCode",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: (ctx) => (
        <span className="font-mono text-muted-foreground">{ctx.getValue() || "\u2014"}</span>
      ),
      sortFn: "text",
    }),
    employeeColumnHelper.accessor((row) => row.name, {
      id: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
      sortFn: "text",
    }),
    employeeColumnHelper.accessor((row) => row.email, {
      id: "email",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
      cell: (ctx) => <span className="text-muted-foreground">{ctx.getValue()}</span>,
      sortFn: "text",
    }),
    employeeColumnHelper.accessor((row) => row.department?.name, {
      id: "department",
      header: "Department",
      enableSorting: false,
      cell: (ctx) => <span>{ctx.getValue() || "-"}</span>,
    }),
    employeeColumnHelper.accessor((row) => row.role, {
      id: "role",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
      cell: (ctx) => {
        const roleLabel = ROLES.find((r) => r.value === ctx.getValue())?.label || ctx.getValue();
        return <Badge variant="secondary">{roleLabel}</Badge>;
      },
      sortFn: "text",
    }),
    employeeColumnHelper.accessor((row) => row.branchId, {
      id: "branch",
      header: "Branch",
      enableSorting: false,
      cell: (ctx) => {
        const branch = branches.find((b) => b.id === ctx.getValue());
        return <span>{branch ? branch.name : "-"}</span>;
      },
    }),
    employeeColumnHelper.accessor((row) => row.isActive, {
      id: "status",
      header: "Status",
      enableSorting: false,
      cell: (ctx) => (
        <Badge variant={ctx.getValue() ? "default" : "secondary"}>
          {ctx.getValue() ? "Active" : "Inactive"}
        </Badge>
      ),
    }),
    employeeColumnHelper.display({
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: (ctx) => {
        const employee = ctx.row.original;
        return (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(employee)}>
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(employee)}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onHistory(employee)} className="gap-1">
              <History className="w-4 h-4" />
              History
            </Button>
          </div>
        );
      },
    }),
  ]);
}

export default function EmployeeManagement() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showDepartmentsDialog, setShowDepartmentsDialog] = useState(false);
  const [newDepartment, setNewDepartment] = useState({ name: "", prefix: "" });
  const [isSavingDepartment, setIsSavingDepartment] = useState(false);
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
  const [employeeSorting, setEmployeeSorting] = useState<SortingState>([]);

  // Fetch data
  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empResult, branchResult, deptResult] = await Promise.all([
        employeeService.getAllEmployees(token!),
        branchService.getAllBranches(token!),
        employeeService.getAllDepartments(token!),
      ]);
      const branchesData = branchResult.data?.branches || branchResult.data || [];
      setEmployees(empResult.data || []);
      setBranches(Array.isArray(branchesData) ? branchesData : []);
      setDepartments(deptResult.data || []);
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
      departmentId: employee.departmentId || undefined,
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

      if (!isEditing && !formData.departmentId) {
        toast.error("Please select a department so an employee code can be generated");
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

  const handleCreateDepartment = async () => {
    if (!newDepartment.name || !newDepartment.prefix) {
      toast.error("Please provide a department name and a 2-letter prefix");
      return;
    }

    try {
      setIsSavingDepartment(true);
      await employeeService.createDepartment(token!, newDepartment);
      toast.success("Department created successfully");
      setNewDepartment({ name: "", prefix: "" });
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create department");
    } finally {
      setIsSavingDepartment(false);
    }
  };

  const handleToggleDepartmentActive = async (department: Department) => {
    try {
      await employeeService.updateDepartment(token!, department.id, {
        isActive: !department.isActive,
      });
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update department");
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

  const handleDeleteClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDeleteAlert(true);
  };

  // Real client-side pagination (like AdminTable): filteredEmployees is the
  // full, already search/role/branch-filtered set, and the table paginates
  // it locally via getRowModel() + initialState.pagination.
  const employeeColumns = useMemo(
    () => buildEmployeeColumns(branches, handleEdit, handleDeleteClick, handleShowHistory),
    [branches]
  );
  const employeeTable = useTable({
    features: tableFeaturesConfig,
    data: filteredEmployees,
    columns: employeeColumns,
    onSortingChange: setEmployeeSorting,
    state: { sorting: employeeSorting },
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  });

  if (loading) {
    return <div className="p-6 text-center">Loading employees...</div>;
  }

  return (
    <div className="min-h-screen bg-background space-y-6 mx-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">STAFF MODULE</h1>
            <p className="text-sm text-muted-foreground">Manage employees, roles, and transfers</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowDepartmentsDialog(true)} className="gap-2">
            <Settings className="w-4 h-4" />
            Departments
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            New Staff
          </Button>
        </div>
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
      {filteredEmployees.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No employees found. Create one to get started.</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                {employeeTable.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-muted hover:bg-muted">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="font-semibold">
                        {header.isPlaceholder ? null : <employeeTable.FlexRender header={header} />}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {employeeTable.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/50">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        <employeeTable.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DataTablePagination table={employeeTable} totalRows={filteredEmployees.length} />
        </>
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
              <label className="text-sm font-medium">
                Department {!isEditing && "*"}
              </label>
              <select
                value={formData.departmentId || ""}
                onChange={(e) =>
                  setFormData({ ...formData, departmentId: e.target.value || undefined })
                }
                disabled={isEditing && !!selectedEmployee?.employeeCode}
                className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              >
                <option value="">-- Select Department --</option>
                {departments.filter((d) => d.isActive).map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name} ({department.prefix}) — next: {department.nextCode}
                  </option>
                ))}
              </select>
              {isEditing && selectedEmployee?.employeeCode && (
                <p className="text-xs text-muted-foreground mt-1">
                  Code {selectedEmployee.employeeCode} already assigned — department can't be changed here.
                </p>
              )}
              {departments.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No departments yet — use "Departments" above to create one first.
                </p>
              )}
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

      {/* Departments Dialog */}
      <Dialog open={showDepartmentsDialog} onOpenChange={setShowDepartmentsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Departments</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Each department has its own 2-letter code prefix. New staff hired
              into a department get the next number in that department's own
              sequence, e.g. Junior Staff ("JS") → JS001, JS002...
            </p>

            <div className="border rounded-lg divide-y max-h-[260px] overflow-y-auto">
              {departments.length === 0 && (
                <p className="text-sm text-muted-foreground p-4">
                  No departments yet. Create one below.
                </p>
              )}
              {departments.map((department) => (
                <div key={department.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">
                      {department.name}{" "}
                      <span className="font-mono text-muted-foreground">({department.prefix})</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {department.employeeCount} staff · next: {department.nextCode}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={department.isActive ? "default" : "secondary"}>
                      {department.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleDepartmentActive(department)}
                    >
                      {department.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">New department</p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Junior Staff"
                  value={newDepartment.name}
                  onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                  className="flex-1"
                />
                <Input
                  placeholder="JS"
                  maxLength={2}
                  value={newDepartment.prefix}
                  onChange={(e) =>
                    setNewDepartment({ ...newDepartment, prefix: e.target.value.toUpperCase() })
                  }
                  className="w-20 uppercase"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Prefix must be exactly 2 letters and unique across departments (e.g. "JS", "SS", "SA").
              </p>
              <div className="flex justify-end">
                <Button onClick={handleCreateDepartment} disabled={isSavingDepartment}>
                  {isSavingDepartment ? "Creating..." : "Create Department"}
                </Button>
              </div>
            </div>
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
