/**
 * Centralized Status Color Mappings
 * Maps backend document/system statuses to clean CSS classes & color tokens
 */

export interface StatusColorStyle {
  badge: string;
  text: string;
  bg: string;
  border: string;
  dot: string;
}

const DEFAULT_STYLE: StatusColorStyle = {
  badge: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  text: "text-slate-400",
  bg: "bg-slate-500/10",
  border: "border-slate-500/20",
  dot: "bg-slate-400",
};

export const STATUS_COLORS: Record<string, StatusColorStyle> = {
  // Positive / Paid / Approved / Completed
  PAID: {
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  APPROVED: {
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  COMPLETED: {
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  ACTIVE: {
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  DELIVERED: {
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    dot: "bg-emerald-400",
  },

  // Warning / Pending / In Progress / Partial
  PENDING: {
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
  },
  PARTIALLY_PAID: {
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
  },
  IN_PROGRESS: {
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
  },
  LOW_STOCK: {
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
  },
  SENT: {
    badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    text: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    dot: "bg-sky-400",
  },

  // Negative / Cancelled / Overdue / Rejected
  OVERDUE: {
    badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    text: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    dot: "bg-rose-400",
  },
  REJECTED: {
    badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    text: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    dot: "bg-rose-400",
  },
  CANCELLED: {
    badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    text: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    dot: "bg-rose-400",
  },
  OUT_OF_STOCK: {
    badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    text: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    dot: "bg-rose-400",
  },
  INACTIVE: {
    badge: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    text: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    dot: "bg-slate-400",
  },
};

export function getStatusColor(status: string): StatusColorStyle {
  if (!status) return DEFAULT_STYLE;
  const key = status.toUpperCase();
  return STATUS_COLORS[key] || DEFAULT_STYLE;
}
