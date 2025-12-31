"use client";

import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, Printer, Plus } from "lucide-react";

interface PostSaleSuccessModalProps {
  isOpen: boolean;
  saleId: string;
  invoiceNo: string;
  amountPaid: number;
  paymentMethod: string;
  onNewSale: () => void;
}

export function PostSaleSuccessModal({
  isOpen,
  saleId,
  invoiceNo,
  amountPaid,
  paymentMethod,
  onNewSale,
}: PostSaleSuccessModalProps) {
  const router = useRouter();

  const paymentMethodLabels: Record<string, string> = {
    cash: "💵 Cash",
    card: "💳 Card",
    mpesa: "📱 M-Pesa",
    bank_transfer: "🏦 Bank Transfer",
  };

  const handlePrintReceipt = () => {
    // Opens receipt in new window for printing
    window.open(`/dashboard/pos/sales/${saleId}?print=true`, "_blank");
  };

  const handleViewInvoice = () => {
    // Navigate to invoice page
    router.push(`/dashboard/pos/sales/${saleId}`);
  };

  const handleNewSale = () => {
    onNewSale();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        {/* Success Header */}
        <div className="flex flex-col items-center justify-center space-y-3 py-6">
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900">Sale Complete!</h2>
            <p className="text-sm text-slate-600 mt-1">Transaction processed successfully</p>
          </div>
        </div>

        {/* Sale Details */}
        <div className="space-y-3 rounded-lg bg-slate-50 p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Invoice Number</span>
            <span className="font-mono font-bold text-slate-900">{invoiceNo}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Amount Paid</span>
            <span className="text-lg font-bold text-blue-600">ksh {amountPaid.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center border-t border-slate-200 pt-3">
            <span className="text-sm text-slate-600">Payment Method</span>
            <span className="font-medium text-slate-900">
              {paymentMethodLabels[paymentMethod] || paymentMethod}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          {/* Primary: New Sale */}
          <Button
            onClick={handleNewSale}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base flex items-center justify-center gap-2"
            autoFocus
          >
            <Plus className="h-5 w-5" />
            New Sale
          </Button>

          {/* Secondary: Print Receipt */}
          <Button
            onClick={handlePrintReceipt}
            variant="outline"
            className="w-full h-11 font-semibold flex items-center justify-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Receipt
          </Button>

          {/* Tertiary: View Invoice */}
          <Button
            onClick={handleViewInvoice}
            variant="ghost"
            className="w-full h-11 font-semibold flex items-center justify-center gap-2"
          >
            <FileText className="h-4 w-4" />
            View Invoice
          </Button>
        </div>

        {/* Footer Text */}
        <p className="text-xs text-center text-slate-500 pt-2">
          Transaction ID: {saleId.slice(0, 8).toUpperCase()}
        </p>
      </DialogContent>
    </Dialog>
  );
}
