"use client";

import * as React from "react";
import { useTable, createColumnHelper, type SortingState } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { tableFeaturesConfig, type AppTableFeatures } from "@/lib/table/table-features";

interface LeaveRequest {
  id: string;
  leaveType: { name: string };
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  reason: string;
  createdAt: string;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Pending", variant: "secondary" },
  APPROVED: { label: "Approved", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
};

const columnHelper = createColumnHelper<AppTableFeatures, LeaveRequest>();

const columns = columnHelper.columns([
  columnHelper.accessor((row) => row.leaveType.name, {
    id: "type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
    sortFn: "text",
  }),
  columnHelper.accessor((row) => row.startDate, {
    id: "dates",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Dates" />,
    cell: (ctx) => {
      const request = ctx.row.original;
      return (
        <>
          {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
        </>
      );
    },
    sortFn: "alphanumeric",
  }),
  columnHelper.accessor((row) => row.days, {
    id: "days",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Days" />,
    sortFn: "alphanumeric",
  }),
  columnHelper.accessor((row) => row.reason, {
    id: "reason",
    header: "Reason",
    enableSorting: false,
    cell: (ctx) => <span className="block max-w-[200px] truncate">{ctx.getValue() || "-"}</span>,
  }),
  columnHelper.accessor((row) => row.status, {
    id: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: (ctx) => {
      const status = ctx.getValue();
      return (
        <Badge variant={statusMap[status]?.variant || "secondary"}>
          {statusMap[status]?.label || status}
        </Badge>
      );
    },
    sortFn: "text",
  }),
  columnHelper.accessor((row) => row.createdAt, {
    id: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Requested On" className="w-full justify-end" />
    ),
    cell: (ctx) => <div className="text-right">{new Date(ctx.getValue()).toLocaleDateString()}</div>,
    sortFn: "alphanumeric",
  }),
]);

export function LeaveRequestsTable({ requests, isLoading }: { requests: LeaveRequest[]; isLoading: boolean }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useTable({
    features: tableFeaturesConfig,
    data: requests,
    columns,
    onSortingChange: setSorting,
    state: { sorting },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={header.column.id === "createdAt" ? "text-right" : undefined}
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getPrePaginatedRowModel().rows.length > 0 ? (
            table.getPrePaginatedRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cell.column.id === "createdAt" ? "text-right" : undefined}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No leave history found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
