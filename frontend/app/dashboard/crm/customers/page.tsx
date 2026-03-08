"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Plus, Search, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
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
      const response = await fetch(
        `${API_BASE_URL}/v1/customers?search=${searchTerm}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

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

      showToast(
        "Success",
        "Customer created successfully",
        "success"
      );

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
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
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
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
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
                  placeholder="+254 XXX XXX XXX"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
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
                  placeholder="Street address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
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
                  value={formData.taxId}
                  onChange={(e) =>
                    setFormData({ ...formData, taxId: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, customerType: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, creditLimit: e.target.value })
                  }
                  className="mt-1"
                  step="0.01"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenDialog(false)}
                >
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
              <TableRow className="border-b border-slate-200 bg-emerald-50">
                <TableHead className="font-semibold text-emerald-900">Name</TableHead>
                <TableHead className="font-semibold text-emerald-900">Type</TableHead>
                <TableHead className="font-semibold text-emerald-900">Phone</TableHead>
                <TableHead className="text-right font-semibold text-emerald-900">
                  Credit Limit
                </TableHead>
                <TableHead className="text-right font-semibold text-emerald-900">
                  Current Balance
                </TableHead>
                <TableHead className="font-semibold text-emerald-900">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => {
                const isOverLimit =
                  customer.currentBalance > customer.creditLimit;

                return (
                  <TableRow
                    key={customer.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <TableCell>
                      <div className="font-medium text-slate-900">
                        {customer.name}
                      </div>
                      {customer.email && (
                        <div className="text-xs text-slate-500">
                          {customer.email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{customer.customerType}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {customer.phone || "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {customer.creditLimit.toLocaleString("en-KE", {
                        style: "currency",
                        currency: "KES",
                      })}
                    </TableCell>
                    <TableCell>
                      <div
                        className={cn(
                          "text-right font-mono text-sm font-semibold",
                          isOverLimit
                            ? "text-red-600"
                            : "text-emerald-600"
                        )}
                      >
                        {customer.currentBalance.toLocaleString("en-KE", {
                          style: "currency",
                          currency: "KES",
                        })}
                      </div>
                      {isOverLimit && (
                        <div className="text-xs text-red-600 mt-1">
                          Over limit
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={customer.isActive ? "default" : "secondary"}
                        className={
                          customer.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700"
                        }
                      >
                        {customer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Footer Stats ────────────────────────────────────────────────────── */}
      {customers.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">Total Customers</p>
            <p className="mt-2 text-2xl font-bold text-emerald-900">
              {customers.length}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">Total Credit Limit</p>
            <p className="mt-2 text-2xl font-bold text-emerald-900">
              {(
                customers.reduce((sum, c) => sum + c.creditLimit, 0)
              ).toLocaleString("en-KE", {
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
                customers.some(
                  (c) => c.currentBalance > c.creditLimit
                )
                  ? "text-red-600"
                  : "text-emerald-900"
              )}
            >
              {(
                customers.reduce((sum, c) => sum + c.currentBalance, 0)
              ).toLocaleString("en-KE", {
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
