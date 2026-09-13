"use client";

import React, { useMemo, useState } from "react";
import {
  useTable,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { tableFeaturesConfig, type AppTableFeatures } from "@/lib/table/table-features";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

// Public API is unchanged from the pre-TanStack version of this component —
// every existing call site (ProductsSection, UsersSection, RolesSection, etc.)
// keeps working with zero changes.
export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
}

interface AdminTableProps<T> {
  title: string;
  data: T[];
  columns: Column<T>[];
  searchKeys: (keyof T | string)[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  actions?: (row: T) => React.ReactNode;
  /** Optional action(s) rendered in the header, next to the search box (e.g. a "Create X" button). */
  headerActions?: React.ReactNode;
  pageSize?: number;
  emptyText?: string;
}

function getValueByPath<T extends Record<string, any>>(obj: T, path: string) {
  return path.split(".").reduce((acc: any, key) => acc?.[key], obj);
}

export function AdminTable<T extends Record<string, any>>({
  title,
  data,
  columns,
  searchKeys,
  onRowClick,
  loading = false,
  actions,
  headerActions,
  pageSize = 10,
  emptyText = "No data available",
}: AdminTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const safeData = Array.isArray(data) ? data : [];

  // Search stays a pre-filter over the raw data rather than a TanStack
  // column filter: searchKeys can reference dotted paths ("branch.name",
  // "_count.permissions") that don't map 1:1 onto a single column, so this
  // preserves the exact multi-key search behavior the old implementation had.
  const filteredData = useMemo(() => {
    if (!search) return safeData;
    const q = search.toLowerCase();
    return safeData.filter((row) =>
      searchKeys.some((key) => {
        const value = typeof key === "string" ? getValueByPath(row, key) : (row as any)[key];
        return value != null && String(value).toLowerCase().includes(q);
      })
    );
  }, [safeData, search, searchKeys]);

  const columnHelper = useMemo(() => createColumnHelper<AppTableFeatures, T>(), []);

  // Map of tanstack column id -> original Column<T> definition, so we can
  // still apply per-column `className` the way the old TableCell did.
  const columnMetaById = useMemo(() => {
    const map = new Map<string, Column<T>>();
    columns.forEach((col) => map.set(String(col.key), col));
    return map;
  }, [columns]);

  const tanstackColumns = useMemo(() => {
    const accessorCols = columns.map((col) => {
      const key = String(col.key);
      return columnHelper.accessor(
        (row) => (key.includes(".") ? getValueByPath(row, key) : (row as any)[col.key]),
        {
          id: key,
          header: col.label,
          cell: (ctx) =>
            col.render ? col.render(ctx.getValue(), ctx.row.original) : ctx.getValue(),
          sortFn: "alphanumeric",
        }
      );
    });

    const actionsCol = actions
      ? columnHelper.display({
          id: "__actions",
          header: () => <div className="text-right">Actions</div>,
          enableSorting: false,
          cell: (ctx) => (
            <div className="text-right" onClick={(e) => e.stopPropagation()}>
              {actions(ctx.row.original)}
            </div>
          ),
        })
      : null;

    // A single array expression (spread + conditional spread) instead of a
    // ternary between two differently-typed arrays — that ternary shape was
    // what confused TS's overload resolution for columnHelper.columns() and
    // made it reject the display column.
    return columnHelper.columns([...accessorCols, ...(actionsCol ? [actionsCol] : [])]);
  }, [columns, actions, columnHelper]);

  const table = useTable({
    features: tableFeaturesConfig,
    data: filteredData,
    columns: tanstackColumns,
    onSortingChange: setSorting,
    state: { sorting },
    initialState: { pagination: { pageIndex: 0, pageSize } },
  });

  if (loading) {
    return (
      <Card className="rounded-xl border border-emerald-100 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm text-emerald-900">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-emerald-50" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border border-emerald-100 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-sm font-bold text-emerald-900">{title}</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative w-60">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-emerald-400" />
              <Input
                placeholder="Search…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  table.setPageIndex(0);
                }}
                className="h-9 border-emerald-200 pl-8 text-sm focus-visible:ring-emerald-500"
                aria-label="Search table"
              />
            </div>
            {headerActions}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredData.length === 0 ? (
          <div className="py-12 text-center text-sm text-emerald-400">
            {search ? "No results found" : emptyText}
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-emerald-100 overflow-hidden">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow
                      key={headerGroup.id}
                      className="border-emerald-100 bg-emerald-50/70 hover:bg-emerald-50/70"
                    >
                      {headerGroup.headers.map((header) => {
                        const sorted = header.column.getIsSorted();
                        return (
                          <TableHead
                            key={header.id}
                            className={cn(
                              "text-xs font-semibold uppercase tracking-wide text-emerald-600",
                              header.column.getCanSort() && "cursor-pointer select-none"
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {header.isPlaceholder ? null : (
                              <div className="flex items-center gap-1">
                                <table.FlexRender header={header} />
                                {header.column.getCanSort() &&
                                  (sorted === "asc" ? (
                                    <ArrowUp className="h-3 w-3" />
                                  ) : sorted === "desc" ? (
                                    <ArrowDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronsUpDown className="h-3 w-3 opacity-40" />
                                  ))}
                              </div>
                            )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>

                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "border-emerald-50 transition-colors",
                        onRowClick ? "cursor-pointer hover:bg-emerald-50/60" : "hover:bg-emerald-50/40"
                      )}
                      onClick={() => onRowClick?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const meta = columnMetaById.get(cell.column.id);
                        return (
                          <TableCell
                            key={cell.id}
                            className={cn("text-sm text-slate-700", meta?.className)}
                          >
                            <table.FlexRender cell={cell} />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DataTablePagination table={table} totalRows={filteredData.length} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
