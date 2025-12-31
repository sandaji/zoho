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
  key: keyof T | string; // supports dot-notation
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

interface AdminTableProps<T> {
  title: string;
  data: T[];
  columns: Column<T>[];
  searchKeys: (keyof T | string)[]; // supports dot-notation
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

  // -----------------------------
  // Filtering (memoized)
  // -----------------------------
  const filteredData = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();

    return data.filter((row) =>
      searchKeys.some((key) => {
        const value = typeof key === "string" ? getValueByPath(row, key) : (row as any)[key];
        return value != null && String(value).toLowerCase().includes(q);
      })
    );
  }, [data, search, searchKeys]);

  // -----------------------------
  // Pagination (memoized)
  // -----------------------------
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  const paginatedData = useMemo(
    () => filteredData.slice(startIndex, startIndex + pageSize),
    [filteredData, startIndex, pageSize]
  );

  // -----------------------------
  // Loading Skeleton
  // -----------------------------
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: pageSize }).map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>{title}</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8"
              aria-label="Search table"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {search ? "No results found" : emptyText}
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead key={String(column.key)}>{column.label}</TableHead>
                    ))}
                    {actions && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedData.map((row, rowIndex) => (
                    <TableRow
                      key={rowIndex}
                      className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                      onClick={() => onRowClick?.(row)}
                    >
                      {columns.map((column) => {
                        const key = String(column.key);
                        const value = key.includes(".")
                          ? getValueByPath(row, key)
                          : (row as any)[column.key];

                        return (
                          <TableCell key={key} className={column.className}>
                            {column.render ? column.render(value, row) : value}
                          </TableCell>
                        );
                      })}

                      {actions && (
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()} // prevent row click
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
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}–{Math.min(startIndex + pageSize, filteredData.length)} of{" "}
                  {filteredData.length}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
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
