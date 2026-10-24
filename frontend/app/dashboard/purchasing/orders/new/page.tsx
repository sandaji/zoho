"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { purchasingService } from "@/lib/purchasing.service";
import { warehouseService } from "@/lib/warehouse.service";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  POLineItemsTable,
  newBlankLine,
  type POLineItem,
} from "@/components/purchasing/po-line-items";

interface Vendor {
  id: string;
  code: string;
  name: string;
  email?: string;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

const TAX_RATE = 0; // Assume 0% tax for now

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const { token } = useAuth();

  // Form state
  const [vendorId, setVendorId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<POLineItem[]>([newBlankLine()]);

  // Data state
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeAction, setActiveAction] = useState<"draft" | "submit">("draft");

  useEffect(() => {
    if (token) fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [vendorsData, warehousesData] = await Promise.all([
        purchasingService.getVendors(token!),
        warehouseService.getWarehouses(token!),
      ]);
      setVendors(vendorsData.vendors || vendorsData || []);
      setWarehouses(warehousesData.data || []);
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
      toast.error("Failed to load vendors and warehouses");
    } finally {
      setLoading(false);
    }
  };

  // Products are vendor-scoped, so switching vendor clears any lines that
  // belonged to the previous vendor.
  const handleVendorChange = (newVendorId: string) => {
    if (newVendorId === vendorId) return;
    if (items.some((i) => i.product)) {
      toast.info("Vendor changed — line items were cleared");
    }
    setVendorId(newVendorId);
    setItems([newBlankLine()]);
  };

  const filledItems = items.filter((i) => i.product);
  const subtotal = filledItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const validateForm = (): boolean => {
    if (!vendorId) {
      toast.error("Please select a vendor");
      return false;
    }
    if (!destinationId) {
      toast.error("Please select a destination warehouse");
      return false;
    }
    if (filledItems.length === 0) {
      toast.error("Please add at least one product");
      return false;
    }
    if (filledItems.some((i) => i.quantity <= 0)) {
      toast.error("Every line needs a quantity greater than zero");
      return false;
    }
    return true;
  };

  const handleSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setActiveAction(status === "DRAFT" ? "draft" : "submit");

      const result = await purchasingService.createOrder(token!, {
        vendorId,
        warehouseId: destinationId,
        status,
        notes,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        items: filledItems.map((i) => ({
          productId: i.product!.id,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      });

      if (result.success || result.id) {
        toast.success(
          `Purchase Order ${status === "DRAFT" ? "saved as draft" : "submitted"} successfully`
        );
        router.push("/dashboard/purchasing/orders");
      } else {
        toast.error("Failed to create purchase order");
      }
    } catch (error) {
      console.error("Failed to create purchase order:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create purchase order"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-muted-foreground">Loading vendors and warehouses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl space-y-6 bg-background px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/purchasing/orders">
            <Button variant="ghost" size="sm" className="hover:text-emerald-600">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to purchase orders</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Create Purchase Order
            </h1>
            <p className="text-muted-foreground">
              Add a new purchase order and send for approval
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleSubmit("DRAFT")}
            className="text-slate-700"
            disabled={submitting}
          >
            {submitting && activeAction === "draft" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save as Draft"
            )}
          </Button>
          <Button
            onClick={() => handleSubmit("SUBMITTED")}
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting && activeAction === "submit" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Submit for Approval
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Details */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Order Details</CardTitle>
          <CardDescription>Provide vendor, warehouse, and order information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Vendor <span className="text-destructive">*</span>
              </label>
              <Select value={vendorId} onValueChange={handleVendorChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name} ({vendor.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Destination Warehouse <span className="text-destructive">*</span>
              </label>
              <Select value={destinationId} onValueChange={setDestinationId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Expected Delivery Date
              </label>
              <Input
                type="date"
                className="w-full"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <label className="block text-sm font-medium text-foreground">Order Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special instructions or notes..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Line items */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Line Items</CardTitle>
          <CardDescription>
            {vendorId
              ? "Search this vendor's products and pick one — a new row is added automatically"
              : "Select a vendor above to start adding products"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <POLineItemsTable
            token={token!}
            vendorId={vendorId}
            items={items}
            onChange={setItems}
          />
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="ml-auto max-w-sm border-slate-200">
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-medium text-foreground">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
            <span className="font-medium text-foreground">{formatCurrency(tax)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3 text-lg font-bold text-foreground">
            <span>Grand Total</span>
            <span className="text-emerald-600">{formatCurrency(total)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
