'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, Eye } from 'lucide-react';
import ReceiveGoodsModal from './receive-goods-modal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface PurchaseOrderDetail {
  id: string;
  poNumber: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CLOSED' | 'CANCELLED';
  vendor: { id: string; name: string; email?: string; phone?: string };
  branch: { id: string; name: string };
  requestedBy: { id: string; email: string; name: string };
  approvedBy?: { id: string; email: string; name: string };
  subtotal: number;
  tax: number;
  total: number;
  items: Array<{
    id: string;
    product: { id: string; name: string; sku: string };
    quantity: number;
    unitPrice: number;
    subtotal: number;
    receivedQuantity: number;
    grnItems: Array<{
      id: string;
      qtyReceived: number;
      goodsReceiptNote: { grnNumber: string; receivedAt: string };
    }>;
  }>;
  grns: Array<{
    id: string;
    grnNumber: string;
    status: string;
    receivedAt: string;
    receivedBy: { id: string; email: string; name: string };
    items: Array<{
      id: string;
      product: { name: string };
      qtyReceived: number;
    }>;
  }>;
  notes?: string;
  expectedDeliveryDate?: string;
  submittedAt?: string;
  approvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  PARTIALLY_RECEIVED: 'bg-amber-100 text-amber-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const { showToast } = useToast();
  const [po, setPO] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  useEffect(() => {
    const fetchPO = async () => {
      try {
        if (!token) {
          showToast('error', 'Authentication required');
          router.push('/auth/login');
          return;
        }

        const response = await fetch(
          `${API_URL}/v1/purchasing/orders/${params.id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch purchase order details');
        }

        const data = await response.json();
        setPO(data.data || data);
      } catch (error) {
        showToast('error', error instanceof Error ? error.message : 'Failed to load purchase order');
      } finally {
        setLoading(false);
      }
    };

    fetchPO();
  }, [params.id, token, router, showToast]);

  const handleReceiveSuccess = (updatedPO: PurchaseOrderDetail) => {
    setPO(updatedPO);
    setShowReceiveModal(false);
    showToast('success', 'Goods received successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600">Loading purchase order...</div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            Purchase Order Not Found
          </h1>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const canReceiveGoods = ['APPROVED', 'PARTIALLY_RECEIVED'].includes(po.status);;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {po.poNumber}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Created on {new Date(po.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Badge className={statusColors[po.status]}>
            {po.status.replace(/_/g, ' ')}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* PO Details Card */}
            <Card>
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-lg">Order Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-medium text-slate-600 mb-1">
                      Vendor
                    </div>
                    <div className="text-base font-semibold text-slate-900">
                      {po.vendor.name}
                    </div>
                    {po.vendor.email && (
                      <div className="text-sm text-slate-600">{po.vendor.email}</div>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-medium text-slate-600 mb-1">
                      Branch
                    </div>
                    <div className="text-base font-semibold text-slate-900">
                      {po.branch.name}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-slate-600 mb-1">
                      Requested By
                    </div>
                    <div className="text-base font-semibold text-slate-900">
                      {po.requestedBy.name}
                    </div>
                    <div className="text-sm text-slate-600">{po.requestedBy.email}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-slate-600 mb-1">
                      Approved By
                    </div>
                    <div className="text-base font-semibold text-slate-900">
                      {po.approvedBy?.name || 'Pending'}
                    </div>
                  </div>

                  {po.expectedDeliveryDate && (
                    <div>
                      <div className="text-sm font-medium text-slate-600 mb-1">
                        Expected Delivery
                      </div>
                      <div className="text-base font-semibold text-slate-900">
                        {new Date(po.expectedDeliveryDate).toLocaleDateString()}
                      </div>
                    </div>
                  )}

                  {po.notes && (
                    <div className="col-span-2">
                      <div className="text-sm font-medium text-slate-600 mb-1">
                        Notes
                      </div>
                      <div className="text-slate-700">{po.notes}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-lg">Line Items</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 hover:bg-transparent">
                      <TableHead className="h-12 text-slate-700 font-semibold">
                        Product
                      </TableHead>
                      <TableHead className="h-12 text-right text-slate-700 font-semibold">
                        Qty Ordered
                      </TableHead>
                      <TableHead className="h-12 text-right text-slate-700 font-semibold">
                        Unit Price
                      </TableHead>
                      <TableHead className="h-12 text-right text-slate-700 font-semibold">
                        Received
                      </TableHead>
                      <TableHead className="h-12 text-right text-slate-700 font-semibold">
                        Subtotal
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {po.items.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50">
                        <TableCell className="py-4">
                          <div>
                            <div className="font-medium text-slate-900">
                              {item.product.name}
                            </div>
                            <div className="text-sm text-slate-600">
                              SKU: {item.product.sku}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right py-4">
                          KES {item.unitPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <Badge
                            variant={
                              item.receivedQuantity === item.quantity
                                ? 'default'
                                : 'secondary'
                            }
                            className={
                              item.receivedQuantity === item.quantity
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }
                          >
                            {item.receivedQuantity}/{item.quantity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right py-4 font-medium">
                          KES {item.subtotal.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* GRN History */}
            {po.grns.length > 0 && (
              <Card>
                <CardHeader className="bg-slate-50 border-b">
                  <CardTitle className="text-lg">Goods Receipt History</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {po.grns.map((grn) => (
                      <div
                        key={grn.id}
                        className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-semibold text-slate-900">
                              {grn.grnNumber}
                            </div>
                            <div className="text-sm text-slate-600 mt-1">
                              Received by {grn.receivedBy.name} on{' '}
                              {new Date(grn.receivedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            {grn.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-700">
                          <div className="font-medium mb-2">Items received:</div>
                          <ul className="space-y-1 ml-4">
                            {grn.items.map((item) => (
                              <li key={item.id} className="text-slate-600">
                                {item.product.name}: {item.qtyReceived} units
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary Card */}
            <Card>
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-semibold text-slate-900">
                      KES {po.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tax:</span>
                    <span className="font-semibold text-slate-900">
                      KES {po.tax.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-px bg-slate-200 my-4"></div>
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold text-slate-900">Total:</span>
                    <span className="font-bold text-emerald-600">
                      KES {po.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Receive Goods Button */}
            {canReceiveGoods && (
              <Button
                onClick={() => setShowReceiveModal(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Eye className="mr-2 h-4 w-4" />
                Receive Goods
              </Button>
            )}

            {/* Status Timeline */}
            <Card>
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-lg">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4 text-sm">
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-600 mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-medium text-slate-900">Created</div>
                      <div className="text-slate-600">
                        {new Date(po.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {po.submittedAt && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-600 mt-2 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium text-slate-900">Submitted</div>
                        <div className="text-slate-600">
                          {new Date(po.submittedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}

                  {po.approvedAt && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-600 mt-2 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium text-slate-900">Approved</div>
                        <div className="text-slate-600">
                          {new Date(po.approvedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}

                  {po.closedAt && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-600 mt-2 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium text-slate-900">Closed</div>
                        <div className="text-slate-600">
                          {new Date(po.closedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Receive Goods Modal */}
      {showReceiveModal && (
        <ReceiveGoodsModal
          purchaseOrder={po}
          onClose={() => setShowReceiveModal(false)}
          onSuccess={handleReceiveSuccess}
        />
      )}
    </div>
  );
}
