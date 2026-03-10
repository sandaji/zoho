// app/dashboard/purchasing/orders/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Eye, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { purchasingService } from "@/lib/purchasing.service";

type PurchaseOrderStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CLOSED" | "CANCELLED";

interface DestinationWarehouse {
  id: string;
  name: string;
  code?: string;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: {
    id: string;
    name: string;
  };
  destinationWarehouse: DestinationWarehouse;
  total: number;
  status: PurchaseOrderStatus;
  createdAt: string;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export default function PurchaseOrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | "ALL">("ALL");

  useEffect(() => {
    if (token) {
      fetchOrders();
    }
  }, [token]);

  const fetchOrders = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const data = await purchasingService.getOrders(token);
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Failed to fetch purchase orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: PurchaseOrderStatus): string => {
    const statusColorMap: Record<PurchaseOrderStatus, string> = {
      DRAFT: "bg-gray-100 text-gray-800",
      SUBMITTED: "bg-blue-100 text-blue-800",
      APPROVED: "bg-emerald-100 text-emerald-800 border border-emerald-200",
      PARTIALLY_RECEIVED: "bg-yellow-100 text-yellow-800 border border-yellow-200",
      RECEIVED: "bg-teal-100 text-teal-800",
      CLOSED: "bg-slate-100 text-slate-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    return statusColorMap[status] || "bg-gray-100 text-gray-800";
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.vendor.name.toLowerCase().includes(search.toLowerCase()) ||
      order.destinationWarehouse.name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-slate-500">Manage your purchase orders and goods receipt</p>
        </div>
        <Link href="/dashboard/purchasing/orders/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Purchase Order
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by PO number, vendor, or warehouse..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PurchaseOrderStatus | "ALL")}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="PARTIALLY_RECEIVED">Partially Received</SelectItem>
              <SelectItem value="RECEIVED">Received</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                  No purchase orders found.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-emerald-50/50 transition-colors">
                  <TableCell className="font-medium text-emerald-600">
                    <Link href={`/dashboard/purchasing/orders/${order.id}`} className="hover:underline">
                      {order.poNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-700">{order.vendor.name}</TableCell>
                  <TableCell className="text-slate-700">
                    {order.destinationWarehouse?.name || "-"}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-slate-600">{order.items?.length || 0} items</TableCell>
                  <TableCell className="font-semibold text-slate-900">
                    KES {order.total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/purchasing/orders/${order.id}`}>
                      <Button variant="ghost" size="sm" className="hover:text-emerald-600">
                        <Eye className="w-4 h-4" />
                        <span className="sr-only">View purchase order</span>
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
