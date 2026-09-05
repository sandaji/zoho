// app/dashboard/purchasing/orders/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useTable, createColumnHelper, type SortingState } from "@tanstack/react-table";
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
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { tableFeaturesConfig, type AppTableFeatures } from "@/lib/table/table-features";

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

const STATUS_COLOR_MAP: Record<PurchaseOrderStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  PARTIALLY_RECEIVED: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  RECEIVED: "bg-teal-100 text-teal-800",
  CLOSED: "bg-slate-100 text-slate-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const columnHelper = createColumnHelper<AppTableFeatures, PurchaseOrder>();

const columns = columnHelper.columns([
  columnHelper.accessor((row) => row.poNumber, {
    id: "poNumber",
    header: ({ column }) => <DataTableColumnHeader column={column} title="PO Number" />,
    cell: (ctx) => (
      <Link
        href={`/dashboard/purchasing/orders/${ctx.row.original.id}`}
        className="font-medium text-emerald-600 hover:underline"
      >
        {ctx.getValue()}
      </Link>
    ),
    sortFn: "text",
  }),
  columnHelper.accessor((row) => row.vendor.name, {
    id: "vendor",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Vendor" />,
    cell: (ctx) => <span className="text-slate-700">{ctx.getValue()}</span>,
    sortFn: "text",
  }),
  columnHelper.accessor((row) => row.destinationWarehouse?.name || "-", {
    id: "destination",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Destination" />,
    cell: (ctx) => <span className="text-slate-700">{ctx.getValue()}</span>,
    sortFn: "text",
  }),
  columnHelper.accessor((row) => new Date(row.createdAt).getTime(), {
    id: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: (ctx) => (
      <span className="text-slate-600">
        {new Date(ctx.row.original.createdAt).toLocaleDateString()}
      </span>
    ),
    sortFn: "alphanumeric",
  }),
  columnHelper.accessor((row) => row.items?.length || 0, {
    id: "items",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Items" />,
    cell: (ctx) => <span className="text-slate-600">{ctx.getValue()} items</span>,
    sortFn: "alphanumeric",
  }),
  columnHelper.accessor((row) => row.total, {
    id: "total",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
    cell: (ctx) => (
      <span className="font-semibold text-slate-900">
        KES {ctx.getValue().toLocaleString("en-KE", { minimumFractionDigits: 2 })}
      </span>
    ),
    sortFn: "alphanumeric",
  }),
  columnHelper.accessor((row) => row.status, {
    id: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: (ctx) => {
      const status = ctx.getValue();
      return (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR_MAP[status]}`}
        >
          {status.replace(/_/g, " ")}
        </span>
      );
    },
    sortFn: "text",
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    enableSorting: false,
    cell: (ctx) => (
      <div className="text-right">
        <Link href={`/dashboard/purchasing/orders/${ctx.row.original.id}`}>
          <Button variant="ghost" size="sm" className="hover:text-emerald-600">
            <Eye className="w-4 h-4" />
            <span className="sr-only">View purchase order</span>
          </Button>
        </Link>
      </div>
    ),
  }),
]);

export default function PurchaseOrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | "ALL">("ALL");
  const [sorting, setSorting] = useState<SortingState>([]);

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

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesSearch =
          order.poNumber.toLowerCase().includes(search.toLowerCase()) ||
          order.vendor.name.toLowerCase().includes(search.toLowerCase()) ||
          order.destinationWarehouse.name.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;

        return matchesSearch && matchesStatus;
      }),
    [orders, search, statusFilter]
  );

  // No pagination is wanted here, so rows are read via
  // getPrePaginationRowModel() rather than getRowModel() — see the note in
  // lib/table/table-features.ts on why getRowModel() would silently
  // truncate to the first 10 rows otherwise.
  const table = useTable({
    features: tableFeaturesConfig,
    data: filteredOrders,
    columns,
    onSortingChange: setSorting,
    state: { sorting },
  });

  const rows = table.getPrePaginatedRowModel().rows;

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
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
                  No purchase orders found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-emerald-50/50 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
