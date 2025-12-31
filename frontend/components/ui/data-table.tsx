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

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (typeof aVal === "string") {
        return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }, [data, sortColumn, sortOrder]);

  // Paginate data
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

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={cn(
                      "h-12 px-4 text-left align-middle font-medium text-slate-700",
                      column.width && `w-[${column.width}]`
                    )}
                  >
                    {column.sortable ? (
                      <button
                        onClick={() => handleSort(column.key)}
                        className="flex items-center gap-2 cursor-pointer select-none hover:text-slate-900"
                      >
                        {column.label}
                        <MdUnfoldMore className="h-4 w-4 text-slate-400" />
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
                  <td colSpan={columns.length} className="h-24 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((row: any, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-200 transition-colors hover:bg-slate-50 cursor-pointer"
                    onClick={() => onRowClick && onRowClick(row)}
                  >
                    {columns.map((column) => (
                      <td
                        key={String(column.key)}
                        className={cn(
                          "p-4 align-middle text-sm text-slate-900",
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
                  <td colSpan={columns.length} className="h-24 text-center text-slate-500">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-slate-600">
          Showing <span className="font-medium">{currentPage * pageSize + 1}</span> to{" "}
          <span className="font-medium">
            {Math.min((currentPage + 1) * pageSize, sortedData.length)}
          </span>{" "}
          of <span className="font-medium">{sortedData.length}</span> results
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(0)}
            disabled={currentPage === 0}
            className="h-8 w-8 p-0 rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            title="First page"
          >
            <MdFirstPage className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="h-8 w-8 p-0 rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            title="Previous page"
          >
            <MdNavigateBefore className="h-4 w-4" />
          </button>
          <div className="h-8 px-2 flex items-center text-sm text-slate-600 border border-slate-200 rounded-md">
            Page {currentPage + 1} of {totalPages || 1}
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage >= totalPages - 1}
            className="h-8 w-8 p-0 rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            title="Next page"
          >
            <MdNavigateNext className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages - 1)}
            disabled={currentPage >= totalPages - 1}
            className="h-8 w-8 p-0 rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            title="Last page"
          >
            <MdLastPage className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export type { DataTableProps };
