"use client";

import clsx from "clsx";

export type DeliveryStatus =
  | "pending"
  | "assigned"
  | "in_transit"
  | "delivered"
  | "failed"
  | "rescheduled";

const statusMap: Record<
  DeliveryStatus,
  { label: string; bg: string; text: string; ring: string }
> = {
  pending: { label: "Pending", bg: "bg-slate-500", text: "text-white", ring: "ring-slate-300" },
  assigned: { label: "Assigned", bg: "bg-blue-600", text: "text-white", ring: "ring-blue-300" },
  in_transit: { label: "In Transit", bg: "bg-amber-500", text: "text-white", ring: "ring-amber-300" },
  delivered: { label: "Delivered", bg: "bg-emerald-600", text: "text-white", ring: "ring-emerald-300" },
  failed: { label: "Failed", bg: "bg-rose-600", text: "text-white", ring: "ring-rose-300" },
  rescheduled: { label: "Rescheduled", bg: "bg-violet-600", text: "text-white", ring: "ring-violet-300" },
};

export function DeliveryBadge({
  status,
  className,
}: {
  status: DeliveryStatus;
  className?: string;
}) {
  const s = statusMap[status];

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1",
        s.bg,
        s.text,
        s.ring,
        className
      )}
    >
      {s.label}
    </span>
  );
}
