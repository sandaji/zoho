"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { PDFViewer } from "@/components/sales/PDFViewer";

export default function DocumentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, isLoading } = useAuth();
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (params?.id) {
      fetchDocument();
    }
  }, [params?.id]);

  const fetchDocument = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sales/documents/${params.id}`);
      const result = await response.json();

      if (result.success) {
        setDocument(result.data);
      }
    } catch (error) {
      console.error("Error fetching document:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline" | "warning"
    > = {
      DRAFT: "secondary",
      SENT: "default",
      CONVERTED: "secondary",
      PAID: "default",
      UNPAID: "warning",
      VOID: "destructive",
      PARTIALLY_PAID: "warning",
    };

    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  if (isLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Document not found</h3>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
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
                {document.type} Details
              </h1>
              <p className="text-sm text-slate-600">
                Document: {document.documentId}
              </p>
            </div>
          </div>

          {/* Actions */}
          {(document.type === "QUOTE" || document.type === "INVOICE") && (
            <PDFViewer
              documentId={document.id}
              documentType={document.type === "QUOTE" ? "quote" : "invoice"}
              documentNumber={document.documentId}
            />
          )}
        </div>

        {/* Document Information */}
        <Card>
          <CardHeader>
            <CardTitle>Document Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Type
                </label>
                <div className="mt-1 font-semibold">{document.type}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Status
                </label>
                <div className="mt-1">{getStatusBadge(document.status)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Issue Date
                </label>
                <div className="mt-1">
                  {format(new Date(document.issueDate), "MMM dd, yyyy")}
                </div>
              </div>
              {document.dueDate && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Due Date
                  </label>
                  <div className="mt-1">
                    {format(new Date(document.dueDate), "MMM dd, yyyy")}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        {document.customer && (
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Name
                  </label>
                  <div className="mt-1">{document.customer.name}</div>
                </div>
                {document.customer.email && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Email
                    </label>
                    <div className="mt-1">{document.customer.email}</div>
                  </div>
                )}
                {document.customer.phone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Phone
                    </label>
                    <div className="mt-1">{document.customer.phone}</div>
                  </div>
                )}
                {document.customer.address && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Address
                    </label>
                    <div className="mt-1">{document.customer.address}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S.No</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {document.items.map((item: any, index: number) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-mono">
                      {item.product?.sku || "N/A"}
                    </TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      KES {item.unitPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      KES {item.total.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>KES {document.subtotal.toFixed(2)}</span>
              </div>
              {document.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span>- KES {document.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>VAT (16%):</span>
                <span>KES {document.tax.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>KES {document.total.toFixed(2)}</span>
              </div>
              {document.type === "INVOICE" && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span>Paid:</span>
                    <span>KES {(document.paidAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-semibold">
                    <span>Balance:</span>
                    <span>KES {document.balance.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {document.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{document.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
