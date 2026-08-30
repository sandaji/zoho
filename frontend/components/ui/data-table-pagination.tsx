"use client";

import * as React from "react";
import { type ReactTable, type RowData } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type AppTableFeatures } from "@/lib/table/table-features";

interface DataTablePaginationProps<TData extends RowData> {
  table: ReactTable<AppTableFeatures, TData>;
  totalRows: number;
  className?: string;
}

/**
 * Shared pagination footer for TanStack-driven tables.
 * Matches the existing emerald-accent pagination style used across
 * AdminTable / inventory tables so migrated tables look identical to
 * their pre-migration counterparts.
 */
export function DataTablePagination<TData extends RowData>({
  table,
  totalRows,
  className,
}: DataTablePaginationProps<TData>) {
  // v9 exposes reactive state as a `table.state` property, not a
  // `getState()` method like v8.
  const { pageIndex, pageSize } = table.state.pagination;
  const pageCount = table.getPageCount();

  if (pageCount <= 1) return null;

  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div className={cn("mt-4 flex items-center justify-between", className)}>
      <p className="text-xs text-emerald-500">
        Showing <span className="font-medium text-emerald-700">{from}</span>–
        <span className="font-medium text-emerald-700">{to}</span> of{" "}
        <span className="font-medium text-emerald-700">{totalRows}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Prev
        </Button>
        <span className="text-xs text-emerald-600">
          {pageIndex + 1} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
