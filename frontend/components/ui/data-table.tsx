/**
 * Data Table Component - Simple table for displaying inventory
 * Provides sorting, filtering, column selection, and pagination
 */

import * as React from "react";
import {
  MdUnfoldMore,
  MdNavigateBefore,
  MdNavigateNext,
  MdFirstPage,
  MdLastPage,
} from "react-icons/md";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  pageSize = 10,
  onRowClick,
  isLoading = false,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = React.useState(0);
  const [sortColumn, setSortColumn] = React.useState<keyof T | null>(null);
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (typeof aVal === "string") return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      if (typeof aVal === "number")  return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      return 0;
    });
  }, [data, sortColumn, sortOrder]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
    setCurrentPage(0);
  };

  const paginationBtnClass =
    "h-8 w-8 p-0 rounded-md border border-border bg-card hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-muted-foreground";

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted">
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={cn(
                      "h-10 px-4 text-left align-middle font-semibold text-muted-foreground text-[10px] uppercase tracking-wide",
                      column.width && `w-[${column.width}]`
                    )}
                  >
                    {column.sortable ? (
                      <button
                        onClick={() => handleSort(column.key)}
                        className="flex items-center gap-1 cursor-pointer select-none hover:text-foreground transition-colors"
                      >
                        {column.label}
                        <MdUnfoldMore className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center text-muted-foreground text-sm">
                    Loading...
                  </td>
                </tr>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((row: any, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-border transition-colors hover:bg-accent/50 cursor-pointer"
                    onClick={() => onRowClick && onRowClick(row)}
                  >
                    {columns.map((column) => (
                      <td
                        key={String(column.key)}
                        className={cn(
                          "px-4 py-2.5 align-middle text-sm text-foreground",
                          column.width && `w-[${column.width}]`
                        )}
                      >
                        {column.render ? column.render(row[column.key]) : row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center text-muted-foreground text-sm">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-1">
        <div className="text-xs text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">{currentPage * pageSize + 1}</span>
          {" "}–{" "}
          <span className="font-medium text-foreground">
            {Math.min((currentPage + 1) * pageSize, sortedData.length)}
          </span>{" "}
          of{" "}
          <span className="font-medium text-foreground">{sortedData.length}</span>
        </div>

        <div className="flex gap-1.5">
          <button onClick={() => setCurrentPage(0)} disabled={currentPage === 0} className={paginationBtnClass} title="First page">
            <MdFirstPage className="h-4 w-4" />
          </button>
          <button onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0} className={paginationBtnClass} title="Previous page">
            <MdNavigateBefore className="h-4 w-4" />
          </button>
          <div className="h-8 px-2.5 flex items-center text-xs text-muted-foreground border border-border rounded-md bg-card">
            {currentPage + 1} / {totalPages || 1}
          </div>
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1} className={paginationBtnClass} title="Next page">
            <MdNavigateNext className="h-4 w-4" />
          </button>
          <button onClick={() => setCurrentPage(totalPages - 1)} disabled={currentPage >= totalPages - 1} className={paginationBtnClass} title="Last page">
            <MdLastPage className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export type { DataTableProps };
