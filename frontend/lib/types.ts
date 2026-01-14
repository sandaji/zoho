// frontend/lib/types.ts

export enum InventoryStatus {
  in_stock = "in_stock",
  low_stock = "low_stock",
  out_of_stock = "out_of_stock",
  discontinued = "discontinued",
}

export enum SalesStatus {
  draft = "draft",
  pending = "pending",
  confirmed = "confirmed",
  shipped = "shipped",
  delivered = "delivered",
  cancelled = "cancelled",
  returned = "returned",
}

export enum DeliveryStatus {
  pending = "pending",
  assigned = "assigned",
  in_transit = "in_transit",
  delivered = "delivered",
  failed = "failed",
  rescheduled = "rescheduled",
}

export enum TransactionType {
  income = "income",
  expense = "expense",
  transfer = "transfer",
  adjustment = "adjustment",
}

export enum PayrollStatus {
  draft = "draft",
  submitted = "submitted",
  approved = "approved",
  paid = "paid",
  reversed = "reversed",
}

export enum PaymentMethod {
  cash = "cash",
  card = "card",
  mpesa = "mpesa",
  cheque = "cheque",
  bank_transfer = "bank_transfer",
}
