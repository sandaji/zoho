//frontend/src/app/dashboard/pos/history/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PDFViewer } from "@/components/sales/PDFViewer";
import {
  ArrowLeft,
  Filter,
  FileText,
  FileCheck,
  Receipt,
  FileX,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { useTable, createColumnHelper, type SortingState } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { tableFeaturesConfig, type AppTableFeatures } from "@/lib/table/table-features";

type DocumentType = "ALL" | "DRAFT" | "QUOTE" | "INVOICE" | "CREDIT_NOTE";

interface SalesDocument {
  id: string;
  documentId: string;
  type: DocumentType;
  status: string;
  customerId?: string;
  customer?: {
    name: string;
  };
  total: number;
  balance: number;
  issueDate: string;
  createdAt: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Filters
  const [documentType, setDocumentType] = useState<DocumentType>("ALL");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Data
  const [documents, setDocuments] = useState<SalesDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    return format(new Date(), "yyyy-MM-dd");
  };

  // Set default dates on mount
  useEffect(() => {
    const today = getTodayDate();
    setToDate(today);
    // Default to last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    setFromDate(format(thirtyDaysAgo, "yyyy-MM-dd"));
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchDocuments = async () => {
    if (!user?.branchId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        branchId: user.branchId,
      });

      if (documentType !== "ALL") {
        params.append("type", documentType);
      }

      if (fromDate) {
        params.append("startDate", fromDate);
      }

      if (toDate) {
        params.append("endDate", toDate);
      }

      const response = await fetch(`/api/sales/documents?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setDocuments(result.data.data || []);
        setTotal(result.data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.branchId && fromDate && toDate) {
      fetchDocuments();
    }
  }, [user?.branchId]);

  const handleFilter = () => {
    fetchDocuments();
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "DRAFT":
        return <FileText className="h-4 w-4" />;
      case "QUOTE":
        return <FileCheck className="h-4 w-4" />;
      case "INVOICE":
        return <Receipt className="h-4 w-4" />;
      case "CREDIT_NOTE":
        return <FileX className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline" | "warning"> = {
      DRAFT: "secondary",
      SENT: "default",
      CONVERTED: "secondary",
      PAID: "default",
      UNPAID: "warning",
      VOID: "destructive",
      PARTIALLY_PAID: "warning",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>{status}</Badge>
    );
  };

  const columnHelper = useMemo(() => createColumnHelper<AppTableFeatures, SalesDocument>(), []);
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor((row) => row.type, {
          id: "type",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
          cell: (ctx) => (
            <div className="flex items-center gap-2">
              {getDocumentIcon(ctx.getValue())}
              <span className="text-sm">{ctx.getValue()}</span>
            </div>
          ),
          sortFn: "text",
        }),
        columnHelper.accessor((row) => row.documentId, {
          id: "documentId",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Document #" />,
          cell: (ctx) => <span className="font-mono font-medium">{ctx.getValue()}</span>,
          sortFn: "text",
        }),
        columnHelper.accessor((row) => row.customer?.name || "", {
          id: "customer",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
          cell: (ctx) =>
            ctx.getValue() || <span className="text-muted-foreground">N/A</span>,
          sortFn: "text",
        }),
        columnHelper.accessor((row) => new Date(row.issueDate).getTime(), {
          id: "issueDate",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
          cell: (ctx) => format(new Date(ctx.row.original.issueDate), "MMM dd, yyyy"),
          sortFn: "alphanumeric",
        }),
        columnHelper.accessor((row) => row.total, {
          id: "total",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
          cell: (ctx) => (
            <span className="font-semibold">KES {ctx.getValue().toFixed(2)}</span>
          ),
          sortFn: "alphanumeric",
        }),
        columnHelper.accessor((row) => row.status, {
          id: "status",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: (ctx) => getStatusBadge(ctx.getValue()),
          sortFn: "text",
        }),
        columnHelper.display({
          id: "actions",
          header: () => <div className="text-right">Actions</div>,
          enableSorting: false,
          cell: (ctx) => {
            const doc = ctx.row.original;
            return (
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/pos/documents/${doc.id}`)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {(doc.type === "QUOTE" || doc.type === "INVOICE") && (
                  <PDFViewer
                    documentId={doc.id}
                    documentType={doc.type === "QUOTE" ? "quote" : "invoice"}
                    documentNumber={doc.documentId}
                  />
                )}
              </div>
            );
          },
        }),
      ]),
    [columnHelper]
  );

  const table = useTable({
    features: tableFeaturesConfig,
    data: documents,
    columns,
    onSortingChange: setSorting,
    state: { sorting },
  });

  // No pagination is wanted here, so rows are read via getPrePaginatedRowModel()
  // rather than getRowModel() — see the note in lib/table/table-features.ts.
  const rows = table.getPrePaginatedRowModel().rows;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Transaction History
              </h1>
              <p className="text-sm text-slate-600">
                View and filter your sales documents
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Document Type */}
              <div>
                <Label htmlFor="documentType">Document Type</Label>
                <Select
                  value={documentType}
                  onValueChange={(value) => setDocumentType(value as DocumentType)}
                >
                  <SelectTrigger id="documentType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Transactions</SelectItem>
                    <SelectItem value="DRAFT">Drafts</SelectItem>
                    <SelectItem value="QUOTE">Quotes</SelectItem>
                    <SelectItem value="INVOICE">Invoices</SelectItem>
                    <SelectItem value="CREDIT_NOTE">Credit Notes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* From Date */}
              <div>
                <Label htmlFor="fromDate">From Date</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  max={getTodayDate()}
                />
              </div>

              {/* To Date */}
              <div>
                <Label htmlFor="toDate">To Date</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  max={getTodayDate()}
                />
              </div>

              {/* Filter Button */}
              <div className="flex items-end">
                <Button
                  onClick={handleFilter}
                  disabled={loading}
                  className="w-full"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  {loading ? "Loading..." : "Apply Filters"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>
              {total} Document{total !== 1 ? "s" : ""} Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No documents found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters or date range
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
