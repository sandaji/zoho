"use client";

import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { 
  ArrowLeft, 
  CheckCircle, 
  Download, 
  Package,
  Loader2,
  Send
} from "lucide-react";

import { toast } from "sonner";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: { name: string; email: string, address: string };
  branch: { name: string; address: string };
  status: string;
  createdAt: string;
  items: { 
    id: string;
    product: { id: string; name: string }; 
    quantity: number; 
    receivedQuantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
}

export default function PurchaseOrderDetailPage({ params }: { params: { id: string } }) {
  

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Goods Receipt State
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<{id: string, name: string}[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [receiveItems, setReceiveItems] = useState<{productId: string; quantity: number}[]>([]);

  useEffect(() => {
    fetchPo();
    fetchWarehouses();
  }, [params.id]);

  const fetchPo = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/purchasing/orders/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPo(data.data);
        // Initialize receive items with remaining quantity
        setReceiveItems(data.data.items.map((item: any) => ({
          productId: item.product.id,
          quantity: Math.max(0, item.quantity - item.receivedQuantity)
        })));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchWarehouses = async () => {
      // Assuming we can fetch warehouses. ideally filter by branch
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/admin/warehouses`, {
           headers: { Authorization: `Bearer ${token}` }, 
        });
        if(response.ok) {
            const data = await response.json();
            setWarehouses(data.data.warehouses);
        }
      } catch (e) { console.error(e) }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    // Confirm dialog could be good here
    setActionLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/purchasing/orders/${params.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success(`Order status updated to ${newStatus}`);
        fetchPo();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceiveGoods = async () => {
      if (!selectedWarehouse) return toast.error("Please select a warehouse");
      
      const itemsToReceive = receiveItems.filter(i => i.quantity > 0);
      if (itemsToReceive.length === 0) return toast.error("Please enter quantities to receive");

      setActionLoading(true);
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/purchasing/orders/${params.id}/receive`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                warehouseId: selectedWarehouse,
                items: itemsToReceive
            })
        });
        
        if (response.ok) {
            toast.success("Goods received successfully");
            setReceiveModalOpen(false);
            fetchPo();
        } else {
            const err = await response.json();
            toast.error(err.message || "Failed to receive goods");
        }
      } catch (e) {
          toast.error("Error receiving goods");
      } finally {
          setActionLoading(false);
      }
  };

  const downloadPdf = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/purchasing/orders/${params.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${po?.poNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        toast.error("Failed to generate PDF");
      }
    } catch (e) {
      toast.error("Error downloading PDF");
    }
  };
  
  const updateReceiveQty = (productId: string, qty: number) => {
      setReceiveItems(prev => prev.map(item => 
          item.productId === productId ? { ...item, quantity: qty } : item
      ));
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
  if (!po) return <div className="p-12 text-center">Order not found</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/purchasing/orders">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {po.poNumber}
              <Badge variant={
                  po.status === 'APPROVED' ? 'default' : 
                  po.status === 'RECEIVED' ? 'secondary' : 'outline'
              }>
                  {po.status}
              </Badge>
            </h1>
            <p className="text-slate-500 text-sm">Created on {new Date(po.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadPdf}>
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          
          {po.status === "DRAFT" && (
            <Button onClick={() => handleStatusUpdate("SUBMITTED")} disabled={actionLoading}>
              <Send className="w-4 h-4 mr-2" />
              Submit
            </Button>
          )}

          {po.status === "SUBMITTED" && (
             // Ideally check permission
             <Button onClick={() => handleStatusUpdate("APPROVED")} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
               <CheckCircle className="w-4 h-4 mr-2" />
               Approve
             </Button>
          )}
          
          {(po.status === "APPROVED" || po.status === "PARTIALLY_RECEIVED") && (
            <Dialog open={receiveModalOpen} onOpenChange={setReceiveModalOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <Package className="w-4 h-4 mr-2" />
                        Receive Goods
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Receive Goods</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Destination Warehouse</Label>
                            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                                <SelectTrigger><SelectValue placeholder="Select Warehouse" /></SelectTrigger>
                                <SelectContent>
                                    {warehouses.map(w => (
                                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Ordered</TableHead>
                                    <TableHead>Received</TableHead>
                                    <TableHead>Receive Now</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {po.items.map(item => {
                                    const receiveItem = receiveItems.find(r => r.productId === item.product.id);
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.product.name}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>{item.receivedQuantity}</TableCell>
                                            <TableCell>
                                                <Input 
                                                    type="number" 
                                                    min="0"
                                                    max={item.quantity - item.receivedQuantity}
                                                    value={receiveItem?.quantity || 0}
                                                    onChange={(e) => updateReceiveQty(item.product.id, parseInt(e.target.value) || 0)}
                                                    className="w-24"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setReceiveModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleReceiveGoods} disabled={actionLoading}>Confirm Receipt</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
          )}

          {po.status === "RECEIVED" && (
             <Button variant="secondary" disabled>
                 <CheckCircle className="w-4 h-4 mr-2" />
                 Fully Received
             </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Cards */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Vendor</CardTitle></CardHeader>
          <CardContent>
            <p className="font-semibold">{po.vendor.name}</p>
            <p className="text-sm text-slate-500">{po.vendor.email}</p>
            <p className="text-sm text-slate-500">{po.vendor.address}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Ship To</CardTitle></CardHeader>
          <CardContent>
             <p className="font-semibold">{po.branch.name}</p>
             <p className="text-sm text-slate-500">{po.branch.address}</p>
          </CardContent>
        </Card>
        
        <Card>
           <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Summary</CardTitle></CardHeader>
           <CardContent className="space-y-1">
              <div className="flex justify-between"><span>Subtotal:</span> <span>${po.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Tax:</span> <span>${po.tax.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Total:</span> <span>${po.total.toFixed(2)}</span></div>
           </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader><CardTitle>Order Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                      {item.receivedQuantity > 0 ? (
                          <span className={item.receivedQuantity >= item.quantity ? "text-green-600" : "text-yellow-600"}>
                              {item.receivedQuantity}
                          </span>
                      ) : "-"}
                  </TableCell>
                  <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${item.subtotal.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {po.notes && (
          <Card>
              <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-slate-600">{po.notes}</p></CardContent>
          </Card>
      )}
    </div>
  );
}
