/**
 * Centralized Module Theme Accents & Colors
 * Aligns module colors across navigation, headers, stat cards, and charts
 */

export interface ModuleAccentStyle {
  text: string;
  icon: string;
  active: string;
  line: string;
  bg: string;
  border: string;
  badge: string;
  chartColor: string;
}

export const MODULE_ACCENTS: Record<string, ModuleAccentStyle> = {
  home: {
    text: "text-slate-200",
    icon: "text-slate-300",
    active: "bg-slate-700 text-white",
    line: "bg-slate-300",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    badge: "bg-slate-500/10 text-slate-300",
    chartColor: "#94a3b8",
  },
  sales: {
    text: "text-emerald-300",
    icon: "text-emerald-400",
    active: "bg-emerald-500/15 text-emerald-200",
    line: "bg-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    badge: "bg-emerald-500/10 text-emerald-300",
    chartColor: "#10b981",
  },
  inventory: {
    text: "text-sky-300",
    icon: "text-sky-400",
    active: "bg-sky-500/15 text-sky-200",
    line: "bg-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    badge: "bg-sky-500/10 text-sky-300",
    chartColor: "#0ea5e9",
  },
  finance: {
    text: "text-amber-300",
    icon: "text-amber-400",
    active: "bg-amber-500/15 text-amber-200",
    line: "bg-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    badge: "bg-amber-500/10 text-amber-300",
    chartColor: "#f59e0b",
  },
  procurement: {
    text: "text-violet-300",
    icon: "text-violet-400",
    active: "bg-violet-500/15 text-violet-200",
    line: "bg-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    badge: "bg-violet-500/10 text-violet-300",
    chartColor: "#8b5cf6",
  },
  hr: {
    text: "text-rose-300",
    icon: "text-rose-400",
    active: "bg-rose-500/15 text-rose-200",
    line: "bg-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    badge: "bg-rose-500/10 text-rose-300",
    chartColor: "#f43f5e",
  },
  logistics: {
    text: "text-teal-300",
    icon: "text-teal-400",
    active: "bg-teal-500/15 text-teal-200",
    line: "bg-teal-400",
    bg: "bg-teal-500/10",
    border: "border-teal-500/20",
    badge: "bg-teal-500/10 text-teal-300",
    chartColor: "#14b8a6",
  },
  admin: {
    text: "text-indigo-300",
    icon: "text-indigo-400",
    active: "bg-indigo-500/15 text-indigo-200",
    line: "bg-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    badge: "bg-indigo-500/10 text-indigo-300",
    chartColor: "#6366f1",
  },
};

export function getModuleAccent(moduleId: string): ModuleAccentStyle {
  if (!moduleId) return MODULE_ACCENTS.home;
  const key = moduleId.toLowerCase();
  return MODULE_ACCENTS[key] || MODULE_ACCENTS.home;
}
