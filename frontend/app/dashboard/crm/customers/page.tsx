"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Search, Loader2, AlertCircle, Settings } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTable, createColumnHelper, type SortingState } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { tableFeaturesConfig, type AppTableFeatures } from "@/lib/table/table-features";

interface Customer {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  customerType: string;
  creditLimit: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
}

export default function CustomersPage() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);

  // Admin-configurable customer code prefix (2 letters + auto-incrementing 6-digit number)
  const [codeSettingOpen, setCodeSettingOpen] = useState(false);
  const [codeSetting, setCodeSetting] = useState<{ prefix: string; nextCode: string } | null>(null);
  const [prefixInput, setPrefixInput] = useState("");
  const [savingPrefix, setSavingPrefix] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    taxId: "",
    customerType: "RETAIL",
    creditLimit: "0",
    currentBalance: "0",
  });

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/v1/customers?search=${searchTerm}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch customers");
      }

      const data = await response.json();
      setCustomers(data.data || []);
    } catch (error) {
      showToast(
        "Error",
        error instanceof Error ? error.message : "Failed to load customers",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, searchTerm, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  // Fetch the current admin-configured customer code prefix
  const fetchCodeSetting = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/v1/admin/settings/customer-code`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return; // Non-admins won't have access — fail quietly
      const data = await response.json();
      setCodeSetting(data.data);
      setPrefixInput(data.data?.prefix || "");
    } catch {
      // Ignore — setting panel just won't render usefully for non-admins
    }
  }, [token]);

  useEffect(() => {
    fetchCodeSetting();
  }, [fetchCodeSetting]);

  const handleSavePrefix = async () => {
    if (!token) return;
    if (!/^[A-Za-z]{2}$/.test(prefixInput)) {
      showToast("Error", 'Prefix must be exactly 2 letters (e.g. "AB")', "error");
      return;
    }
    try {
      setSavingPrefix(true);
      const response = await fetch(`${API_BASE_URL}/v1/admin/settings/customer-code`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefix: prefixInput }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to update prefix");
      }
      const data = await response.json();
      setCodeSetting(data.data);
      showToast("Success", "Customer code prefix updated", "success");
      setCodeSettingOpen(false);
    } catch (error) {
      showToast("Error", error instanceof Error ? error.message : "Failed to update prefix", "error");
    } finally {
      setSavingPrefix(false);
    }
  };

  // Create customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      showToast("Error", "Not authenticated", "error");
      return;
    }

    try {
      setIsCreating(true);

      const response = await fetch(`${API_BASE_URL}/v1/customers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          creditLimit: parseFloat(formData.creditLimit),
          currentBalance: parseFloat(formData.currentBalance),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create customer");
      }

      await response.json();

      showToast("Success", "Customer created successfully", "success");

      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        taxId: "",
        customerType: "RETAIL",
        creditLimit: "0",
        currentBalance: "0",
      });

      setOpenDialog(false);
      await fetchCustomers();
    } catch (error) {
      showToast(
        "Error",
        error instanceof Error ? error.message : "Failed to create customer",
        "error"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenDetails = (id: string) => {
    setSelectedCustomerId(id);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedCustomerId(null);
    setCustomerDetails(null);
  };

  useEffect(() => {
    const fetchDetails = async () => {
      if (!token || !selectedCustomerId || !detailsOpen) return;
      try {
        setDetailsLoading(true);
        const res = await fetch(`${API_BASE_URL}/v1/customers/${selectedCustomerId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load details");
        const data = await res.json();
        setCustomerDetails(data.data || data);
      } catch (err) {
        showToast("Error", err instanceof Error ? err.message : "Failed to load details", "error");
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchDetails();
  }, [detailsOpen, selectedCustomerId, token, showToast]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const columnHelper = useMemo(() => createColumnHelper<AppTableFeatures, Customer>(), []);

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor((row) => row.code, {
          id: "code",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
          cell: (ctx) => <span className="font-mono text-sm text-slate-600">{ctx.getValue()}</span>,
          sortFn: "text",
        }),
        columnHelper.accessor((row) => row.name, {
          id: "name",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
          cell: (ctx) => (
            <div>
              <div className="font-medium text-slate-900">{ctx.getValue()}</div>
              {ctx.row.original.email && (
                <div className="text-xs text-slate-500">{ctx.row.original.email}</div>
              )}
            </div>
          ),
          sortFn: "text",
        }),
        columnHelper.accessor((row) => row.customerType, {
          id: "customerType",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
          cell: (ctx) => <Badge variant="outline">{ctx.getValue()}</Badge>,
          sortFn: "text",
        }),
        columnHelper.accessor((row) => row.phone || "-", {
          id: "phone",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Phone" />,
          cell: (ctx) => <span className="text-slate-600">{ctx.getValue()}</span>,
          sortFn: "text",
        }),
        columnHelper.accessor((row) => row.creditLimit, {
          id: "creditLimit",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Credit Limit" className="w-full justify-end" />
          ),
          cell: (ctx) => (
            <div className="text-right font-mono text-sm">
              {ctx.getValue().toLocaleString("en-KE", { style: "currency", currency: "KES" })}
            </div>
          ),
          sortFn: "alphanumeric",
        }),
        columnHelper.accessor((row) => row.currentBalance, {
          id: "currentBalance",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Current Balance" className="w-full justify-end" />
          ),
          cell: (ctx) => {
            const customer = ctx.row.original;
            const isOverLimit = customer.currentBalance > customer.creditLimit;
            return (
              <div>
                <div
                  className={cn(
                    "text-right font-mono text-sm font-semibold",
                    isOverLimit ? "text-red-600" : "text-emerald-600"
                  )}
                >
                  {customer.currentBalance.toLocaleString("en-KE", {
                    style: "currency",
                    currency: "KES",
                  })}
                </div>
                {isOverLimit && <div className="text-xs text-red-600 mt-1 text-right">Over limit</div>}
              </div>
            );
          },
          sortFn: "alphanumeric",
        }),
        columnHelper.accessor((row) => row.isActive, {
          id: "isActive",
          header: "Status",
          enableSorting: false,
          cell: (ctx) => {
            const isActive = ctx.getValue();
            return (
              <Badge
                variant={isActive ? "default" : "secondary"}
                className={isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}
              >
                {isActive ? "Active" : "Inactive"}
              </Badge>
            );
          },
        }),
        columnHelper.display({
          id: "actions",
          header: "Actions",
          enableSorting: false,
          cell: (ctx) => (
            <div className="w-32">
              <Button size="sm" variant="ghost" onClick={() => handleOpenDetails(ctx.row.original.id)}>
                View
              </Button>
            </div>
          ),
        }),
      ]),
    [columnHelper]
  );

  const table = useTable({
    features: tableFeaturesConfig,
    data: customers,
    columns,
    onSortingChange: setSorting,
    state: { sorting },
  });

  // No pagination is wanted here, so rows are read via getPrePaginatedRowModel()
  // rather than getRowModel() — see the note in lib/table/table-features.ts.
  const rows = table.getPrePaginatedRowModel().rows;

  return (
    <div className="space-y-6">
      {/* ── Header with Add Button ────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-emerald-900">Customers</h2>
          <p className="text-sm text-emerald-600 mt-1">
            Manage B2B and B2C customers, credit limits, and balances
          </p>
        </div>

        <div className="flex gap-2">
          {codeSetting && (
            <Dialog open={codeSettingOpen} onOpenChange={setCodeSettingOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" title={`Next code: ${codeSetting.nextCode}`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Code Prefix: {codeSetting.prefix}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Customer Code Prefix</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Every customer gets a code of 2 letters + an auto-incrementing
                    6-digit number (e.g. "{codeSetting.prefix}000001"). Changing the
                    prefix here only affects new customers going forward — the
                    number keeps counting up from where it is.
                  </p>
                  <div>
                    <Label htmlFor="prefix" className="text-sm font-medium">
                      2-Letter Prefix
                    </Label>
                    <Input
                      id="prefix"
                      maxLength={2}
                      value={prefixInput}
                      onChange={(e) => setPrefixInput(e.target.value.toUpperCase())}
                      className="mt-1 uppercase w-24"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Next code will be: {prefixInput.toUpperCase() || "??"}
                    {codeSetting.nextCode.replace(codeSetting.prefix, "")}
                  </p>
                  <div className="flex gap-3 justify-end pt-2">
                    <Button variant="outline" onClick={() => setCodeSettingOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSavePrefix}
                      disabled={savingPrefix}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {savingPrefix ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Customer</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              {/* Name */}
              <div>
                <Label htmlFor="name" className="text-sm font-medium">
                  Customer Name *
                </Label>
                <Input
                  id="name"
                  placeholder="Enter customer name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                  placeholder="Street address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  className="mt-1"
                />
              </div>

              {/* Customer Type */}
              <div>
                <Label htmlFor="customerType" className="text-sm font-medium">
                  Customer Type
                </Label>
                <select
                  id="customerType"
                  value={formData.customerType}
                  onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="RETAIL">Retail</option>
                  <option value="WHOLESALE">Wholesale</option>
                  <option value="DISTRIBUTOR">Distributor</option>
                </select>
              </div>

              {/* Credit Limit */}
              <div>
                <Label htmlFor="creditLimit" className="text-sm font-medium">
                  Credit Limit (KSH)
                </Label>
                <Input
                  id="creditLimit"
                  type="number"
                  placeholder="0.00"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                  className="mt-1"
                  step="0.01"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Customer"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Search Bar ────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* ── Data Table ────────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-8 w-8 text-slate-400 mb-2" />
            <p className="text-slate-600 font-medium">No customers found</p>
            <p className="text-sm text-slate-500 mt-1">
              {searchTerm ? "Try adjusting your search" : "Add your first customer"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b border-slate-200 bg-emerald-50">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "font-semibold text-emerald-900",
                        ["creditLimit", "currentBalance"].includes(header.column.id) && "text-right"
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
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
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

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseDetails();
          else setDetailsOpen(true);
        }}
      >
        <DialogContent className="fixed top-0 right-0 left-auto translate-x-0 translate-y-0 h-full max-w-md w-full rounded-none p-6 overflow-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : customerDetails ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{customerDetails.name}</h3>
                <p className="text-sm font-mono text-slate-500">{customerDetails.code}</p>
                <p className="text-sm text-slate-600">{customerDetails.email || ""}</p>
                <p className="text-sm text-slate-600">{customerDetails.phone || ""}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">Credit Limit</p>
                  <p className="text-sm font-mono font-semibold">
                    {Number(customerDetails.creditLimit || 0).toLocaleString("en-KE", {
                      style: "currency",
                      currency: "KES",
                    })}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">Current Balance</p>
                  <p className="text-sm font-mono font-semibold">
                    {Number(customerDetails.currentBalance || 0).toLocaleString("en-KE", {
                      style: "currency",
                      currency: "KES",
                    })}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold">Recent Invoices</h4>
                <div className="mt-2 space-y-2">
                  {(customerDetails.salesDocuments || []).slice(0, 10).map((d: any) => (
                    <Link
                      key={d.id}
                      href={`/dashboard/pos/documents/${d.id}`}
                      className="block rounded-md border p-2 bg-white hover:bg-slate-50"
                    >
                      <div className="flex justify-between text-sm">
                        <div className="font-medium">{d.documentId || d.id}</div>
                        <div className="text-slate-600">{d.status}</div>
                      </div>
                      <div className="text-xs text-slate-500">
                        {d.type} •{" "}
                        {Number(d.total || 0).toLocaleString("en-KE", {
                          style: "currency",
                          currency: "KES",
                        })}{" "}
                        • Balance:{" "}
                        {Number(d.balance || 0).toLocaleString("en-KE", {
                          style: "currency",
                          currency: "KES",
                        })}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold">Recent Payments</h4>
                <div className="mt-2 space-y-2">
                  {(customerDetails.payments || []).slice(0, 10).map((p: any) => (
                    <Link
                      key={p.id}
                      href={`/dashboard/finance/ar?customerId=${selectedCustomerId}&invoiceNo=${encodeURIComponent(p.salesDocument?.documentId || "")}&paymentId=${p.id}`}
                      className="block rounded-md border p-2 bg-white text-sm hover:bg-slate-50 flex justify-between"
                    >
                      <div>
                        {Number(p.amount || 0).toLocaleString("en-KE", {
                          style: "currency",
                          currency: "KES",
                        })}
                      </div>
                      <div className="text-slate-500">
                        {p.method || p.source} •{" "}
                        {new Date(p.createdAt || p.date).toLocaleDateString()}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">No details available</div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Footer Stats ────────────────────────────────────────────────────── */}
      {customers.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">Total Customers</p>
            <p className="mt-2 text-2xl font-bold text-emerald-900">{customers.length}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">Total Credit Limit</p>
            <p className="mt-2 text-2xl font-bold text-emerald-900">
              {customers
                .reduce((sum, c) => sum + c.creditLimit, 0)
                .toLocaleString("en-KE", {
                  style: "currency",
                  currency: "KES",
                  maximumFractionDigits: 0,
                })}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">Total Balance</p>
            <p
              className={cn(
                "mt-2 text-2xl font-bold",
                customers.some((c) => c.currentBalance > c.creditLimit)
                  ? "text-red-600"
                  : "text-emerald-900"
              )}
            >
              {customers
                .reduce((sum, c) => sum + c.currentBalance, 0)
                .toLocaleString("en-KE", {
                  style: "currency",
                  currency: "KES",
                  maximumFractionDigits: 0,
                })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
