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
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface SalesOrderItem {
  id: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  qtyRequested: number;
  qtyDispatched: number;
  unitPrice: number;
}

interface SalesOrder {
  id: string;
  soNumber: string;
  status: string;
  customer: {
    id: string;
    name: string;
  };
  branch: {
    id: string;
    name: string;
  };
  items: SalesOrderItem[];
  totalAmount: number;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface DispatchLineItem {
  soItemId: string;
  qtyToDispatch: number;
}

export default function SalesOrderDispatchPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [salesOrder, setSalesOrder] = useState<SalesOrder | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [dispatchQuantities, setDispatchQuantities] = useState<
    Record<string, number>
  >({});

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

        // Fetch sales order
        const soRes = await fetch(`${API_URL}/v1/sales/orders/${params.id}`, {
          headers,
        });
        if (!soRes.ok) {
          throw new Error('Failed to load sales order');
        }
        const soData = await soRes.json();
        setSalesOrder(soData.data);

        // Initialize dispatch quantities
        const initialQuantities: Record<string, number> = {};
        soData.data.items.forEach((item: SalesOrderItem) => {
          initialQuantities[item.id] = 0;
        });
        setDispatchQuantities(initialQuantities);

        // Fetch warehouses
        const whRes = await fetch(`${API_URL}/v1/warehouses`, {
          headers,
        });
        if (whRes.ok) {
          const whData = await whRes.json();
          setWarehouses(whData.data || []);
          // Auto-select first warehouse
          if (whData.data && whData.data.length > 0) {
            setWarehouseId(whData.data[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        showToast('error', 'Failed to load sales order or warehouses');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id, token, router, showToast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!salesOrder) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Sales Order Not Found
          </h1>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalToDispatch = Object.values(dispatchQuantities).reduce(
    (sum, qty) => sum + qty,
    0
  );

  // Submit dispatch
  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!warehouseId) {
      showToast('error', 'Please select a warehouse');
      return;
    }

    if (totalToDispatch === 0) {
      showToast('error', 'Please specify at least one item to dispatch');
      return;
    }

    // Validate each item
    const items: DispatchLineItem[] = [];
    for (const soItem of salesOrder.items) {
      const qty = dispatchQuantities[soItem.id] || 0;
      if (qty > 0) {
        const availableToDispatch = soItem.qtyRequested - soItem.qtyDispatched;
        if (qty > availableToDispatch) {
          showToast(
            'error',
            `Cannot dispatch ${qty} units of ${soItem.product.name}. Only ${availableToDispatch} units available.`
          );
          return;
        }
        items.push({
          soItemId: soItem.id,
          qtyToDispatch: qty,
        });
      }
    }

    if (items.length === 0) {
      showToast('error', 'Please specify quantities to dispatch');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_URL}/v1/sales/orders/${params.id}/dispatch`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            warehouseId,
            items,
            notes,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to dispatch goods');
      }

      const result = await response.json();
      showToast(
        'success',
        `Dispatch note ${result.data.dnNumber} created successfully`
      );
      router.push(`/dashboard/sales/orders/${params.id}`);
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Failed to dispatch goods'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Dispatch - {salesOrder.soNumber}
        </h1>
        <p className="text-slate-600 mt-1">
          Customer: {salesOrder.customer.name}
        </p>
      </div>

      {/* Status Badge */}
      {salesOrder.status === 'DISPATCHED' && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span className="text-emerald-800">
            This sales order has been fully dispatched.
          </span>
        </div>
      )}

      <form onSubmit={handleDispatch} className="space-y-6">
        {/* Warehouse Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dispatch Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="warehouse">Warehouse *</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger id="warehouse">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Dispatch Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any dispatch notes or special handling instructions"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Items to Dispatch</CardTitle>
            <CardDescription>
              Enter quantities to dispatch for each product
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Requested</TableHead>
                    <TableHead className="text-center">Already Dispatched</TableHead>
                    <TableHead className="text-center">Available to Dispatch</TableHead>
                    <TableHead className="text-center">Dispatch Now</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesOrder.items.map((item) => {
                    const availableToDispatch =
                      item.qtyRequested - item.qtyDispatched;
                    const dispatchingNow =
                      dispatchQuantities[item.id] || 0;

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-sm text-slate-500">
                              SKU: {item.product.sku}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.qtyRequested}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-amber-600 font-medium">
                            {item.qtyDispatched}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-slate-600">
                            {availableToDispatch}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <Input
                              type="number"
                              min="0"
                              max={availableToDispatch}
                              value={dispatchingNow}
                              onChange={(e) => {
                                const value =
                                  parseInt(e.target.value) || 0;
                                setDispatchQuantities({
                                  ...dispatchQuantities,
                                  [item.id]: Math.min(
                                    value,
                                    availableToDispatch
                                  ),
                                });
                              }}
                              className="w-20 text-center"
                              disabled={availableToDispatch === 0}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Dispatch Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2 ml-auto w-72">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Qty to Dispatch:</span>
                <span className="font-medium">{totalToDispatch}</span>
              </div>
              <div className="text-sm text-slate-500">
                Order Total: {salesOrder.totalAmount.toFixed(2)} KES
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || totalToDispatch === 0}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Dispatch Note
          </Button>
        </div>
      </form>
    </div>
  );
}
