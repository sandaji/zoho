"use client";

import React, { useState, useEffect } from "react";
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

  const fetchHTML = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sales/documents/${documentId}/pdf`);
      
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

  const handleDownload = async () => {
    setLoading(true);
    try {
      // Fetch HTML
      const response = await fetch(`/api/sales/documents/${documentId}/pdf`);
      
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const html = await response.text();

      // Create a new window and print
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        
        // Wait for content to load then trigger download
        printWindow.onload = () => {
          // Use html2pdf library if available, otherwise use print
          if (typeof (window as any).html2pdf !== "undefined") {
            const opt = {
              margin: 0.5,
              filename: `${documentType}-${documentNumber}.pdf`,
              image: { type: "jpeg", quality: 0.98 },
              html2canvas: { scale: 2 },
              jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
            };
            
            (window as any).html2pdf().set(opt).from(printWindow.document.body).save();
            printWindow.close();
          } else {
            // Fallback to browser print
            toast.info("Opening print dialog. Please save as PDF.");
            printWindow.print();
          }
        };
      }
      
      toast.success("PDF ready for download");
    } catch (error: any) {
      console.error("Error downloading PDF:", error);
      toast.error(error.message || "Failed to download PDF");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sales/documents/${documentId}/pdf`);
      
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const html = await response.text();

      // Open print window
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      
      toast.success("Opening print dialog");
    } catch (error: any) {
      console.error("Error printing:", error);
      toast.error(error.message || "Failed to print");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
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
