// frontend/src/app/dashboard/pos/documents/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getApiUrl, API_ENDPOINTS, getAuthHeaders } from "@/lib/api-config";
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
import {
  ArrowLeft,
  FileText,
  Loader2,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Hash,
} from "lucide-react";
import { format } from "date-fns";
import { PDFViewer } from "@/components/sales/PDFViewer";

// ─── Status badge styling: works cleanly in both light & dark modes ───────────
const STATUS_STYLES: Record<string, { className: string; icon: any; label: string }> = {
  DRAFT: {
    className: "bg-success-muted text-success border-success-border",
    icon: FileText,
    label: "Draft",
  },
  SENT: {
    className: "bg-primary/10 text-primary border-primary/20",
    icon: Clock,
    label: "Sent",
  },
  CONVERTED: {
    className: "bg-primary/10 text-primary border-primary/20",
    icon: CheckCircle2,
    label: "Converted",
  },
  PAID: {
    className: "bg-success-muted text-success border-success-border",
    icon: CheckCircle2,
    label: "Paid",
  },
  UNPAID: {
    className: "bg-warning-muted text-warning border-warning-border",
    icon: AlertCircle,
    label: "Unpaid",
  },
  PARTIALLY_PAID: {
    className: "bg-warning-muted text-warning border-warning-border",
    icon: AlertCircle,
    label: "Partially Paid",
  },
  VOID: {
    className: "bg-destructive/10 text-destructive border-destructive/20",
    icon: XCircle,
    label: "Void",
  },
};

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
      const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
      if (!rawId) return;
      const response = await fetch(getApiUrl(API_ENDPOINTS.SALES_DOCUMENT_BY_ID(rawId)), {
        headers: getAuthHeaders(),
      });
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

  const renderStatusBadge = (status: string) => {
    const config = STATUS_STYLES[status] || {
      className: "bg-muted text-muted-foreground border-border",
      icon: FileText,
      label: status,
    };
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`gap-1.5 border font-medium ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (isLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
            <Loader2 className="relative h-12 w-12 animate-spin text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  // ─── Not-found state ───────────────────────────────────────────────────────
  if (!document) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full border-border bg-card">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Document not found
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              The document you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const itemCount = document.items?.length || 0;
  const currency = (value: number) =>
    `KES ${Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const title = document.type === "QUOTE" ? "Quotation" : document.type.replace("_", " ");
  const salesperson = document.createdBy?.name || "—";

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => router.back()} className="hover:text-foreground">Sales</button>
          <span>/</span><span>{title}s</span><span>/</span>
          <span className="text-foreground">{document.documentId}</span>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {title} #{document.documentId}
              </h1>
              {renderStatusBadge(document.status)}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">View and manage this sales document</p>
          </div>
          <Button variant="outline" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
          <div className="space-y-5">
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="grid gap-6 p-5 md:grid-cols-2 md:p-6">
                <section className="space-y-4">
                  <h2 className="font-semibold text-foreground">{title} Details</h2>
                  <DetailLine label="Document No." value={document.documentId} icon={Hash} />
                  <DetailLine label="Date" value={format(new Date(document.issueDate), "dd MMM yyyy")} icon={Calendar} />
                  <DetailLine label="Salesperson" value={salesperson} icon={User} />
                </section>
                <section className="space-y-4 border-t border-border pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                  <h2 className="font-semibold text-foreground">Customer Details</h2>
                  <DetailLine label="Customer Name" value={document.customer?.name || "Walk-in customer"} icon={User} />
                  {document.customer?.phone && <DetailLine label="Phone" value={document.customer.phone} icon={Phone} />}
                  {document.customer?.email && <DetailLine label="Email" value={document.customer.email} icon={Mail} />}
                  {document.customer?.address && <DetailLine label="Address" value={document.customer.address} icon={MapPin} />}
                </section>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-border bg-card shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/40 px-5 py-4">
                <CardTitle className="flex items-center gap-2 text-base"><Package className="h-4 w-4 text-primary" /> Items</CardTitle>
                <Badge variant="secondary">{itemCount} {itemCount === 1 ? "item" : "items"}</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-12">#</TableHead><TableHead>Item Code</TableHead><TableHead>Item Name</TableHead>
                      <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">VAT (%)</TableHead><TableHead className="text-right">Amount (KES)</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {document.items?.map((item: any, index: number) => (
                        <TableRow key={item.id || index}>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{item.product?.sku || item.product?.code || "—"}</TableCell>
                          <TableCell className="font-medium text-foreground">{item.description || item.product?.name || "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                          <TableCell className="text-right tabular-nums">{Number(item.unitPrice || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right tabular-nums">{Number(item.taxRate || 0)}%</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{Number(item.total || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))}
                      {itemCount === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No items on this document.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <div className="grid gap-6 border-t border-border p-5 md:grid-cols-2 md:p-6">
                <section>
                  <h3 className="mb-3 font-semibold text-foreground">Notes</h3>
                  <p className="min-h-24 whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">{document.notes || "No additional notes."}</p>
                </section>
                <section className="space-y-3 self-end">
                  <AmountLine label="Subtotal" value={currency(document.subtotal)} />
                  {Number(document.discount) > 0 && <AmountLine label="Discount" value={`− ${currency(document.discount)}`} />}
                  <AmountLine label="VAT" value={currency(document.tax)} />
                  <div className="flex items-center justify-between rounded-md bg-primary px-4 py-3 text-primary-foreground">
                    <span className="font-semibold">Grand Total</span><span className="text-lg font-bold tabular-nums">{currency(document.total)}</span>
                  </div>
                  {document.type === "INVOICE" && <div className="space-y-2 border-t border-border pt-3">
                    <AmountLine label="Paid" value={currency(document.paidAmount)} />
                    <AmountLine label="Balance" value={currency(document.balance)} />
                  </div>}
                </section>
              </div>
            </Card>
          </div>

          <aside className="space-y-5">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border pb-3"><CardTitle className="text-base">Document Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2 p-4">
                {(document.type === "QUOTE" || document.type === "INVOICE") ? <PDFViewer
                  documentId={document.id}
                  documentType={document.type === "QUOTE" ? "quote" : "invoice"}
                  documentNumber={document.documentId}
                  layout="stack"
                /> : <p className="text-sm text-muted-foreground">No document actions available.</p>}
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border pb-3"><CardTitle className="text-base">Quick Info</CardTitle></CardHeader>
              <CardContent className="space-y-4 p-4">
                <QuickInfo label="Document No." value={document.documentId} />
                <QuickInfo label="Date" value={format(new Date(document.issueDate), "dd MMM yyyy")} />
                <QuickInfo label="Salesperson" value={salesperson} />
                <QuickInfo label="Customer" value={document.customer?.name || "Walk-in customer"} />
                {document.customer?.phone && <QuickInfo label="Phone" value={document.customer.phone} />}
                <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Status</span>{renderStatusBadge(document.status)}</div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}

function DetailLine({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return <div className="space-y-1.5"><p className="text-xs font-medium text-muted-foreground">{label}</p><div className="flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-foreground"><Icon className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{value}</span></div></div>;
}

function AmountLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted-foreground">{label}</span><span className="font-medium tabular-nums text-foreground">{value}</span></div>;
}

function QuickInfo({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium text-foreground">{value}</span></div>;
}
