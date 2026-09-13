/**
 * Centralized Theme Tokens
 * Provides single source of truth for colors, themes, gradients, and chart palettes across the application.
 */

export const THEME_COLORS = {
  primary: {
    50: "#eef2ff",
    100: "#e0e7ff",
    500: "#6366f1",
    600: "#4f46e5",
    700: "#4338ca",
  },
  emerald: {
    50: "#ecfdf5",
    100: "#d1fae5",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
  },
  sky: {
    50: "#f0f9ff",
    100: "#e0f2fe",
    500: "#0ea5e9",
    600: "#0284c7",
    700: "#0369a1",
  },
  amber: {
    50: "#fffbeb",
    100: "#fef3c7",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
  },
  rose: {
    50: "#fff1f2",
    100: "#ffe4e6",
    500: "#f43f5e",
    600: "#e11d48",
    700: "#be123c",
  },
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
} as const;

export const CHART_PALETTE = [
  "#10b981", // Emerald - Revenue/Positive
  "#3b82f6", // Blue - Primary/Sales
  "#f59e0b", // Amber - Pending/Warning
  "#ef4444", // Red - Expense/Negative
  "#8b5cf6", // Purple - Accent/Procurement
  "#06b6d4", // Cyan - Info/Stock
  "#ec4899", // Pink - Secondary
];

export const GRADIENTS = {
  emerald: "from-emerald-500 to-teal-700",
  sky: "from-sky-500 to-blue-700",
  violet: "from-violet-500 to-purple-700",
  amber: "from-amber-500 to-orange-700",
  rose: "from-rose-500 to-red-700",
  dark: "from-slate-800 to-slate-950",
} as const;
