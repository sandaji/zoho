"use client";

import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

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
  pageSize = 10,
  emptyText = "No data available",
}: AdminTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filteredData = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((key) => {
        const value =
          typeof key === "string" ? getValueByPath(row, key) : (row as any)[key];
        return value != null && String(value).toLowerCase().includes(q);
      })
    );
  }, [data, search, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = useMemo(
    () => filteredData.slice(startIndex, startIndex + pageSize),
    [filteredData, startIndex, pageSize]
  );

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
          <div className="relative w-60">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-emerald-400" />
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-9 border-emerald-200 pl-8 text-sm focus-visible:ring-emerald-500"
              aria-label="Search table"
            />
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
                  <TableRow className="border-emerald-100 bg-emerald-50/70 hover:bg-emerald-50/70">
                    {columns.map((col) => (
                      <TableHead
                        key={String(col.key)}
                        className="text-xs font-semibold uppercase tracking-wide text-emerald-600"
                      >
                        {col.label}
                      </TableHead>
                    ))}
                    {actions && (
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-emerald-600">
                        Actions
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedData.map((row, rowIndex) => (
                    <TableRow
                      key={rowIndex}
                      className={`border-emerald-50 transition-colors ${onRowClick
                          ? "cursor-pointer hover:bg-emerald-50/60"
                          : "hover:bg-emerald-50/40"
                        }`}
                      onClick={() => onRowClick?.(row)}
                    >
                      {columns.map((col) => {
                        const key = String(col.key);
                        const value = key.includes(".")
                          ? getValueByPath(row, key)
                          : (row as any)[col.key];
                        return (
                          <TableCell
                            key={key}
                            className={`text-sm text-slate-700 ${col.className ?? ""}`}
                          >
                            {col.render ? col.render(value, row) : value}
                          </TableCell>
                        );
                      })}
                      {actions && (
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {actions(row)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-emerald-500">
                  Showing {startIndex + 1}–
                  {Math.min(startIndex + pageSize, filteredData.length)} of{" "}
                  {filteredData.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  >
                    <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Prev
                  </Button>
                  <span className="text-xs text-emerald-600">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  >
                    Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
