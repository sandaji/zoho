'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { frontendEnv } from "@/lib/env";
const API_URL = frontendEnv.NEXT_PUBLIC_API_URL;

interface Customer {
  id: string;
  name: string;
  email?: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  unit_price: number;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface LineItem {
  id: string;
  productId: string;
  productName: string;
  qtyRequested: number;
  unitPrice: number;
  subtotal: number;
}

export default function CreateSalesOrderPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [branchId, setBranchId] = useState(user?.branch?.id || '');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Dropdown data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Load data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!token) {
          router.push('/auth/login');
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        };

        // Fetch customers
        const customersRes = await fetch(`${API_URL}/v1/customers`, {
          headers,
        });
        if (customersRes.ok) {
          const customerData = await customersRes.json();
          setCustomers(customerData.data || []);
        }

        // Fetch products
        const productsRes = await fetch(`${API_URL}/v1/products`, {
          headers,
        });
        if (productsRes.ok) {
          const productData = await productsRes.json();
          setProducts(productData.data || []);
        }

        // Fetch branches
        const branchesRes = await fetch(`${API_URL}/v1/branches`, {
          headers,
        });
        if (branchesRes.ok) {
          const branchData = await branchesRes.json();
          setBranches(branchData.data || []);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        showToast('error', 'Failed to load customers, products, or branches');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, router, showToast]);

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  // Add line item
  const addLineItem = () => {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      productId: '',
      productName: '',
      qtyRequested: 1,
      unitPrice: 0,
      subtotal: 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  // Update line item
  const updateLineItem = (id: string, updates: Partial<LineItem>) => {
    setLineItems((items) =>
      items.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, ...updates };

        // Recalculate subtotal if qty or price changed
        if ('qtyRequested' in updates || 'unitPrice' in updates) {
          updated.subtotal = updated.qtyRequested * updated.unitPrice;
        }

        return updated;
      })
    );
  };

  // Remove line item
  const removeLineItem = (id: string) => {
    setLineItems((items) => items.filter((item) => item.id !== id));
  };

  // Update product selection
  const handleProductChange = (itemId: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      updateLineItem(itemId, {
        productId,
        productName: product.name,
        unitPrice: product.unit_price,
      });
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      showToast('error', 'Please select a customer');
      return;
    }

    if (!branchId) {
      showToast('error', 'Please select a branch');
      return;
    }

    if (lineItems.length === 0) {
      showToast('error', 'Please add at least one line item');
      return;
    }

    // Validate all items have products
    if (lineItems.some((item) => !item.productId)) {
      showToast('error', 'All line items must have a product selected');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/v1/sales/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          branchId,
          notes,
          items: lineItems.map((item) => ({
            productId: item.productId,
            qtyRequested: item.qtyRequested,
            unitPrice: item.unitPrice,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create sales order');
      }

      const result = await response.json();
      showToast('success', `Sales order ${result.data.soNumber} created successfully`);
      router.push(`/dashboard/sales/orders/${result.data.id}`);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to create sales order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Create Sales Order</h1>
        <p className="text-slate-600 mt-1">Create a new sales order for a customer</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer and Branch Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Customer */}
              <div>
                <Label htmlFor="customer">Customer *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger id="customer">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Branch */}
              <div>
                <Label htmlFor="branch">Branch *</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger id="branch">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Order notes or special instructions"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Line Items</CardTitle>
              <CardDescription>Add products to this sales order</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLineItem}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {lineItems.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No items added yet. Click "Add Item" to get started.
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Select
                            value={item.productId}
                            onValueChange={(productId) =>
                              handleProductChange(item.id, productId)
                            }
                          >
                            <SelectTrigger className="w-48">
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
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.qtyRequested}
                            onChange={(e) =>
                              updateLineItem(item.id, {
                                qtyRequested: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-20 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateLineItem(item.id, {
                                unitPrice: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.subtotal.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => removeLineItem(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2 ml-auto w-72">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-medium">{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tax (16%):</span>
                <span className="font-medium">{tax.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-emerald-600">{total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Sales Order
          </Button>
        </div>
      </form>
    </div>
  );
}
