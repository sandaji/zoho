"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, Eye, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getApiUrl, API_ENDPOINTS } from "@/lib/api-config";
import { getAuthHeadersWithToken } from "@/lib/api-utils";
import { useAuth } from "@/lib/auth-context";
import { useReactToPrint } from "react-to-print";
import { cn } from "@/lib/utils";

interface PDFViewerProps {
  documentId: string;
  documentType: "quote" | "invoice";
  documentNumber: string;
  layout?: "row" | "stack";
}

export function PDFViewer({
  documentId,
  documentType,
  documentNumber,
  layout = "row",
}: PDFViewerProps) {
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>("");
  const { token } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  const fetchHTML = useCallback(async (): Promise<string | null> => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.SALES_DOCUMENT_PDF(documentId)), {
        headers: getAuthHeadersWithToken(token || ""),
      });
      if (!response.ok) throw new Error("Failed to generate document");
      const html = await response.text();
      setHtmlContent(html);
      return html;
    } catch (error: any) {
      console.error("Error fetching PDF:", error);
      toast.error(error.message || "Failed to generate document");
      return null;
    } finally {
      setLoading(false);
    }
  }, [documentId, token]);

  const handlePreview = async () => {
    setPreviewOpen(true);
    if (!htmlContent) await fetchHTML();
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${documentType}-${documentNumber}`,
    onBeforePrint: async () => {
      if (!htmlContent) {
        const html = await fetchHTML();
        if (!html) throw new Error("No content to print");
        await new Promise((r) => setTimeout(r, 50));
      }
    },
    onPrintError: (loc, err) => {
      console.error("Print error:", loc, err);
      toast.error("Failed to print");
    },
  });

  const handleDownload = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        getApiUrl(`${API_ENDPOINTS.SALES_DOCUMENT_PDF(documentId)}?format=pdf`),
        { headers: getAuthHeadersWithToken(token || "") }
      );
      const contentType = response.headers.get("content-type") || "";
      const isRealPdf = response.ok && contentType.includes("application/pdf");

      if (isRealPdf) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${documentType}-${documentNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success("PDF downloaded successfully");
        return;
      }

      if (!htmlContent) {
        const html = await fetchHTML();
        if (!html) return;
        await new Promise((r) => setTimeout(r, 50));
      }
      handlePrint();
    } catch (error: any) {
      console.error("Error downloading PDF:", error);
      if (!htmlContent) {
        const html = await fetchHTML();
        if (!html) return;
        await new Promise((r) => setTimeout(r, 50));
      }
      handlePrint();
    } finally {
      setLoading(false);
    }
  };

  const isStack = layout === "stack";

  return (
    <div
      className={cn(
        "flex gap-2",
        // For row: force single line (no wrap) + center vertically
        isStack ? "flex-col w-full" : "flex-nowrap items-center"
      )}
    >
      {/* Hidden print target */}
      <div className="hidden" aria-hidden="true">
        <div ref={printRef} dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </div>

      {/* Preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={loading}
            className={cn("shrink-0", isStack && "w-full justify-start")}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            <span className="ml-2">Preview</span>
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{documentType === "quote" ? "Quotation" : "Invoice"} Preview</DialogTitle>
            <DialogDescription>Document: {documentNumber}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {!loading && htmlContent && (
              <div
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-4"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            )}
            {!loading && !htmlContent && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No preview available.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Download */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={loading}
        className={cn("shrink-0", isStack && "w-full justify-start")}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        <span className="ml-2">Download PDF</span>
      </Button>

      {/* Print */}
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        disabled={loading}
        className={cn("shrink-0", isStack && "w-full justify-start")}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
        <span className="ml-2">Print</span>
      </Button>
    </div>
  );
}
