"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { purchasingService } from "@/lib/purchasing.service";
import { warehouseService } from "@/lib/warehouse.service";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  POLineItemsTable,
  newBlankLine,
  withTrailingBlank,
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

const TAX_RATE = 0; // Assume 0% tax for now, matching the "new order" form

export default function EditPurchaseOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { token } = useAuth();

  // Form state
  const [poNumber, setPoNumber] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [items, setItems] = useState<POLineItem[]>([newBlankLine()]);

  // Data state
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  // A PO can only be edited while it's still DRAFT — the backend enforces
  // this too, but we check up front so we don't render a form the save
  // button is guaranteed to reject.
  const [notEditable, setNotEditable] = useState<{ status: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeAction, setActiveAction] = useState<"save" | "submit">("save");

  useEffect(() => {
    if (token && orderId) fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, orderId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [vendorsData, warehousesData, orderResponse] = await Promise.all([
        purchasingService.getVendors(token!),
        warehouseService.getWarehouses(token!),
        purchasingService.getOrderById(token!, orderId),
      ]);

      setVendors(vendorsData.vendors || vendorsData || []);
      setWarehouses(warehousesData.data || []);

      const po = orderResponse.data || orderResponse;

      if (po.status !== "DRAFT") {
        setNotEditable({ status: po.status });
        return;
      }

      setPoNumber(po.poNumber || "");
      setVendorId(po.vendor?.id || "");
      setDestinationId(po.destinationWarehouseId || "");
      setNotes(po.notes || "");
      setExpectedDeliveryDate(
        po.expectedDeliveryDate ? String(po.expectedDeliveryDate).slice(0, 10) : ""
      );

      const existing: POLineItem[] = (po.items || []).map((item: any) => ({
        id: item.id,
        product: {
          id: item.product?.id || item.productId,
          sku: item.product?.sku || "",
          name: item.product?.name || "Unknown product",
          unit_price: Number(item.unitPrice) || 0,
          cost_price: Number(item.unitPrice) || 0,
        },
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice) || 0,
      }));
      setItems(withTrailingBlank(existing));
    } catch (error) {
      console.error("Failed to load purchase order for editing:", error);
      toast.error("Failed to load purchase order");
    } finally {
      setLoading(false);
    }
  };

  // Products are vendor-scoped, so switching vendor clears the lines.
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

  // Save changes, optionally submitting for approval right after
  const handleSave = async (thenSubmit: boolean) => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setActiveAction(thenSubmit ? "submit" : "save");

      await purchasingService.updateOrder(token!, orderId, {
        vendorId,
        warehouseId: destinationId,
        notes,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        items: filledItems.map((i) => ({
          productId: i.product!.id,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      });

      if (thenSubmit) {
        await purchasingService.updateOrderStatus(token!, orderId, "SUBMITTED");
        toast.success("Purchase Order updated and submitted for approval");
      } else {
        toast.success("Purchase Order changes saved");
      }

      router.push(`/dashboard/purchasing/orders/${orderId}`);
    } catch (error) {
      console.error("Failed to update purchase order:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update purchase order"
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
          <p className="text-muted-foreground">Loading purchase order...</p>
        </div>
      </div>
    );
  }

  if (notEditable) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="space-y-4 pt-6 text-center">
            <h1 className="text-xl font-bold text-foreground">
              This order can no longer be edited
            </h1>
            <p className="text-muted-foreground">
              Purchase Orders can only be edited while in{" "}
              <span className="font-semibold text-foreground">DRAFT</span> status. This order
              is currently{" "}
              <span className="font-semibold text-foreground">{notEditable.status}</span>.
            </p>
            <Link href={`/dashboard/purchasing/orders/${orderId}`}>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Order
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl space-y-6 bg-background px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/purchasing/orders/${orderId}`}>
            <Button variant="ghost" size="sm" className="hover:text-emerald-600">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to order</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Edit Purchase Order{poNumber ? ` — ${poNumber}` : ""}
            </h1>
            <p className="text-muted-foreground">
              Update this draft and save your changes, or submit it for approval
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={submitting}
            className="text-slate-700"
          >
            {submitting && activeAction === "save" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
          <Button
            onClick={() => handleSave(true)}
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
                <CheckCircle className="mr-2 h-4 w-4" />
                Save &amp; Submit for Approval
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
            Search this vendor&apos;s products and pick one — a new row is added automatically
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
