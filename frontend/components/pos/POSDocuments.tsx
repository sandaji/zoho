"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Plus, Search, Eye, RefreshCw, ArrowRight } from "lucide-react";
import { getApiUrl, API_ENDPOINTS, getAuthHeaders } from "@/lib/api-config";

interface SalesDocument {
  id: string;
  documentId: string;
  type: "DRAFT" | "QUOTE" | "INVOICE" | "CREDIT_NOTE";
  status: string;
  customerId?: string;
  customer?: { name: string };
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  issueDate: string;
  createdAt: string;
}

interface POSDocumentsProps {
  branchId: string;
}

const typeColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  QUOTE: "bg-blue-100 text-blue-800",
  INVOICE: "bg-green-100 text-green-800",
  CREDIT_NOTE: "bg-orange-100 text-orange-800",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  CONVERTED: "bg-purple-100 text-purple-700",
  PAID: "bg-green-100 text-green-700",
  VOID: "bg-red-100 text-red-700",
};

export function POSDocuments({ branchId }: POSDocumentsProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [documents, setDocuments] = useState<SalesDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, [branchId, typeFilter, statusFilter]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (branchId) params.append("branchId", branchId);
      if (typeFilter !== "ALL") params.append("type", typeFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      params.append("limit", "50");

      const res = await fetch(
        `${getApiUrl(API_ENDPOINTS.SALES_DOCUMENTS)}?${params.toString()}`,
        { headers: getAuthHeaders() }
      );

      const json = await res.json();

      if (json.success && json.data) {
        setDocuments(json.data.data || []);
      }
    } catch (err) {
      toast("Failed to load documents", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleNewDocument = () => {
    router.push("/dashboard/pos/documents/new");
  };

  const handleViewDocument = (id: string) => {
    router.push(`/dashboard/pos/documents/${id}`);
  };

  const handleConvertToInvoice = async (id: string) => {
    try {
      const res = await fetch(
        getApiUrl(API_ENDPOINTS.SALES_DOCUMENT_CONVERT(id)),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ type: "INVOICE" }),
        }
      );

      const json = await res.json();

      if (json.success) {
        toast("Document converted to invoice", "success");
        fetchDocuments();
      } else {
        toast(json.error || "Conversion failed", "error");
      }
    } catch (err) {
      toast("Conversion failed", "error");
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.documentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Sales Documents
          </CardTitle>
          <Button
            onClick={handleNewDocument}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New Document
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by document ID or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Document Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="QUOTE">Quote</SelectItem>
              <SelectItem value="INVOICE">Invoice</SelectItem>
              <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="CONVERTED">Converted</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="VOID">Void</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchDocuments}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Documents Table */}
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
            <FileText className="mb-2 h-10 w-10 opacity-50" />
            <p>No documents found</p>
            <Button
              variant="link"
              onClick={handleNewDocument}
              className="mt-2"
            >
              Create your first document
            </Button>
          </div>
        ) : (
          <div className="overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Document ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono font-medium">
                      {doc.documentId}
                    </TableCell>
                    <TableCell>
                      <Badge className={typeColors[doc.type]} variant="outline">
                        {doc.type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[doc.status]} variant="outline">
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {doc.customer?.name || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      KES {doc.total.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(doc.issueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDocument(doc.id)}
                          className="gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        {(doc.type === "DRAFT" || doc.type === "QUOTE") &&
                          doc.status !== "CONVERTED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConvertToInvoice(doc.id)}
                              className="gap-1"
                            >
                              <ArrowRight className="h-4 w-4" />
                              Invoice
                            </Button>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
