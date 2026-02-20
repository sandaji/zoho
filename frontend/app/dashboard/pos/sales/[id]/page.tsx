//frontend/src/app/dashboard/pos/sales/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, ArrowLeft } from "lucide-react";
import { getApiUrl, API_ENDPOINTS, getAuthHeaders } from "@/lib/api-config";

interface SaleItem {
  id: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount: number;
  amount: number;
  product: {
    id: string;
    name: string;
    sku: string;
  };
}

interface Sale {
  id: string;
  invoice_no: string;
  status: string;
  payment_method: string;
  subtotal: number;
  discount: number;
  tax: number;
  grand_total: number;
  amount_paid: number;
  change: number;
  created_date: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  branch: {
    name: string;
    code: string;
    address: string;
    phone: string;
  };
  sales_items: SaleItem[];
}

export default function InvoicePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const isPrintMode = searchParams.get("print") === "true";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    if (!isLoading && params.id) {
      fetchSale();
    }
  }, [isLoading, isAuthenticated, params.id]);

  const fetchSale = async () => {
    try {
      setLoading(true);
      const res = await fetch(getApiUrl(API_ENDPOINTS.POS_SALES_BY_ID(params.id as string)), {
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast(json.message || "Failed to load invoice", "error");
        router.push("/dashboard/pos");
        return;
      }

      setSale(json.data);

      // Auto-print if in print mode
      if (isPrintMode) {
        setTimeout(() => {
          window.print();
        }, 500);
      }
    } catch (err) {
      toast("Failed to load invoice", "error");
      router.push("/dashboard/pos");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!sale || !sale.branch || !sale.user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50">
        <p className="text-lg text-muted-foreground">Invoice not found</p>
        <Button onClick={() => router.push("/dashboard/pos")}>Back to POS</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 print:bg-white print:p-0">
      {/* Print Controls - Hide on Print */}
      <div className="mb-6 flex gap-3 print:hidden">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={() => window.print()} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Printer className="h-4 w-4" />
          Print Receipt
        </Button>
      </div>

      {/* Invoice Container - Centered & Sized for Thermal Printer */}
      <div className="mx-auto max-w-sm">
        <Card className="border-0 print:shadow-none">
          <CardContent className="p-6 print:p-4 text-xs print:text-xs">
            {/* Header */}
            <div className="mb-4 border-b pb-4 text-center">
              <h1 className="text-lg font-bold">{sale.branch.name}</h1>
              <p className="text-muted-foreground">{sale.branch.code}</p>
              <p className="text-xs text-muted-foreground">{sale.branch.address}</p>
              <p className="text-xs text-muted-foreground">{sale.branch.phone}</p>
            </div>

            {/* Invoice Info */}
            <div className="mb-4 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="font-medium">Invoice</span>
                <span className="font-mono font-bold">{sale.invoice_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Date</span>
                <span>{new Date(sale.created_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Time</span>
                <span>{new Date(sale.createdAt).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Cashier</span>
                <span>{sale.user.name}</span>
              </div>
            </div>

            {/* Items */}
            <div className="mb-4 border-y py-3">
              <div className="mb-2 space-y-2">
                {sale.sales_items.map((item) => (
                  <div key={item.id}>
                    <div className="flex justify-between">
                      <span className="font-medium">{item.product.name}</span>
                      <span className="font-mono">ksh {item.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span className="text-xs">
                        {item.quantity} × ksh {item.unit_price.toFixed(2)}
                      </span>
                      {item.discount > 0 && (
                        <span className="text-xs">-ksh {item.discount.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="mb-4 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono">ksh {sale.subtotal.toFixed(2)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Discount</span>
                  <span className="font-mono">-ksh {sale.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax (16%)</span>
                <span className="font-mono">ksh {sale.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-bold">
                <span>Total</span>
                <span className="font-mono">ksh {sale.grand_total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="mb-4 space-y-1 border-y py-3 text-xs">
              <div className="flex justify-between">
                <span className="font-medium">Payment Method</span>
                <span className="uppercase">{sale.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Amount Paid</span>
                <span className="font-mono font-bold">ksh {sale.amount_paid.toFixed(2)}</span>
              </div>
              {sale.change > 0 && (
                <div className="flex justify-between">
                  <span className="font-medium">Change</span>
                  <span className="font-mono font-bold text-green-600">
                    ksh {sale.change.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="space-y-2 text-center text-xs text-muted-foreground">
              <p>Thank you for your purchase!</p>
              <p className="text-xs">Transaction ID: {sale.id.slice(0, 8).toUpperCase()}</p>
              <p className="mt-4 text-xs">
                Status: <span className="uppercase font-semibold">{sale.status}</span>
              </p>
            </div>

            {/* Dashed Line for Tear-Off */}
            <div className="my-4 border-t border-dashed" />

            {/* Thermal Printer Optimized Notes */}
            <div className="text-center text-xs text-muted-foreground space-y-1">
              <p>Please retain this receipt for your records</p>
              <p>For inquiries, contact store management</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Stylesheet */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .max-w-sm {
            max-width: 80mm;
          }
        }
      `}</style>
    </div>
  );
}
