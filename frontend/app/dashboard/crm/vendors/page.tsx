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
  createdAt: string;
}

export default function VendorsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
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

  // Fetch vendors
  const fetchVendors = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/v1/purchasing/vendors?search=${searchTerm}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch vendors");
      }

      const data = await response.json();
      setVendors(data.data || []);
    } catch (error) {
      showToast(
        "Error",
        error instanceof Error ? error.message : "Failed to load vendors",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, searchTerm, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendors();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchVendors]);

  // Create vendor
  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      showToast("Error", "Not authenticated", "error");
      return;
    }

    try {
      setIsCreating(true);

      const response = await fetch(`${API_BASE_URL}/v1/purchasing/vendors`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          leadTimeDays: parseInt(formData.leadTimeDays),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create vendor");
      }

      showToast(
        "Success",
        "Vendor created successfully",
        "success"
      );

      setFormData({
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

      setOpenDialog(false);
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

  return (
    <div className="space-y-6">
      {/* ── Header with Add Button ────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-emerald-900">Vendors</h2>
          <p className="text-sm text-emerald-600 mt-1">
            Manage suppliers, payment terms, and lead times
          </p>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
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
                  placeholder="e.g., VENDOR_001"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
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
                  placeholder="contact@vendor.com"
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

              {/* Website */}
              <div>
                <Label htmlFor="website" className="text-sm font-medium">
                  Website
                </Label>
                <Input
                  id="website"
                  placeholder="https://vendor.com"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
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
                  value={formData.paymentTerms}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentTerms: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="CASH_ON_DELIVERY">Cash on Delivery</option>
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
                  value={formData.leadTimeDays}
                  onChange={(e) =>
                    setFormData({ ...formData, leadTimeDays: e.target.value })
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by name, code, or phone..."
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
        ) : vendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-8 w-8 text-slate-400 mb-2" />
            <p className="text-slate-600 font-medium">No vendors found</p>
            <p className="text-sm text-slate-500 mt-1">
              {searchTerm ? "Try adjusting your search" : "Add your first vendor"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-emerald-50">
                <TableHead className="font-semibold text-emerald-900">Name</TableHead>
                <TableHead className="font-semibold text-emerald-900">Code</TableHead>
                <TableHead className="font-semibold text-emerald-900">Phone</TableHead>
                <TableHead className="font-semibold text-emerald-900">
                  Payment Terms
                </TableHead>
                <TableHead className="text-center font-semibold text-emerald-900">
                  Lead Time (Days)
                </TableHead>
                <TableHead className="font-semibold text-emerald-900">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((vendor) => {
                const paymentTermsLabel = vendor.paymentTerms.replace(/_/g, " ");

                return (
                  <TableRow
                    key={vendor.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <TableCell>
                      <div className="font-medium text-slate-900">
                        {vendor.name}
                      </div>
                      {vendor.email && (
                        <div className="text-xs text-slate-500">
                          {vendor.email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                        {vendor.code}
                      </code>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {vendor.phone || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-emerald-50">
                        {paymentTermsLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      <span className="inline-block bg-slate-100 text-slate-700 px-3 py-1 rounded-md text-sm font-semibold">
                        {vendor.leadTimeDays} days
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={vendor.isActive ? "default" : "secondary"}
                        className={
                          vendor.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700"
                        }
                      >
                        {vendor.isActive ? "Active" : "Inactive"}
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
      {vendors.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">Total Vendors</p>
            <p className="mt-2 text-2xl font-bold text-emerald-900">
              {vendors.length}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">Avg. Lead Time</p>
            <p className="mt-2 text-2xl font-bold text-emerald-900">
              {(
                vendors.reduce((sum, v) => sum + v.leadTimeDays, 0) /
                vendors.length
              ).toFixed(1)}{" "}
              days
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">Active Vendors</p>
            <p className="mt-2 text-2xl font-bold text-emerald-900">
              {vendors.filter((v) => v.isActive).length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
