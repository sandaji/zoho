// frontend/components/pos/POSSaleSuccess.tsx
"use client";

import React, { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Printer,
  Mail,
  Download,
  ShoppingBag,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaleData } from "@/app/dashboard/pos/page";
import { formatCurrency, safeFormatDate } from "@/lib/utils";
import { frontendEnv } from "@/lib/env";
import { getApiUrl } from "@/lib/api-config";
import { getAuthHeadersWithToken } from "@/lib/api-utils";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";

interface POSSaleSuccessProps {
  isOpen: boolean;
  sale: SaleData;
  changeAmount: number;
  onNewSale: () => void;
}

export const POSSaleSuccess: React.FC<POSSaleSuccessProps> = ({
  isOpen,
  sale,
  changeAmount,
  onNewSale,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { token } = useAuth();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [isLoadingPDF, setIsLoadingPDF] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${sale.invoice_no}`,
  });

  const handleEmailReceipt = async () => {
    if (!emailAddress.trim()) {
      toast("Please enter an email address", "warning");
      return;
    }

    try {
      setIsLoadingEmail(true);
      const res = await fetch(`${getApiUrl("/v1/pos/sales")}/${sale.id}/email`, {
        method: "POST",
        headers: getAuthHeadersWithToken(token || ""),
        body: JSON.stringify({ email: emailAddress }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to send email");
      }

      toast("Receipt sent successfully", "success");
      setEmailDialogOpen(false);
      setEmailAddress("");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to send receipt", "error");
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsLoadingPDF(true);
      const res = await fetch(`${getApiUrl("/v1/pos/sales")}/${sale.id}/pdf`, {
        headers: getAuthHeadersWithToken(token || ""),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to download PDF");
      }

      // Create blob and trigger download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `receipt-${sale.invoice_no}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast("Receipt downloaded successfully", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to download PDF", "error");
    } finally {
      setIsLoadingPDF(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <CheckCircle className="h-8 w-8 text-green-600" />
            Sale Completed Successfully!
          </DialogTitle>
          <DialogDescription className="sr-only">
            Summary and receipt for invoice {sale.invoice_no}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Sale Summary */}
          <div className="rounded-lg bg-green-50 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Invoice Number</span>
              <Badge className="text-lg px-4 py-1">{sale.invoice_no}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Total Amount</span>
              <span className="text-3xl font-bold text-green-600">
                {formatCurrency(sale.total)}
              </span>
            </div>
            {sale.payment_method === "cash" && changeAmount > 0 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-slate-600">Change Given</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(changeAmount)}
                </span>
              </div>
            )}
          </div>

          {/* Receipt Preview */}
          <div ref={receiptRef} className="rounded-lg border bg-white p-8 shadow-inner">
            <ReceiptContent sale={sale} changeAmount={changeAmount} />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={handlePrint} className="h-12">
              <Printer className="mr-2 h-4 w-4" />
              Print Receipt
            </Button>
            <Button variant="outline" onClick={() => setEmailDialogOpen(true)} className="h-12">
              <Mail className="mr-2 h-4 w-4" />
              Email Receipt
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={isLoadingPDF}
              className="h-12"
            >
              {isLoadingPDF ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isLoadingPDF ? "Downloading..." : "Download PDF"}
            </Button>
            <Button onClick={onNewSale} className="h-12 bg-green-600 hover:bg-green-700">
              <ShoppingBag className="mr-2 h-4 w-4" />
              New Sale
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Email Receipt Dialog */}
          <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Email Receipt</DialogTitle>
                <DialogDescription>
                  Send receipt for invoice {sale.invoice_no} to customer email
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="email">Customer Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="customer@example.com"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isLoadingEmail) {
                        handleEmailReceipt();
                      }
                    }}
                    disabled={isLoadingEmail}
                    className="mt-2"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setEmailDialogOpen(false)}
                    disabled={isLoadingEmail}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEmailReceipt}
                    disabled={isLoadingEmail || !emailAddress.trim()}
                  >
                    {isLoadingEmail ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Email"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Receipt Content Component for Printing
const ReceiptContent: React.FC<{
  sale: SaleData;
  changeAmount: number;
}> = ({ sale, changeAmount }) => {
  // Branch DB fields take priority — env vars are fallback
  const companyName = sale.branch?.name || frontendEnv.NEXT_PUBLIC_COMPANY_NAME;

  const companyAddress =
    sale.branch?.address ||
    (sale.branch?.city ? `${sale.branch.city}, Kenya` : frontendEnv.NEXT_PUBLIC_COMPANY_ADDRESS);

  const companyPhone = sale.branch?.phone || frontendEnv.NEXT_PUBLIC_COMPANY_PHONE;

  const companyEmail = frontendEnv.NEXT_PUBLIC_COMPANY_EMAIL;
  const companyPin = frontendEnv.NEXT_PUBLIC_COMPANY_PIN;

  return (
    <div className="receipt-content space-y-4 font-mono text-sm">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold">{companyName}</h2>
        <p className="text-xs">{companyAddress}</p>
        <p className="text-xs">Tel: {companyPhone}</p>
        <p className="text-xs">Email: {companyEmail}</p>
      </div>

      <Separator />

      {/* Invoice Info */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Invoice No:</span>
          <span className="font-bold">{sale.invoice_no}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>
            {safeFormatDate(sale.created_at, { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </div>
        {sale.customer && (
          <>
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{sale.customer.name}</span>
            </div>
            {sale.customer.phone && (
              <div className="flex justify-between">
                <span>Phone:</span>
                <span>{sale.customer.phone}</span>
              </div>
            )}
          </>
        )}
      </div>

      <Separator />

      {/* Items */}
      <div className="space-y-2">
        <div className="grid grid-cols-12 gap-1 font-bold text-xs border-b pb-1">
          <div className="col-span-6">Item</div>
          <div className="col-span-2 text-center">Qty</div>
          <div className="col-span-2 text-right">Price</div>
          <div className="col-span-2 text-right">Total</div>
        </div>
        {sale.items.map((item, index) => {
          const lineTotal = item.quantity * item.unit_price - item.discount;
          return (
            <div key={index} className="grid grid-cols-12 gap-1 text-xs">
              <div className="col-span-6">{item.name}</div>
              <div className="col-span-2 text-center">{item.quantity}</div>
              <div className="col-span-2 text-right">{formatCurrency(item.unit_price)}</div>
              <div className="col-span-2 text-right">{formatCurrency(lineTotal)}</div>
            </div>
          );
        })}
      </div>

      <Separator />

      {/* Totals */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCurrency(sale.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax (16%):</span>
          <span>{formatCurrency(sale.tax)}</span>
        </div>
        <Separator className="my-2" />
        <div className="flex justify-between font-bold text-base">
          <span>TOTAL:</span>
          <span>{formatCurrency(sale.total)}</span>
        </div>
        <div className="flex justify-between">
          <span>Payment Method:</span>
          <span className="uppercase">{sale.payment_method}</span>
        </div>
        {sale.payment_method === "cash" && (
          <>
            <div className="flex justify-between">
              <span>Amount Paid:</span>
              <span>{formatCurrency(sale.amount_paid)}</span>
            </div>
            {changeAmount > 0 && (
              <div className="flex justify-between font-bold">
                <span>Change:</span>
                <span>{formatCurrency(changeAmount)}</span>
              </div>
            )}
          </>
        )}
      </div>

      <Separator />

      {/* Footer */}
      <div className="text-center space-y-1 text-xs">
        <p className="font-bold">Thank you for your business!</p>
        <p>Goods sold are not returnable</p>
        <p>VAT Reg: {companyPin}</p>
      </div>
    </div>
  );
};
