import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {  Lock, AlertCircle } from "lucide-react";

export function OrderSummary({
  subtotal,
  tax,
  total,
  paymentMethod,
  setPaymentMethod,
  onCheckout,
  loading,
  cartCount,
}: any) {
  const paymentMethodLabels: Record<string, string> = {
    cash: "💵 Cash",
    card: "💳 Card",
    mpesa: "📱 M-Pesa",
    bank_transfer: "🏦 Bank Transfer",
  };

  return (
    <div className="space-y-6">
      {/* Subtotals Section */}
      <div className="space-y-3 rounded-lg bg-slate-50 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Subtotal</span>
          <span className="font-medium">ksh {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Tax (16%)</span>
          <span className="font-medium text-blue-600">ksh {tax.toFixed(2)}</span>
        </div>
        <div className="border-t border-slate-200 pt-3 flex justify-between">
          <span className="text-slate-600 font-medium">Discount</span>
          <span className="font-medium">ksh 0.00</span>
        </div>
      </div>

      {/* Grand Total - HERO ELEMENT */}
      <div className="rounded-lg bg-linear-to-r from-blue-600 to-blue-700 p-6 text-white shadow-md">
        <p className="text-sm uppercase tracking-wide opacity-90 mb-1">Amount Due</p>
        <p className="text-5xl font-bold">ksh {total.toFixed(2)}</p>
      </div>

      {/* Payment Method Selection */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700 block">Payment Method</label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger className="h-11 text-base border-2 border-slate-300 hover:border-blue-400 transition-colors">
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">💵 Cash</SelectItem>
            <SelectItem value="card">💳 Card</SelectItem>
            <SelectItem value="mpesa">📱 M-Pesa</SelectItem>
            <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500">Selected: {paymentMethodLabels[paymentMethod]}</p>
      </div>

      {/* Complete Sale Button */}
      <Button
        onClick={onCheckout}
        disabled={!cartCount || loading}
        className={`
          w-full h-14 text-base font-bold uppercase tracking-wide
          transition-all duration-200
          ${!cartCount ? "opacity-50 cursor-not-allowed" : ""}
          ${
            loading
              ? "bg-slate-600 hover:bg-slate-600 cursor-wait"
              : "bg-green-600 hover:bg-green-700 active:bg-green-800 shadow-lg hover:shadow-xl"
          }
        `}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>Processing Payment…</span>
          </div>
        ) : !cartCount ? (
          <div className="flex items-center justify-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>Add Items to Cart</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Lock className="h-5 w-5" />
            <span>Complete Sale</span>
          </div>
        )}
      </Button>

      {/* Safety Text */}
      <p className="text-xs text-center text-slate-500 px-2">
        All transactions are secure and encrypted
      </p>
    </div>
  );
}
