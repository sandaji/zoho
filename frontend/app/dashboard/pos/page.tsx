"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AutocompleteProductSearch } from "@/components/pos/AutocompleteProductSearch";
import { POSCart } from "@/components/pos/POSCart";
import { POSPayment } from "@/components/pos/POSPayment";
import { POSCashier } from "@/components/pos/POSCashier";
import { POSSaleSuccess } from "@/components/pos/POSSaleSuccess";
import { POSQuickActions } from "@/components/pos/POSQuickActions";
import { POSCustomerSelect, Customer } from "@/components/pos/POSCustomerSelect";
import { useCashierSession } from "@/hooks/cashier/useCashierSession";
import { SessionOpenDialog } from "@/components/cashier/SessionOpenDialog";
import { SessionStatusCard } from "@/components/cashier/SessionStatusCard";
import { CloseSessionDialog } from "@/components/pos/CloseSessionDialog";

import { POSMenuBar } from "@/components/pos/POSMenuBar";
import { getApiUrl, API_ENDPOINTS } from "@/lib/api-config";
import { getAuthHeadersWithToken } from "@/lib/api-utils";

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
  branch?: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    city: string;
  } | null;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
  };
}

export default function POSPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading } = useAuth();
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
  const [activeTab] = useState("sale");

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

  const totalDiscount = useMemo(() => cart.reduce((s, i) => s + i.discount, 0), [cart]);

  const tax = useMemo(
    () => cart.reduce((s, i) => s + (i.quantity * i.unit_price - i.discount) * i.tax_rate, 0),
    [cart]
  );

  const grandTotal = useMemo(() => subtotal + tax, [subtotal, tax]);
  const changeAmount = useMemo(
    () => Math.max(0, amountTendered - grandTotal),
    [amountTendered, grandTotal]
  );

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

    setCart((prev) => prev.map((c) => (c.productId === productId ? { ...c, quantity: qty } : c)));
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
        headers: getAuthHeadersWithToken(token || ""),
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
        branch: json.data.branch,
        customer: selectedCustomer
          ? {
              name: selectedCustomer.name,
              phone: selectedCustomer.phone || undefined,
            }
          : undefined,
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
  const handleParkSale = async () => {
    if (!cart.length) {
      toast("Cart is empty", "warning");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(getApiUrl("/v1/sales-documents/sales/park"), {
        method: "POST",
        headers: getAuthHeadersWithToken(token || ""),
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
          customerId: selectedCustomer?.id || undefined,
          notes: notes || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast(json.message || "Failed to park sale", "error");
        return;
      }

      toast("Sale parked successfully", "success");
      clearCart();
    } catch (error) {
      toast("Failed to park sale", "error");
      console.error("Park sale error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleHoldSale = async () => {
    if (!cart.length) {
      toast("Cart is empty", "warning");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(getApiUrl("/v1/sales-documents/sales/hold"), {
        method: "POST",
        headers: getAuthHeadersWithToken(token || ""),
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
          customerId: selectedCustomer?.id || undefined,
          notes: notes || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast(json.message || "Failed to hold sale", "error");
        return;
      }

      toast("Sale held successfully", "success");
      clearCart();
    } catch (error) {
      toast("Failed to hold sale", "error");
      console.error("Hold sale error:", error);
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-[1700px] px-1 py-1 space-y-4">
        {/* ================= MENU BAR ================= */}
        <POSMenuBar
          token={token || ""}
          branchId={user.branchId}
          onCustomerCreated={setSelectedCustomer}
        />

        {/* ================= SESSION WARNING ================= */}
        {!sessionLoading && !session && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
            <div className="text-sm text-amber-800">
              No active cashier session. Open a session to start selling.
            </div>
            <button
              onClick={() => setShowOpenDialog(true)}
              className="px-4 py-2 rounded-md bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition"
            >
              Open Session
            </button>
          </div>
        )}

        {/* ================= MAIN RESPONSIVE GRID LAYOUT ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 items-start">
          {/* ================= LEFT SIDE (70% - 7 Cols out of 10) ================= */}
          <div className="lg:col-span-7 space-y-4">
            {/* Product Search - Blue tint */}
            <div className="bg-blue-50/50 border border-blue-700 rounded-lg px-4 py-2 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <POSQuickActions
                  onPark={handleParkSale}
                  onHold={handleHoldSale}
                  onClear={clearCart}
                  hasItems={cart.length > 0}
                />
                <POSCustomerSelect
                  token={token || ""}
                  selectedCustomer={selectedCustomer}
                  onCustomerSelect={setSelectedCustomer}
                />
              </div>
              <AutocompleteProductSearch
                branchId={user.branchId || ""}
                token={token || ""}
                searchInputRef={searchInputRef}
                onSelect={addToCart}
              />
            </div>

            {/* Cart - Neutral */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <POSCart
                cart={cart}
                onUpdateQuantity={updateQuantity}
                onUpdateDiscount={updateDiscount}
                onRemove={removeFromCart}
                onClear={clearCart}
              />
            </div>
          </div>

          {/* ================= RIGHT SIDE (30% - 3 Cols out of 10) ================= */}
          <div className="lg:col-span-3 space-y-4">
            {/* Payment - Emerald tint */}
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4 space-y-4">
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
            </div>

            {/* <POSCashier user={user} /> */}
          </div>
        </div>
      </div>

      {/* ================= SUCCESS MODAL ================= */}
      {lastSale && (
        <POSSaleSuccess
          isOpen={showSuccessModal}
          sale={lastSale}
          changeAmount={changeAmount}
          onNewSale={handleNewSale}
        />
      )}

      {/* ================= SESSION OPEN ================= */}
      <SessionOpenDialog
        isOpen={showOpenDialog}
        onOpenChange={setShowOpenDialog}
        onOpenSession={async (openingBalance, notes) => {
          try {
            const newSession = await openSession(openingBalance, notes);
            toast("Session opened successfully", "success");
            return newSession;
          } catch (err) {
            toast(err instanceof Error ? err.message : "Failed to open session", "error");
            throw err;
          }
        }}
        isLoading={sessionLoading}
        error={sessionError}
      />

      {/* ================= CLOSE SESSION ================= */}
      {session && (
        <CloseSessionDialog
          open={showCloseDialog}
          expectedCash={session.expectedCash || 0}
          onClose={() => setShowCloseDialog(false)}
          onSubmit={async (actualCash: number, notes?: string) => {
            try {
              await closeSession(actualCash, notes || undefined);
              toast("Session closed successfully", "success");
              setShowCloseDialog(false);
            } catch (err) {
              toast(err instanceof Error ? err.message : "Failed to close session", "error");
            }
          }}
        />
      )}

      <SessionStatusCard
        session={session}
        isLoading={sessionLoading}
        onCloseClick={() => setShowCloseDialog(true)}
        onReconcileClick={() => toast("Reconciliation can only be done by managers", "info")}
      />
    </div>
  );
}
