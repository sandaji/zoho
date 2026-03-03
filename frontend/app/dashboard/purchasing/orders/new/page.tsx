"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import Link from "next/link";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

interface Vendor {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  cost_price: number;
}

interface OrderItem {
  productId?: string;
  quantity?: number;
  unitPrice?: number;
}

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [vendorId, setVendorId] = useState("");
  const [branchId, setBranchId] = useState(""); // Ideally pre-fill or select
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch Vendors
        const vendorsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/purchasing/vendors`, { headers });
        if (vendorsRes.ok) {
          const data = await vendorsRes.json();
          setVendors(data.data.vendors || []);
        }

        // Fetch Products
        const productsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/products`, { headers });
        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data.data.products || []); // Corrected to data.data.products
        }
        
        // Use user's branch if available
        if (user?.branchId) {
          setBranchId(user.branchId);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast.error("Failed to load active vendors or products");
      }
    };
    
    fetchData();
  }, [user]);

  const addItem = () => {
    setItems([...items, { productId: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    // Auto-fill price if product selected
    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      if (product) {
        item.unitPrice = product.cost_price;
      }
    }
    
    newItems[index] = item;
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity ?? 0) * (item.unitPrice ?? 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) {
      toast.error("Please select a vendor");
      return;
    }
    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }
    if (!branchId) {
      toast.error("Branch is required (User must be assigned to a branch)");
      return;
    }

    // Validate items
    for (const item of items) {
      if (!item.productId) {
        toast.error("All items must have a product selected");
        return;
      }
      if (!item.quantity || item.quantity <= 0) {
        toast.error("Quantity must be greater than 0");
        return;
      }
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/purchasing/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vendorId,
          branchId,
          items,
          notes,
          expectedDeliveryDate: expectedDate || undefined,
        }),
      });

      if (response.ok) {
        toast.success("Purchase Order created successfully");
        router.push("/dashboard/purchasing/orders");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to create PO");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchasing/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Create Purchase Order</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Expected Delivery Date</Label>
              <Input 
                type="date" 
                value={expectedDate} 
                onChange={(e) => setExpectedDate(e.target.value)} 
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Input 
                placeholder="Additional notes..." 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Items</h2>
            <Button type="button" onClick={addItem} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Select 
                      value={item.productId} 
                      onValueChange={(val) => updateItem(index, "productId", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell>
                    ${((item.quantity ?? 0) * (item.unitPrice ?? 0)).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 h-24">
                    No items added. Click "Add Item" to start.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex justify-end pt-4 border-t">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-medium">${calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tax (16%):</span>
                <span className="font-medium">${(calculateTotal() * 0.16).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>${(calculateTotal() * 1.16).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Link href="/dashboard/purchasing/orders">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Purchase Order
          </Button>
        </div>
      </form>
    </div>
  );
}
