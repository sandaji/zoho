"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { purchasingService } from "@/lib/purchasing.service";
import { warehouseService } from "@/lib/warehouse.service";
import { toast } from "sonner";

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

interface Product {
  id: string;
  sku: string;
  name: string;
  unit_price: number;
  cost_price: number;
}

interface LineItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

const TAX_RATE = 0; // Assume 0% tax for now

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const { token } = useAuth();

  // Form state
  const [vendorId, setVendorId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { id: "1", productId: "", quantity: 1, unitPrice: 0 },
  ]);

  // Data state
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"draft" | "submit">("draft");

  // Fetch initial data
  useEffect(() => {
    if (token) {
      fetchInitialData();
    }
  }, [token]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [vendorsData, warehousesData, productsData] = await Promise.all([
        purchasingService.getVendors(token!),
        warehouseService.getWarehouses(token!),
        warehouseService.getProducts(token!),
      ]);

      setVendors(vendorsData.vendors || []);
      setWarehouses(warehousesData.warehouses || []);
      setProducts(productsData.products || []);
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
      toast.error("Failed to load vendors and warehouses");
    } finally {
      setLoading(false);
    }
  };

  // Calculate line item total
  const calculateLineTotal = (quantity: number, unitPrice: number): number => {
    return quantity * unitPrice;
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    return sum + calculateLineTotal(item.quantity, item.unitPrice);
  }, 0);

  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  // Add new line item
  const addLineItem = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setItems([
      ...items,
      {
        id: newId,
        productId: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  // Remove line item
  const removeLineItem = (id: string) => {
    if (items.length === 1) {
      toast.error("You must have at least one line item");
      return;
    }
    setItems(items.filter((item) => item.id !== id));
  };

  // Update line item
  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          // If product is changed, update the unit price from product data
          if (field === "productId") {
            const selectedProduct = products.find((p) => p.id === value);
            return {
              ...item,
              [field]: value,
              unitPrice: selectedProduct?.cost_price || 0,
            };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Validation
  const validateForm = (): boolean => {
    if (!vendorId) {
      toast.error("Please select a vendor");
      return false;
    }

    if (!destinationId) {
      toast.error("Please select a destination warehouse");
      return false;
    }

    if (items.length === 0) {
      toast.error("Please add at least one line item");
      return false;
    }

    const hasInvalidItems = items.some(
      (item) => !item.productId || item.quantity <= 0
    );

    if (hasInvalidItems) {
      toast.error("Please ensure all items have a product and valid quantity");
      return false;
    }

    return true;
  };

  // Handle submit
  const handleSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      const orderData = {
        vendorId,
        branchId: destinationId,
        status,
        notes,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };

      const result = await purchasingService.createOrder(token!, orderData);

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
      toast.error("Failed to create purchase order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-slate-600">Loading vendors and warehouses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/purchasing/orders">
              <Button variant="ghost" size="sm" className="hover:text-emerald-600">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Create Purchase Order
              </h1>
              <p className="text-slate-500">
                Add a new purchase order and send for approval
              </p>
            </div>
          </div>

          {/* Dual Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handleSubmit("DRAFT")}
              disabled={submitting}
              className="text-slate-700"
            >
              {submitting && activeTab === "draft" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save as Draft"
              )}
            </Button>
            <Button
              onClick={() => {
                setActiveTab("submit");
                handleSubmit("SUBMITTED");
              }}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting && activeTab === "submit" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit for Approval
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Details Section */}
        <Card className="border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Order Details</CardTitle>
            <CardDescription>
              Provide vendor, warehouse, and order information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Vendor Select */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Vendor <span className="text-red-500">*</span>
                </label>
                <Select value={vendorId} onValueChange={setVendorId}>
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

              {/* Warehouse Select */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Destination Warehouse <span className="text-red-500">*</span>
                </label>
                <Select
                  value={destinationId}
                  onValueChange={setDestinationId}
                >
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

              {/* Expected Delivery Date (Optional) */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Expected Delivery Date
                </label>
                <Input type="date" className="w-full" />
              </div>
            </div>

            {/* Notes Section */}
            <div className="mt-6 space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Order Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any special instructions or notes..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items Section */}
        <Card className="border-slate-200">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Line Items</CardTitle>
                <CardDescription>
                  Add products and quantities to your order
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={addLineItem}
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
            </div>
          </CardHeader>

          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200">
                  <TableHead className="min-w-48">Product</TableHead>
                  <TableHead className="min-w-24 text-right">
                    Quantity
                  </TableHead>
                  <TableHead className="min-w-28 text-right">
                    Unit Price
                  </TableHead>
                  <TableHead className="min-w-28 text-right">Total</TableHead>
                  <TableHead className="w-12 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id} className="hover:bg-emerald-50/50">
                    {/* Product Select */}
                    <TableCell>
                      <Select
                        value={item.productId}
                        onValueChange={(value) =>
                          updateLineItem(item.id, "productId", value)
                        }
                      >
                        <SelectTrigger className="w-full border-slate-200">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} ({product.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Quantity Input */}
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(
                            item.id,
                            "quantity",
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="w-full border-slate-200 text-right"
                      />
                    </TableCell>

                    {/* Unit Price Input */}
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateLineItem(
                            item.id,
                            "unitPrice",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full border-slate-200 text-right"
                      />
                    </TableCell>

                    {/* Total (Auto-calculated) */}
                    <TableCell className="text-right font-semibold text-slate-900">
                      $
                      {calculateLineTotal(item.quantity, item.unitPrice).toFixed(
                        2
                      )}
                    </TableCell>

                    {/* Remove Button */}
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(item.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Summary Section */}
        <Card className="border-slate-200 ml-auto max-w-sm">
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between items-center text-slate-700">
              <span>Subtotal:</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-700">
              <span>Tax ({(TAX_RATE * 100).toFixed(0)}%):</span>
              <span className="font-medium">${tax.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-lg font-bold text-slate-900">
              <span>Grand Total:</span>
              <span className="text-emerald-600">${total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
