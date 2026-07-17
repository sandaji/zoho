"use client";

import { useState, useRef, useEffect } from "react";
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

interface PDFViewerProps {
  documentId: string;
  documentType: "quote" | "invoice";
  documentNumber: string;
}

export function PDFViewer({
  documentId,
  documentType,
  documentNumber,
}: PDFViewerProps) {
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>("");
  const { token } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  const fetchHTML = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.SALES_DOCUMENT_PDF(documentId)), {
        headers: getAuthHeadersWithToken(token || ""),
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const html = await response.text();
      setHtmlContent(html);
    } catch (error: any) {
      console.error("Error fetching PDF:", error);
      toast.error(error.message || "Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    setPreviewOpen(true);
    if (!htmlContent) {
      await fetchHTML();
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${documentType}-${documentNumber}`,
    onBeforePrint: async () => {
      if (!htmlContent) {
        await fetchHTML();
      }
    },
    onPrintError: (error) => {
      console.error("Print error:", error);
      toast.error("Failed to print");
    },
  });

  const handleDownload = async () => {
    setLoading(true);
    try {
      // Try to download from backend if we have a PDF endpoint
      const response = await fetch(getApiUrl(`${API_ENDPOINTS.SALES_DOCUMENT_PDF(documentId)}?format=pdf`), {
        headers: getAuthHeadersWithToken(token || ""),
      });

      if (response.ok) {
        // Download file if backend provides PDF
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${documentType}-${documentNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("PDF downloaded successfully");
      } else {
        // Fallback to print dialog for saving as PDF
        if (!htmlContent) {
          await fetchHTML();
        }
        handlePrint();
      }
    } catch (error: any) {
      console.error("Error downloading PDF:", error);
      // Fallback to print
      if (!htmlContent) {
        await fetchHTML();
      }
      handlePrint();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      {/* Hidden div for react-to-print */}
      <div style={{ display: "none" }}>
        <div ref={printRef} dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </div>
      
      {/* Preview Button */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            <span className="ml-2">Preview</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {documentType === "quote" ? "Quotation" : "Invoice"} Preview
            </DialogTitle>
            <DialogDescription>
              Document: {documentNumber}
            </DialogDescription>
          </DialogHeader>
          
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          {!loading && htmlContent && (
            <div
              className="border rounded-lg p-4 bg-white"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Download Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span className="ml-2">Download PDF</span>
      </Button>

      {/* Print Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Printer className="h-4 w-4" />
        )}
        <span className="ml-2">Print</span>
      </Button>
    </div>
  );
}
