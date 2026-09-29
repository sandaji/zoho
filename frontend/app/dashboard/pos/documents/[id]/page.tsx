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
  Receipt,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Building2,
  Hash,
} from "lucide-react";
import { format } from "date-fns";
import { PDFViewer } from "@/components/sales/PDFViewer";

// ─── Status badge styling: works cleanly in both light & dark modes ───────────
const STATUS_STYLES: Record<string, { className: string; icon: any; label: string }> = {
  DRAFT: {
    className:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    icon: FileText,
    label: "Draft",
  },
  SENT: {
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
    icon: Clock,
    label: "Sent",
  },
  CONVERTED: {
    className:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800",
    icon: CheckCircle2,
    label: "Converted",
  },
  PAID: {
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    icon: CheckCircle2,
    label: "Paid",
  },
  UNPAID: {
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
    icon: AlertCircle,
    label: "Unpaid",
  },
  PARTIALLY_PAID: {
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
    icon: AlertCircle,
    label: "Partially Paid",
  },
  VOID: {
    className:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
    icon: XCircle,
    label: "Void",
  },
};

const DOC_TYPE_STYLES: Record<string, string> = {
  QUOTE:
    "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800",
  INVOICE:
    "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800",
  CREDIT_NOTE:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800",
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
      className:
        "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
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

  const renderDocTypeBadge = (type: string) => {
    const className =
      DOC_TYPE_STYLES[type] ||
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    return (
      <Badge variant="outline" className={`border font-medium ${className}`}>
        {type.replace("_", " ")}
      </Badge>
    );
  };

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (isLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl" />
            <Loader2 className="relative h-12 w-12 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading document...</p>
        </div>
      </div>
    );
  }

  // ─── Not-found state ───────────────────────────────────────────────────────
  if (!document) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <Card className="max-w-md w-full border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-4 mb-4">
              <FileText className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Document not found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* ─── Sticky Header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900">
                  <Receipt className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {document.type} Details
                    </h1>
                    {renderDocTypeBadge(document.type)}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {document.documentId}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {renderStatusBadge(document.status)}
              {(document.type === "QUOTE" || document.type === "INVOICE") && (
                <PDFViewer
                  documentId={document.id}
                  documentType={document.type === "QUOTE" ? "quote" : "invoice"}
                  documentNumber={document.documentId}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content ──────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Items + Notes (main content) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items Card */}
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Items
                    </CardTitle>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-0"
                  >
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
                        <TableHead className="w-12 text-slate-500 dark:text-slate-400 font-medium">
                          #
                        </TableHead>
                        <TableHead className="text-slate-500 dark:text-slate-400 font-medium">
                          Code
                        </TableHead>
                        <TableHead className="text-slate-500 dark:text-slate-400 font-medium">
                          Description
                        </TableHead>
                        <TableHead className="text-right text-slate-500 dark:text-slate-400 font-medium">
                          Qty
                        </TableHead>
                        <TableHead className="text-right text-slate-500 dark:text-slate-400 font-medium">
                          Unit Price
                        </TableHead>
                        <TableHead className="text-right text-slate-500 dark:text-slate-400 font-medium">
                          Amount
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {document.items.map((item: any, index: number) => (
                        <TableRow
                          key={item.id}
                          className="border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <TableCell className="text-slate-400 dark:text-slate-500 font-mono text-xs">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                            {item.product?.sku || "—"}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                            {item.description}
                          </TableCell>
                          <TableCell className="text-right text-slate-700 dark:text-slate-300">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right text-slate-700 dark:text-slate-300 tabular-nums">
                            {item.unitPrice.toLocaleString("en-KE", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                            {item.total.toLocaleString("en-KE", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Notes Card */}
            {document.notes && (
              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {document.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Summary + Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Summary Card */}
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                    KES{" "}
                    {document.subtotal.toLocaleString("en-KE", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {document.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Discount</span>
                    <span className="font-medium text-rose-600 dark:text-rose-400 tabular-nums">
                      − KES{" "}
                      {document.discount.toLocaleString("en-KE", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">VAT (16%)</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                    KES{" "}
                    {document.tax.toLocaleString("en-KE", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Total
                    </span>
                    <span className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      KES{" "}
                      {document.total.toLocaleString("en-KE", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                {document.type === "INVOICE" && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Paid
                      </span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                        KES{" "}
                        {(document.paidAmount || 0).toLocaleString("en-KE", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                        Balance
                      </span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                        KES{" "}
                        {document.balance.toLocaleString("en-KE", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Document Info Card */}
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Document Info
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <InfoRow icon={Hash} label="Document ID" value={document.documentId} mono />
                <InfoRow
                  icon={Calendar}
                  label="Issue Date"
                  value={format(new Date(document.issueDate), "MMM dd, yyyy")}
                />
                {document.dueDate && (
                  <InfoRow
                    icon={Clock}
                    label="Due Date"
                    value={format(new Date(document.dueDate), "MMM dd, yyyy")}
                  />
                )}
              </CardContent>
            </Card>

            {/* Customer Info Card */}
            {document.customer && (
              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    Customer
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  <InfoRow icon={User} label="Name" value={document.customer.name} />
                  {document.customer.email && (
                    <InfoRow icon={Mail} label="Email" value={document.customer.email} />
                  )}
                  {document.customer.phone && (
                    <InfoRow icon={Phone} label="Phone" value={document.customer.phone} />
                  )}
                  {document.customer.address && (
                    <InfoRow icon={MapPin} label="Address" value={document.customer.address} />
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable info row component ─────────────────────────────────────────────
function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
        <Icon className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p
          className={`mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100 break-words ${
            mono ? "font-mono" : ""
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
