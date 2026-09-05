"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { API_ENDPOINTS } from "@/lib/api-config";
import { useAuth } from "@/lib/auth-context";
import { Loader2, ArrowUpRight, ArrowDownLeft, RefreshCw } from "lucide-react";
import { useTable, createColumnHelper, type SortingState } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { tableFeaturesConfig, type AppTableFeatures } from "@/lib/table/table-features";

interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  reference: string;
  createdAt: string;
  warehouse: {
    name: string;
    code: string;
  };
  createdById: string; // Could expand to user name if backend sends it
}

const OUTBOUND_TYPES = ["OUTBOUND", "SALE", "TRANSFER_OUT"];

const columnHelper = createColumnHelper<AppTableFeatures, StockMovement>();

const columns = columnHelper.columns([
  columnHelper.accessor((row) => new Date(row.createdAt).getTime(), {
    id: "date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: (ctx) => new Date(ctx.row.original.createdAt).toLocaleString(),
    sortFn: "alphanumeric",
  }),
  columnHelper.accessor((row) => row.type, {
    id: "type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: (ctx) => {
      const type = ctx.getValue();
      const badge =
        ["INBOUND", "PURCHASE_IN", "TRANSFER_IN", "RETURN_IN"].includes(type) ? (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <ArrowDownLeft className="w-3 h-3 mr-1" /> Inbound
          </Badge>
        ) : OUTBOUND_TYPES.includes(type) ? (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <ArrowUpRight className="w-3 h-3 mr-1" /> Outbound
          </Badge>
        ) : type === "ADJUSTMENT" ? (
          <Badge variant="outline">
            <RefreshCw className="w-3 h-3 mr-1" /> Adjustment
          </Badge>
        ) : (
          <Badge variant="secondary">{type}</Badge>
        );
      return (
        <div className="flex flex-col gap-1">
          {badge}
          <span className="text-xs text-muted-foreground">{type}</span>
        </div>
      );
    },
    sortFn: "text",
  }),
  columnHelper.accessor((row) => row.reference || "-", {
    id: "reference",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Reference" />,
    sortFn: "text",
  }),
  columnHelper.accessor((row) => row.warehouse?.name || "Unknown", {
    id: "warehouse",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Warehouse" />,
    sortFn: "text",
  }),
  columnHelper.accessor((row) => row.quantity, {
    id: "quantity",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Quantity" className="w-full justify-end" />
    ),
    cell: (ctx) => {
      const movement = ctx.row.original;
      const isOutbound = OUTBOUND_TYPES.includes(movement.type);
      return (
        <div className={`text-right font-medium ${isOutbound ? "text-red-600" : "text-green-600"}`}>
          {isOutbound ? "-" : "+"}
          {movement.quantity}
        </div>
      );
    },
    sortFn: "alphanumeric",
  }),
]);

export function TraceabilityTab({ productId }: { productId: string }) {
  const { token } = useAuth();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {
    if (productId && token) {
      fetchMovements();
    }
  }, [productId, token]);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const url = `${API_ENDPOINTS.STOCK_MOVEMENTS}?productId=${productId}&limit=20`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch stock movements");
      }

      const data = await response.json();
      setMovements(data.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load traceability data");
    } finally {
      setLoading(false);
    }
  };

  const table = useTable({
    features: tableFeaturesConfig,
    data: movements,
    columns,
    onSortingChange: setSorting,
    state: { sorting },
  });

  // No pagination is wanted here, so rows are read via getPrePaginatedRowModel()
  // rather than getRowModel() — see the note in lib/table/table-features.ts.
  const rows = table.getPrePaginatedRowModel().rows;

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Movement History</CardTitle>
      </CardHeader>
      <CardContent>
        {movements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No movements recorded.</div>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={header.column.id === "quantity" ? "text-right" : undefined}
                    >
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
