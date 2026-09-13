import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PaymentMethod =
  | "cash"
  | "card"
  | "mpesa"
  | "cheque"
  | "bank_transfer";

export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  unit_price: number;
  quantity: number;
  discount: number;
  tax_rate: number;
  available: number;
}

interface POSState {
  cart: CartItem[];
  paymentMethod: PaymentMethod;
  amountTendered: number;

  addItem: (item: CartItem) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;

  setPaymentMethod: (m: PaymentMethod) => void;
  setAmountTendered: (a: number) => void;
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      cart: [],
      paymentMethod: "cash",
      amountTendered: 0,

      addItem: (item) => {
        const existing = get().cart.find(
          (c) => c.productId === item.productId
        );

        if (existing) {
          set({
            cart: get().cart.map((c) =>
              c.productId === item.productId
                ? { ...c, quantity: c.quantity + 1 }
                : c
            ),
          });
        } else {
          set({ cart: [...get().cart, item] });
        }
      },

      updateQty: (id, qty) =>
        set({
          cart: get().cart.map((c) =>
            c.productId === id ? { ...c, quantity: qty } : c
          ),
        }),

      removeItem: (id) =>
        set({ cart: get().cart.filter((c) => c.productId !== id) }),

      clearCart: () =>
        set({
          cart: [],
          amountTendered: 0,
          paymentMethod: "cash",
        }),

      setPaymentMethod: (m) => set({ paymentMethod: m }),
      setAmountTendered: (a) => set({ amountTendered: a }),
    }),
    { name: "electronics-pos" }
  )
);
