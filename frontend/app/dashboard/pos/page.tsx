"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, FileText, History } from "lucide-react";

import { AutocompleteProductSearch } from "@/components/pos/AutocompleteProductSearch";
import { POSCart } from "@/components/pos/POSCart";
import { POSPayment } from "@/components/pos/POSPayment";
import { POSCashier } from "@/components/pos/POSCashier";
import { POSSaleSuccess } from "@/components/pos/POSSaleSuccess";
import { POSHistory } from "@/components/pos/POSHistory";
import { POSQuickActions } from "@/components/pos/POSQuickActions";
import { POSDocuments } from "@/components/pos/POSDocuments";
import { POSCustomerSelect, Customer } from "@/components/pos/POSCustomerSelect";
import { useCashierSession } from "@/hooks/cashier/useCashierSession";
import { SessionOpenDialog } from "@/components/cashier/SessionOpenDialog";
import { SessionStatusCard } from "@/components/cashier/SessionStatusCard";

import { getApiUrl, API_ENDPOINTS, getAuthHeaders } from "@/lib/api-config";

// ------------------ Types ------------------
type PaymentMethod = "cash" | "card" | "mpesa" | "cheque" | "bank_transfer";

export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  unit_price: number;
  quantity: number;
  discount: number;
  discount_percent: number;
  available: number;
  tax_rate: number;
}

export interface SaleData {
  id: string;
  invoice_no: string;
  subtotal: number;
  tax: number;
  total: number;
  amount_paid: number;
  payment_method: PaymentMethod;
  items: CartItem[];
  created_at: string;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
  };
}

export default function POSPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Cashier session management
  const {
    session,
    isLoading: sessionLoading,
    error: sessionError,
    openSession,
    closeSession,
  } = useCashierSession();

  // Main states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountTendered, setAmountTendered] = useState<number>(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Cashier session dialogs
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState("sale");

  // Post-sale modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSale, setLastSale] = useState<SaleData | null>(null);

  // Reference for auto-focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ------------------ Auth Guard ------------------
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/auth/login");
  }, [isAuthenticated, isLoading, router]);

  // Auto-focus search on mount
  useEffect(() => {
    if (searchInputRef.current && activeTab === "sale") {
      searchInputRef.current.focus();
    }
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  // ------------------ Totals ------------------
  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + (i.quantity * i.unit_price - i.discount), 0),
    [cart]
  );

  const totalDiscount = useMemo(
    () => cart.reduce((s, i) => s + i.discount, 0),
    [cart]
  );

  const tax = useMemo(
    () => cart.reduce((s, i) => s + ((i.quantity * i.unit_price - i.discount) * i.tax_rate), 0),
    [cart]
  );

  const grandTotal = useMemo(() => subtotal + tax, [subtotal, tax]);
  const changeAmount = useMemo(() => Math.max(0, amountTendered - grandTotal), [amountTendered, grandTotal]);

  // ------------------ Cart Logic ------------------
  const addToCart = (product: any) => {
    const existing = cart.find((c) => c.productId === product.id);

    if (existing) {
      if (existing.quantity + 1 > product.available) {
        toast("Insufficient inventory", "error");
        return;
      }
      updateQuantity(product.id, existing.quantity + 1);
    } else {
      setCart((prev) => [
        ...prev,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          unit_price: product.unit_price,
          quantity: 1,
          discount: 0,
          discount_percent: 0,
          available: product.available,
          tax_rate: 0.16, // Default 16% VAT
        },
      ]);
    }

    toast(`${product.name} added to cart`, "success");
  };

  const updateQuantity = (productId: string, qty: number) => {
    const item = cart.find((c) => c.productId === productId);
    if (!item) return;

    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (qty > item.available) {
      toast("Insufficient inventory", "error");
      return;
    }

    setCart((prev) =>
      prev.map((c) =>
        c.productId === productId ? { ...c, quantity: qty } : c
      )
    );
  };

  const updateDiscount = (productId: string, discount: number, isPercent: boolean = false) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.productId === productId) {
          const lineTotal = c.quantity * c.unit_price;
          if (isPercent) {
            return {
              ...c,
              discount_percent: discount,
              discount: (lineTotal * discount) / 100,
            };
          } else {
            return {
              ...c,
              discount: Math.min(discount, lineTotal),
              discount_percent: (discount / lineTotal) * 100,
            };
          }
        }
        return c;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
    toast("Item removed", "info");
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setNotes("");
    setAmountTendered(0);
    setPaymentMethod("cash");
    toast("Cart cleared", "info");
  };

  // ------------------ Checkout ------------------
  const handleCheckout = async () => {
    if (!cart.length) {
      toast("Cart is empty", "warning");
      return;
    }

    if (paymentMethod === "cash" && amountTendered < grandTotal) {
      toast("Insufficient amount tendered", "warning");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(getApiUrl(API_ENDPOINTS.POS_SALES), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          branchId: user.branchId,
          userId: user.id,
          items: cart.map((c) => ({
            productId: c.productId,
            quantity: c.quantity,
            unit_price: c.unit_price,
            tax_rate: c.tax_rate,
            discount: c.discount,
            discount_percent: c.discount_percent,
          })),
          discount: totalDiscount,
          payment_method: paymentMethod,
          amount_paid: paymentMethod === "cash" ? amountTendered : grandTotal,
          customerId: selectedCustomer?.id || undefined,
          notes: notes || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast(json.message || "Checkout failed", "error");
        return;
      }

      // Store sale data and show success modal
      setLastSale({
        id: json.data.id,
        invoice_no: json.data.invoice_no,
        subtotal,
        tax,
        total: grandTotal,
        amount_paid: paymentMethod === "cash" ? amountTendered : grandTotal,
        payment_method: paymentMethod,
        items: cart,
        created_at: new Date().toISOString(),
        customer: selectedCustomer ? {
          name: selectedCustomer.name,
          phone: selectedCustomer.phone || undefined,
        } : undefined,
      });
      setShowSuccessModal(true);
    } catch (error) {
      toast("Checkout failed. Please try again.", "error");
      console.error("Checkout error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle new sale after success modal
  const handleNewSale = () => {
    setShowSuccessModal(false);
    setLastSale(null);
    clearCart();

    // Auto-focus search input for next customer
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  // ------------------ Quick Actions ------------------
  const handleParkSale = () => {
    if (!cart.length) {
      toast("Cart is empty", "warning");
      return;
    }
    // TODO: Implement park sale functionality
    toast("Sale parked (Not implemented)", "info");
  };

  const handleHoldSale = () => {
    if (!cart.length) {
      toast("Cart is empty", "warning");
      return;
    }
    // TODO: Implement hold sale functionality
    toast("Sale held (Not implemented)", "info");
  };

  // ------------------ Keyboard Shortcuts ------------------
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // F9: Complete Sale
      if (e.key === "F9" && !loading && cart.length > 0) {
        e.preventDefault();
        handleCheckout();
      }
      // F4: Clear Cart
      if (e.key === "F4" && cart.length > 0) {
        e.preventDefault();
        clearCart();
      }
      // ESC: Focus search
      if (e.key === "Escape" && activeTab === "sale") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [cart, loading, grandTotal, activeTab]);

  // ------------------ UI ------------------
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4">
      <div className="mx-auto max-w-[1800px] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Point of Sale</h1>
            <p className="text-sm text-slate-600">
              Branch: {user.branch?.name || "Main"} • Cashier: {user.name}
            </p>
          </div>
          <POSQuickActions
            onPark={handleParkSale}
            onHold={handleHoldSale}
            onClear={clearCart}
            hasItems={cart.length > 0}
          />
        </div>



        {/* Session Not Open Warning */}
        {!sessionLoading && !session && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ No active cashier session. Click "Open Session" in the status card above to start taking transactions.
            </p>
            <button
              onClick={() => setShowOpenDialog(true)}
              className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm font-medium"
            >
              Open Session Now
            </button>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-xl grid-cols-4">
            <TabsTrigger value="sale" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              New Sale
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* New Sale Tab */}
          <TabsContent value="sale" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* LEFT SECTION - Products & Cart */}
              <div className="space-y-4 lg:col-span-2">
                <Card className="shadow-lg">
                  <CardHeader className="border-b bg-linear-to-r from-blue-50 to-indigo-50">
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      Add Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <AutocompleteProductSearch
                      branchId={user.branchId || ""}
                      searchInputRef={searchInputRef}
                      onSelect={addToCart}
                    />
                  </CardContent>
                </Card>

                <POSCart
                  cart={cart}
                  onUpdateQuantity={updateQuantity}
                  onUpdateDiscount={updateDiscount}
                  onRemove={removeFromCart}
                  onClear={clearCart}
                />
              </div>

              {/* RIGHT SECTION - Payment & Summary */}
              <div className="space-y-4">
                <POSCustomerSelect
                  selectedCustomer={selectedCustomer}
                  onCustomerSelect={setSelectedCustomer}
                />

                <POSPayment
                  subtotal={subtotal}
                  tax={tax}
                  totalDiscount={totalDiscount}
                  grandTotal={grandTotal}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  amountTendered={amountTendered}
                  setAmountTendered={setAmountTendered}
                  changeAmount={changeAmount}
                  onCheckout={handleCheckout}
                  loading={loading}
                  cartCount={cart.length}
                  notes={notes}
                  setNotes={setNotes}
                />

                <POSCashier user={user} />
              </div>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <POSDocuments branchId={user.branchId || ""} />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <POSHistory branchId={user.branchId || ""} />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Sales Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Reports functionality coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Post-Sale Success Modal */}
        {lastSale && (
          <POSSaleSuccess
            isOpen={showSuccessModal}
            sale={lastSale}
            changeAmount={changeAmount}
            onNewSale={handleNewSale}
          />
        )}

        {/* Session Dialogs */}
        <SessionOpenDialog
          isOpen={showOpenDialog}
          onOpenChange={setShowOpenDialog}
          onOpenSession={async (openingBalance, notes) => {
            try {
              const newSession = await openSession(openingBalance, notes);
              toast("Session opened successfully", "success");
              return newSession;
            } catch (err) {
              toast(
                err instanceof Error ? err.message : "Failed to open session",
                "error"
              );
              throw err;
            }
          }}
          isLoading={sessionLoading}
          error={sessionError}
        />

        {/* Close Session Dialog */}
        {showCloseDialog && session && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Close Cashier Session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Expected Cash</label>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat("en-KE", {
                      style: "currency",
                      currency: "KES",
                    }).format(session.expectedCash)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Actual Cash Count (KES)
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full border rounded px-3 py-2"
                    id="actualCash"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    placeholder="Any discrepancies or notes..."
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                    id="closeNotes"
                  />
                </div>
              </CardContent>
              <div className="flex gap-2 px-6 pb-6">
                <button
                  onClick={() => setShowCloseDialog(false)}
                  className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const actualCash = parseFloat(
                      (document.getElementById("actualCash") as HTMLInputElement)
                        .value
                    );
                    const notes = (
                      document.getElementById("closeNotes") as HTMLTextAreaElement
                    ).value;

                    if (isNaN(actualCash)) {
                      toast("Please enter actual cash amount", "error");
                      return;
                    }

                    try {
                      await closeSession(actualCash, notes || undefined);
                      toast("Session closed successfully", "success");
                      setShowCloseDialog(false);
                    } catch (err) {
                      toast(
                        err instanceof Error
                          ? err.message
                          : "Failed to close session",
                        "error"
                      );
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Close Session
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Cashier Session Status */}
      <SessionStatusCard
        session={session}
        isLoading={sessionLoading}
        onCloseClick={() => setShowCloseDialog(true)}
        onReconcileClick={() => {
          // Reconciliation is handled by manager through API
          toast("Reconciliation can only be done by managers", "info");
        }}
      />
    </div>
  );
}