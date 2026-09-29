"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Clock,
  CreditCard,
} from "lucide-react";
import { useTable, createColumnHelper, type SortingState } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { tableFeaturesConfig, type AppTableFeatures } from "@/lib/table/table-features";
import { cn } from "@/lib/utils";

interface Vendor {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  website?: string;
  paymentTerms: string;
  leadTimeDays: number;
  isActive: boolean;
  currentBalance?: number;
  createdAt: string;
  updatedAt?: string;
}

export default function CrmVendorsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);

  // Vendor Details Drawer/Dialog state
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [vendorDetails, setVendorDetails] = useState<Vendor | null>(null);

  // Create Form state
  const [createFormData, setCreateFormData] = useState({
    code: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    taxId: "",
    website: "",
    paymentTerms: "NET_30",
    leadTimeDays: "7",
  });

  // Edit Form state
  const [editFormData, setEditFormData] = useState({
    id: "",
    code: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    taxId: "",
    website: "",
    paymentTerms: "NET_30",
    leadTimeDays: "7",
  });

  const getEffectiveToken = useCallback(() => {
    return token || (typeof window !== "undefined" ? localStorage.getItem("auth_token") : null);
  }, [token]);

  // Fetch vendors from backend API
  const fetchVendors = useCallback(async () => {
    const authToken = getEffectiveToken();
    if (!authToken) return;

    try {
      setIsLoading(true);
      const url = searchTerm.trim()
        ? `${API_BASE_URL}/v1/purchasing/vendors?search=${encodeURIComponent(searchTerm.trim())}`
        : `${API_BASE_URL}/v1/purchasing/vendors`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || errJson.message || "Failed to fetch vendors");
      }

      const resData = await response.json();
      // Handle both formats: { success: true, data: { vendors: [...], total: n } } and { data: [...] }
      const vendorList: Vendor[] = Array.isArray(resData?.data?.vendors)
        ? resData.data.vendors
        : Array.isArray(resData?.data)
        ? resData.data
        : [];

      setVendors(vendorList);
    } catch (error) {
      showToast(
        "Error",
        error instanceof Error ? error.message : "Failed to load vendors",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  }, [getEffectiveToken, searchTerm, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendors();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchVendors]);

  // Create vendor handler
  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    const authToken = getEffectiveToken();

    if (!authToken) {
      showToast("Error", "Not authenticated", "error");
      return;
    }

    try {
      setIsCreating(true);

      const response = await fetch(`${API_BASE_URL}/v1/purchasing/vendors`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...createFormData,
          leadTimeDays: parseInt(createFormData.leadTimeDays, 10) || 7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || errorData.message || errorData.error || "Failed to create vendor"
        );
      }

      showToast("Success", "Vendor created successfully", "success");

      setCreateFormData({
        code: "",
        name: "",
        email: "",
        phone: "",
        address: "",
        taxId: "",
        website: "",
        paymentTerms: "NET_30",
        leadTimeDays: "7",
      });

      setOpenCreateDialog(false);
      await fetchVendors();
    } catch (error) {
      showToast(
        "Error",
        error instanceof Error ? error.message : "Failed to create vendor",
        "error"
      );
    } finally {
      setIsCreating(false);
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (vendor: Vendor) => {
    setEditFormData({
      id: vendor.id,
      code: vendor.code,
      name: vendor.name,
      email: vendor.email || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
      taxId: vendor.taxId || "",
      website: vendor.website || "",
      paymentTerms: vendor.paymentTerms || "NET_30",
      leadTimeDays: String(vendor.leadTimeDays ?? 7),
    });
    setOpenEditDialog(true);
  };

  // Save Edit vendor handler
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const authToken = getEffectiveToken();

    if (!authToken || !editFormData.id) {
      showToast("Error", "Not authenticated or missing vendor ID", "error");
      return;
    }

    try {
      setIsSavingEdit(true);

      const response = await fetch(`${API_BASE_URL}/v1/purchasing/vendors/${editFormData.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editFormData.name,
          email: editFormData.email || undefined,
          phone: editFormData.phone || undefined,
          address: editFormData.address || undefined,
          taxId: editFormData.taxId || undefined,
          website: editFormData.website || undefined,
          paymentTerms: editFormData.paymentTerms,
          leadTimeDays: parseInt(editFormData.leadTimeDays, 10) || 7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || errorData.message || errorData.error || "Failed to update vendor"
        );
      }

      showToast("Success", "Vendor updated successfully", "success");
      setOpenEditDialog(false);
      await fetchVendors();
    } catch (error) {
      showToast(
        "Error",
        error instanceof Error ? error.message : "Failed to update vendor",
        "error"
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Deactivate vendor handler
  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate vendor "${name}"?`)) return;

    const authToken = getEffectiveToken();
    if (!authToken) {
      showToast("Error", "Not authenticated", "error");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/v1/purchasing/vendors/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.ok) {
        showToast("Success", `Vendor "${name}" deactivated successfully`, "success");
        fetchVendors();
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(
          "Error",
          errorData.error?.message || errorData.message || "Failed to deactivate vendor",
          "error"
        );
      }
    } catch (error) {
      showToast("Error", "An error occurred while deactivating vendor", "error");
    }
  };

  // Open Details Modal/Drawer
  const handleOpenDetails = (id: string) => {
    setSelectedVendorId(id);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedVendorId(null);
    setVendorDetails(null);
  };

  useEffect(() => {
    const fetchDetails = async () => {
      const authToken = getEffectiveToken();
      if (!authToken || !selectedVendorId || !detailsOpen) return;

      try {
        setDetailsLoading(true);
        const res = await fetch(`${API_BASE_URL}/v1/purchasing/vendors/${selectedVendorId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        if (!res.ok) throw new Error("Failed to load vendor details");
        const resJson = await res.json();
        setVendorDetails(resJson.data || resJson);
      } catch (err) {
        showToast("Error", err instanceof Error ? err.message : "Failed to load vendor details", "error");
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchDetails();
  }, [detailsOpen, selectedVendorId, getEffectiveToken, showToast]);

  const columnHelper = useMemo(() => createColumnHelper<AppTableFeatures, Vendor>(), []);
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor((row) => row.code, {
          id: "code",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
          cell: (ctx) => (
            <span className="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-1 rounded">
              {ctx.getValue()}
            </span>
          ),
          sortFn: "text",
        }),
        columnHelper.accessor((row) => row.name, {
          id: "name",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Vendor Name" />,
          cell: (ctx) => (
            <div>
              <div className="font-medium text-foreground">{ctx.getValue()}</div>
              {ctx.row.original.email && (
                <div className="text-xs text-muted-foreground">{ctx.row.original.email}</div>
              )}
            </div>
          ),
          sortFn: "text",
        }),
        columnHelper.accessor((row) => row.phone || "-", {
          id: "phone",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Phone" />,
          cell: (ctx) => <span className="text-muted-foreground">{ctx.getValue()}</span>,
          sortFn: "text",
        }),
        columnHelper.accessor((row) => row.paymentTerms, {
          id: "paymentTerms",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Payment Terms" />,
          cell: (ctx) => (
            <Badge variant="outline" className="font-semibold text-[11px] uppercase">
              {ctx.getValue() ? ctx.getValue().replace(/_/g, " ") : "N/A"}
            </Badge>
          ),
          sortFn: "text",
        }),
        columnHelper.accessor((row) => row.leadTimeDays, {
          id: "leadTimeDays",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Lead Time" className="w-full justify-center" />
          ),
          cell: (ctx) => (
            <div className="text-center">
              <span className="inline-block bg-muted text-foreground px-2.5 py-0.5 rounded text-xs font-semibold">
                {ctx.getValue() ?? 7} days
              </span>
            </div>
          ),
          sortFn: "alphanumeric",
        }),
        columnHelper.accessor((row) => row.isActive, {
          id: "isActive",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: (ctx) => {
            const isActive = ctx.getValue();
            return (
              <Badge
                variant={isActive ? "default" : "secondary"}
                className={
                  isActive
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground"
                }
              >
                {isActive ? "Active" : "Inactive"}
              </Badge>
            );
          },
          sortFn: "alphanumeric",
        }),
        columnHelper.display({
          id: "actions",
          header: () => <div className="text-right">Actions</div>,
          enableSorting: false,
          cell: (ctx) => {
            const vendor = ctx.row.original;
            return (
              <div className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => handleOpenDetails(vendor.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => handleOpenEdit(vendor)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    {vendor.isActive && (
                      <DropdownMenuItem
                        className="cursor-pointer text-destructive focus:text-destructive"
                        onClick={() => handleDeactivate(vendor.id, vendor.name)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Deactivate
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          },
        }),
      ]),
    [columnHelper]
  );

  const table = useTable({
    features: tableFeaturesConfig,
    data: vendors,
    columns,
    onSortingChange: setSorting,
    state: { sorting },
  });

  const rows = table.getPrePaginatedRowModel().rows;

  return (
    <div className="space-y-6">
      {/* ── Header with Add Button ────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Vendors</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage suppliers, payment terms, and lead times
          </p>
        </div>

        <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              New Vendor
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Vendor</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateVendor} className="space-y-4">
              {/* Vendor Code */}
              <div>
                <Label htmlFor="code" className="text-sm font-medium">
                  Vendor Code *
                </Label>
                <Input
                  id="code"
                  placeholder="e.g., VEN-001"
                  value={createFormData.code}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, code: e.target.value })
                  }
                  required
                  className="mt-1"
                />
              </div>

              {/* Vendor Name */}
              <div>
                <Label htmlFor="name" className="text-sm font-medium">
                  Vendor Name *
                </Label>
                <Input
                  id="name"
                  placeholder="Enter vendor name"
                  value={createFormData.name}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, name: e.target.value })
                  }
                  required
                  className="mt-1"
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@vendor.com"
                  value={createFormData.email}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, email: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone
                </Label>
                <Input
                  id="phone"
                  placeholder="+254 711 611 971"
                  value={createFormData.phone}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, phone: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="address" className="text-sm font-medium">
                  Address
                </Label>
                <Input
                  id="address"
                  placeholder="Street address, city"
                  value={createFormData.address}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, address: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              {/* Tax ID */}
              <div>
                <Label htmlFor="taxId" className="text-sm font-medium">
                  Tax ID (KRA PIN)
                </Label>
                <Input
                  id="taxId"
                  placeholder="A001234567B"
                  value={createFormData.taxId}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, taxId: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              {/* Website */}
              <div>
                <Label htmlFor="website" className="text-sm font-medium">
                  Website
                </Label>
                <Input
                  id="website"
                  placeholder="https://vendor.com"
                  value={createFormData.website}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, website: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              {/* Payment Terms */}
              <div>
                <Label htmlFor="paymentTerms" className="text-sm font-medium">
                  Payment Terms
                </Label>
                <select
                  id="paymentTerms"
                  value={createFormData.paymentTerms}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, paymentTerms: e.target.value })
                  }
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="CASH_ON_DELIVERY">Cash on Delivery</option>
                  <option value="PREPAID">Prepaid</option>
                  <option value="NET_7">Net 7</option>
                  <option value="NET_15">Net 15</option>
                  <option value="NET_30">Net 30</option>
                  <option value="NET_60">Net 60</option>
                  <option value="NET_90">Net 90</option>
                </select>
              </div>

              {/* Lead Time Days */}
              <div>
                <Label htmlFor="leadTimeDays" className="text-sm font-medium">
                  Lead Time (Days)
                </Label>
                <Input
                  id="leadTimeDays"
                  type="number"
                  placeholder="7"
                  value={createFormData.leadTimeDays}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, leadTimeDays: e.target.value })
                  }
                  className="mt-1"
                  min="1"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Vendor"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Search Bar ────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, code, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* ── Data Table ────────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : vendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground font-medium">No vendors found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm ? "Try adjusting your search" : "Add your first vendor"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b border-border bg-muted">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "font-semibold text-foreground",
                        header.column.id === "leadTimeDays" && "text-center",
                        header.column.id === "actions" && "text-right"
                      )}
                    >
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Edit Vendor Dialog ────────────────────────────────────────────── */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <Label htmlFor="edit-code" className="text-sm font-medium">
                Vendor Code
              </Label>
              <Input
                id="edit-code"
                value={editFormData.code}
                disabled
                className="mt-1 bg-muted font-mono"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Vendor code cannot be changed.</p>
            </div>

            <div>
              <Label htmlFor="edit-name" className="text-sm font-medium">
                Vendor Name *
              </Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, email: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-phone" className="text-sm font-medium">
                Phone
              </Label>
              <Input
                id="edit-phone"
                value={editFormData.phone}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, phone: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-address" className="text-sm font-medium">
                Address
              </Label>
              <Textarea
                id="edit-address"
                value={editFormData.address}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, address: e.target.value })
                }
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-taxId" className="text-sm font-medium">
                Tax ID (KRA PIN)
              </Label>
              <Input
                id="edit-taxId"
                value={editFormData.taxId}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, taxId: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-website" className="text-sm font-medium">
                Website
              </Label>
              <Input
                id="edit-website"
                value={editFormData.website}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, website: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-paymentTerms" className="text-sm font-medium">
                Payment Terms
              </Label>
              <select
                id="edit-paymentTerms"
                value={editFormData.paymentTerms}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, paymentTerms: e.target.value })
                }
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="CASH_ON_DELIVERY">Cash on Delivery</option>
                <option value="PREPAID">Prepaid</option>
                <option value="NET_7">Net 7</option>
                <option value="NET_15">Net 15</option>
                <option value="NET_30">Net 30</option>
                <option value="NET_60">Net 60</option>
                <option value="NET_90">Net 90</option>
              </select>
            </div>

            <div>
              <Label htmlFor="edit-leadTimeDays" className="text-sm font-medium">
                Lead Time (Days)
              </Label>
              <Input
                id="edit-leadTimeDays"
                type="number"
                value={editFormData.leadTimeDays}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, leadTimeDays: e.target.value })
                }
                className="mt-1"
                min="1"
              />
            </div>

            <div className="flex gap-3 pt-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenEditDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingEdit}>
                {isSavingEdit ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Vendor Details Drawer / Modal ─────────────────────────────────── */}
      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseDetails();
          else setDetailsOpen(true);
        }}
      >
        <DialogContent className="fixed top-0 right-0 left-auto translate-x-0 translate-y-0 h-full max-w-md w-full rounded-none p-6 overflow-auto">
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : vendorDetails ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-foreground">{vendorDetails.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {vendorDetails.code}
                  </span>
                  <Badge
                    variant={vendorDetails.isActive ? "default" : "secondary"}
                    className={
                      vendorDetails.isActive
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {vendorDetails.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Payment Terms</span>
                  </div>
                  <p className="text-sm font-semibold">
                    {vendorDetails.paymentTerms ? vendorDetails.paymentTerms.replace(/_/g, " ") : "N/A"}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Lead Time</span>
                  </div>
                  <p className="text-sm font-semibold">{vendorDetails.leadTimeDays ?? 7} days</p>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Contact Information
                </h4>

                <div className="flex items-start gap-2.5 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-foreground">{vendorDetails.email || "—"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-foreground">{vendorDetails.phone || "—"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-foreground">{vendorDetails.address || "—"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tax ID / PIN</p>
                    <p className="text-foreground">{vendorDetails.taxId || "—"}</p>
                  </div>
                </div>

                {vendorDetails.website && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Website</p>
                      <a
                        href={
                          vendorDetails.website.startsWith("http")
                            ? vendorDetails.website
                            : `https://${vendorDetails.website}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        {vendorDetails.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleCloseDetails}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    handleCloseDetails();
                    handleOpenEdit(vendorDetails);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Vendor
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No details available</div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Footer Stats ────────────────────────────────────────────────────── */}
      {vendors.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Vendors</p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {vendors.length}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Avg. Lead Time</p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {(
                vendors.reduce((sum, v) => sum + (v.leadTimeDays || 0), 0) /
                vendors.length
              ).toFixed(1)}{" "}
              days
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Active Vendors</p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {vendors.filter((v) => v.isActive).length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
