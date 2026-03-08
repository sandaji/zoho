'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PurchaseOrderDetail {
  id: string;
  poNumber: string;
  status: string;
  items: Array<{
    id: string;
    product: { id: string; name: string; sku: string };
    quantity: number;
    receivedQuantity: number;
  }>;
}

interface ReceiveGoodsModalProps {
  purchaseOrder: PurchaseOrderDetail;
  onClose: () => void;
  onSuccess: (updatedPO: any) => void;
}

export default function ReceiveGoodsModal({
  purchaseOrder,
  onClose,
  onSuccess,
}: ReceiveGoodsModalProps) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [allowOverReceive, setAllowOverReceive] = useState(false);
  const [notes, setNotes] = useState('');
  const [receiveItems, setReceiveItems] = useState<
    Record<
      string,
      {
        poItemId: string;
        productId: string;
        qtyReceived: number;
        maxAvailable: number;
      }
    >
  >({});

  // Initialize warehouses and receive items
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        if (!token) return;

        const response = await fetch(`${API_URL}/v1/warehouses`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch warehouses');
        }

        const data = await response.json();
        const warehouseList = data.data?.warehouses || data.warehouses || [];
        setWarehouses(warehouseList);
        if (warehouseList.length > 0) {
          setSelectedWarehouse(warehouseList[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch warehouses:', error);
        showToast('error', 'Failed to load warehouses');
      } finally {
        setLoading(false);
      }
    };

    // Initialize receive items
    const initializeItems: typeof receiveItems = {};
    purchaseOrder.items.forEach((item) => {
      const remaining = item.quantity - item.receivedQuantity;
      initializeItems[item.id] = {
        poItemId: item.id,
        productId: item.product.id,
        qtyReceived: 0,
        maxAvailable: remaining,
      };
    });
    setReceiveItems(initializeItems);

    fetchWarehouses();
  }, [token, purchaseOrder, showToast]);

  const handleQuantityChange = (itemId: string, value: number) => {
    setReceiveItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        qtyReceived: Math.max(0, value),
      },
    }));
  };

  const handleSubmit = async () => {
    if (!selectedWarehouse) {
      showToast('error', 'Please select a warehouse');
      return;
    }

    const items = Object.values(receiveItems)
      .filter((item) => item.qtyReceived > 0)
      .map((item) => ({
        productId: item.productId,
        quantity: item.qtyReceived,
      }));

    if (items.length === 0) {
      showToast('error', 'Please enter quantities to receive');
      return;
    }

    // Validate over-receive
    for (const poItem of purchaseOrder.items) {
      const receiveItem = receiveItems[poItem.id];
      const remaining = poItem.quantity - poItem.receivedQuantity;
      if (receiveItem && receiveItem.qtyReceived > remaining && !allowOverReceive) {
        showToast(
          'error',
          `Cannot receive ${receiveItem.qtyReceived} units of ${poItem.product.name}. Only ${remaining} units available.`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      if (!token) {
        showToast('error', 'Authentication required');
        return;
      }

      const response = await fetch(
        `${API_URL}/v1/purchasing/orders/${purchaseOrder.id}/receive`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            warehouseId: selectedWarehouse,
            items: Object.entries(receiveItems)
              .filter(([_, item]) => item.qtyReceived > 0)
              .map(([_, item]) => ({
                productId: purchaseOrder.items.find(pi => pi.id === item.poItemId)?.product.id,
                quantity: item.qtyReceived,
              })),
            notes,
            allowOverReceive,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to receive goods');
      }

      const result = await response.json();
      showToast('success', `Goods received successfully! GRN: ${result.data?.grnNumber || 'Confirmed'}`);
      onClose();

      // Refresh the PO after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Failed to receive goods'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receive Goods - {purchaseOrder.poNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Warehouse Selection */}
          <div>
            <Label className="text-base font-semibold mb-2 block">
              Destination Warehouse *
            </Label>
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select a warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {warehouses.length === 0 && (
              <div className="mt-2 flex items-center gap-2 text-amber-700 text-sm">
                <AlertCircle className="h-4 w-4" />
                No warehouses available
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Line Items
            </Label>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="font-semibold text-slate-700">
                    Product
                  </TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">
                    Requested
                  </TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">
                    Previously Received
                  </TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">
                    Receive Now *
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrder.items.map((item) => {
                  const receiveItem = receiveItems[item.id];
                  const remaining = item.quantity - item.receivedQuantity;

                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div>
                          <div className="font-medium text-slate-900">
                            {item.product.name}
                          </div>
                          <div className="text-xs text-slate-600">
                            SKU: {item.product.sku}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.receivedQuantity}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          value={receiveItem?.qtyReceived || 0}
                          onChange={(e) =>
                            handleQuantityChange(
                              item.id,
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-24 text-right"
                          placeholder="0"
                        />
                        <div className="text-xs text-slate-600 mt-1">
                          Max: {remaining}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Over-Receive Warning */}
          {Object.values(receiveItems).some(
            (item) => item.qtyReceived > item.maxAvailable
          ) && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <div className="font-semibold mb-1">Over-Receipt Detected</div>
                  <p>
                    You are receiving more than requested. Check the box below to
                    confirm this is intentional.
                  </p>
                </div>
              </div>
            )}

          {Object.values(receiveItems).some(
            (item) => item.qtyReceived > item.maxAvailable
          ) && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allow-overreceive"
                  checked={allowOverReceive}
                  onChange={(e) => setAllowOverReceive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <Label htmlFor="allow-overreceive" className="font-medium">
                  I confirm to receive more than requested quantities
                </Label>
              </div>
            )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="font-semibold mb-2 block">
              Notes (Optional)
            </Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this receipt..."
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                submitting || !selectedWarehouse || Object.values(receiveItems).every(i => i.qtyReceived === 0)
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Receipt'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
