/**
 * Centralized Status Color Mappings
 * Maps backend document/system statuses to theme-token classes (same tokens
 * the Payroll page uses), so they follow light/dark mode automatically.
 */

export interface StatusColorStyle {
  badge: string;
  text: string;
  bg: string;
  border: string;
  dot: string;
}

const NEUTRAL: StatusColorStyle = {
  badge: "bg-muted text-muted-foreground border-border",
  text: "text-muted-foreground",
  bg: "bg-muted",
  border: "border-border",
  dot: "bg-muted-foreground",
};

const SUCCESS: StatusColorStyle = {
  badge: "bg-success-muted text-success border-success-border",
  text: "text-success",
  bg: "bg-success-muted",
  border: "border-success-border",
  dot: "bg-success",
};

const WARNING: StatusColorStyle = {
  badge: "bg-warning-muted text-warning-foreground border-warning-border",
  text: "text-warning",
  bg: "bg-warning-muted",
  border: "border-warning-border",
  dot: "bg-warning",
};

const INFO: StatusColorStyle = {
  badge: "bg-info-muted text-info border-info-border",
  text: "text-info",
  bg: "bg-info-muted",
  border: "border-info-border",
  dot: "bg-info",
};

const DANGER: StatusColorStyle = {
  badge: "bg-destructive/10 text-destructive border-destructive/20",
  text: "text-destructive",
  bg: "bg-destructive/10",
  border: "border-destructive/20",
  dot: "bg-destructive",
};

const DEFAULT_STYLE: StatusColorStyle = NEUTRAL;

export const STATUS_COLORS: Record<string, StatusColorStyle> = {
  // Positive / Paid / Approved / Completed
  PAID: SUCCESS,
  APPROVED: SUCCESS,
  COMPLETED: SUCCESS,
  ACTIVE: SUCCESS,
  DELIVERED: SUCCESS,

  // Warning / Pending / In Progress / Partial
  PENDING: WARNING,
  PARTIALLY_PAID: WARNING,
  IN_PROGRESS: WARNING,
  LOW_STOCK: WARNING,

  // Informational / Submitted / Sent
  SENT: INFO,
  SUBMITTED: INFO,

  // Negative / Cancelled / Overdue / Rejected
  OVERDUE: DANGER,
  REJECTED: DANGER,
  CANCELLED: DANGER,
  OUT_OF_STOCK: DANGER,
  REVERSED: DANGER,

  // Neutral
  DRAFT: NEUTRAL,
  INACTIVE: NEUTRAL,
};

export function getStatusColor(status: string): StatusColorStyle {
  if (!status) return DEFAULT_STYLE;
  const key = status.toUpperCase();
  return STATUS_COLORS[key] || DEFAULT_STYLE;
}
