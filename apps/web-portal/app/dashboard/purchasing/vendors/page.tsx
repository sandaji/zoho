"use client";

import { useState, useEffect, useMemo } from "react";
import { frontendEnv } from "@/lib/env";
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
import { Plus, Search, Loader2, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useTable, createColumnHelper, type SortingState } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { tableFeaturesConfig, type AppTableFeatures } from "@/lib/table/table-features";

interface Vendor {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  paymentTerms?: string;
  leadTimeDays?: number;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${frontendEnv.NEXT_PUBLIC_API_URL}/v1/purchasing/vendors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setVendors(data.data.vendors);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate vendor "${name}"?`)) return;

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${frontendEnv.NEXT_PUBLIC_API_URL}/v1/purchasing/vendors/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("Vendor deactivated successfully");
        fetchVendors();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to deactivate vendor");
      }
    } catch (error) {
      toast.error("An error occurred while deactivating vendor");
    }
  };

  const filteredVendors = vendors.filter(
    (vendor) =>
      vendor.name.toLowerCase().includes(search.toLowerCase()) ||
      vendor.code.toLowerCase().includes(search.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(search.toLowerCase())
  );

  const columnHelper = useMemo(() => createColumnHelper<AppTableFeatures, Vendor>(), []);
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor((row) => row.code, {
          id: "code",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
          cell: (ctx) => <span className="font-mono text-xs">{ctx.getValue()}</span>,
          sortFn: "text",
        }),
        columnHelper.accessor((row) => row.name, {
          id: "name",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
          cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
          sortFn: "text",
        }),
        columnHelper.accessor((row) => row.email || "", {
          id: "contact",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Contact" />,
          cell: (ctx) => (
            <div>
              <div className="text-sm">{ctx.row.original.email || "N/A"}</div>
              <div className="text-xs text-slate-500">{ctx.row.original.phone}</div>
            </div>
          ),
          sortFn: "text",
        }),
        columnHelper.accessor((row) => row.paymentTerms || "", {
          id: "terms",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Terms" />,
          cell: (ctx) => (
            <Badge variant="outline" className="text-[10px] uppercase font-bold">
              {ctx.getValue().replace(/_/g, " ") || "N/A"}
            </Badge>
          ),
          sortFn: "text",
        }),
        columnHelper.accessor((row) => row.leadTimeDays ?? 7, {
          id: "leadTime",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Lead Time" />,
          cell: (ctx) => <span className="text-sm">{ctx.getValue()} days</span>,
          sortFn: "alphanumeric",
        }),
        columnHelper.accessor((row) => row.isActive, {
          id: "status",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: (ctx) =>
            ctx.getValue() ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-slate-50 text-slate-700">
                Inactive
              </Badge>
            ),
          sortFn: "alphanumeric",
        }),
        columnHelper.display({
          id: "actions",
          header: () => <div className="text-right">Actions</div>,
          enableSorting: false,
          cell: (ctx) => {
            const vendor = ctx.row.original;
            return (
              <div className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <Link href={`/dashboard/purchasing/vendors/${vendor.id}/edit`}>
                      <DropdownMenuItem className="cursor-pointer">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    </Link>
                    {vendor.isActive && (
                      <DropdownMenuItem
                        className="cursor-pointer text-red-600 focus:text-red-600"
                        onClick={() => handleDeactivate(vendor.id, vendor.name)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Deactivate
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          },
        }),
      ]),
    [columnHelper]
  );

  const table = useTable({
    features: tableFeaturesConfig,
    data: filteredVendors,
    columns,
    onSortingChange: setSorting,
    state: { sorting },
  });

  // No pagination is wanted here, so rows are read via getPrePaginatedRowModel()
  // rather than getRowModel() — see the note in lib/table/table-features.ts.
  const rows = table.getPrePaginatedRowModel().rows;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
          <p className="text-slate-500">Manage your suppliers</p>
        </div>
        <Link href="/dashboard/purchasing/vendors/create">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search vendors..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.id === "actions" ? "text-right" : undefined}
                  >
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto" /></TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">No vendors found.</TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
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
