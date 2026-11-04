import { z } from "zod";

/**
 * Body of POST /pos/sales.
 *
 * Prices and tax rates are deliberately absent: the server reads them from the
 * product catalogue. Unknown keys (e.g. a stale client still sending
 * `unit_price`) are stripped, not trusted. `branchId` / `userId` are optional
 * and ignored for non-admins - identity comes from the auth token.
 */
export const createPosSaleSchema = z.object({
  branchId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive().max(1_000_000),
        discount: z.number().finite().min(0).optional(),
      }),
    )
    .min(1, "At least one item is required")
    .max(200, "Too many items in one sale"),
  payment_method: z.enum(["cash", "card", "mpesa", "cheque", "bank_transfer"]),
  amount_paid: z.number().finite().min(0).optional(),
  payment_reference: z.string().trim().max(120).optional().nullable(),
  payment_confirmed: z.boolean().optional(),
  discount: z.number().finite().min(0).optional(),
  customerId: z.string().min(1).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.payment_method === "cash") return;
  if (!data.payment_confirmed) {
    ctx.addIssue({
      code: "custom",
      path: ["payment_confirmed"],
      message: "Confirm the external payment has been received and verified",
    });
  }
  if (!data.payment_reference?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["payment_reference"],
      message: "A payment reference is required for external payments",
    });
  }
});

export type CreatePosSaleBody = z.infer<typeof createPosSaleSchema>;
