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
    text: "text-slate-700 dark:text-slate-200",
    icon: "text-slate-600 dark:text-slate-400",
    active: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white",
    line: "bg-slate-400 dark:bg-slate-300",
    bg: "bg-slate-50 dark:bg-slate-500/10",
    border: "border-slate-200 dark:border-slate-500/20",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300",
    chartColor: "#94a3b8",
  },
  sales: {
    text: "text-emerald-700 dark:text-emerald-300",
    icon: "text-emerald-600 dark:text-emerald-400",
    active: "bg-emerald-50 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200",
    line: "bg-emerald-500 dark:bg-emerald-400",
    bg: "bg-emerald-50/60 dark:bg-emerald-500/10",
    border: "border-emerald-200 dark:border-emerald-500/20",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    chartColor: "#10b981",
  },
  inventory: {
    text: "text-sky-700 dark:text-sky-300",
    icon: "text-sky-600 dark:text-sky-400",
    active: "bg-sky-50 text-sky-900 dark:bg-sky-500/20 dark:text-sky-200",
    line: "bg-sky-500 dark:bg-sky-400",
    bg: "bg-sky-50/60 dark:bg-sky-500/10",
    border: "border-sky-200 dark:border-sky-500/20",
    badge: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
    chartColor: "#0ea5e9",
  },
  finance: {
    text: "text-amber-700 dark:text-amber-300",
    icon: "text-amber-600 dark:text-amber-400",
    active: "bg-amber-50 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
    line: "bg-amber-500 dark:bg-amber-400",
    bg: "bg-amber-50/60 dark:bg-amber-500/10",
    border: "border-amber-200 dark:border-amber-500/20",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    chartColor: "#f59e0b",
  },
  procurement: {
    text: "text-violet-700 dark:text-violet-300",
    icon: "text-violet-600 dark:text-violet-400",
    active: "bg-violet-50 text-violet-900 dark:bg-violet-500/20 dark:text-violet-200",
    line: "bg-violet-500 dark:bg-violet-400",
    bg: "bg-violet-50/60 dark:bg-violet-500/10",
    border: "border-violet-200 dark:border-violet-500/20",
    badge: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
    chartColor: "#8b5cf6",
  },
  hr: {
    text: "text-rose-700 dark:text-rose-300",
    icon: "text-rose-600 dark:text-rose-400",
    active: "bg-rose-50 text-rose-900 dark:bg-rose-500/20 dark:text-rose-200",
    line: "bg-rose-500 dark:bg-rose-400",
    bg: "bg-rose-50/60 dark:bg-rose-500/10",
    border: "border-rose-200 dark:border-rose-500/20",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    chartColor: "#f43f5e",
  },
  logistics: {
    text: "text-teal-700 dark:text-teal-300",
    icon: "text-teal-600 dark:text-teal-400",
    active: "bg-teal-50 text-teal-900 dark:bg-teal-500/20 dark:text-teal-200",
    line: "bg-teal-500 dark:bg-teal-400",
    bg: "bg-teal-50/60 dark:bg-teal-500/10",
    border: "border-teal-200 dark:border-teal-500/20",
    badge: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
    chartColor: "#14b8a6",
  },
  admin: {
    text: "text-indigo-700 dark:text-indigo-300",
    icon: "text-indigo-600 dark:text-indigo-400",
    active: "bg-indigo-50 text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-200",
    line: "bg-indigo-500 dark:bg-indigo-400",
    bg: "bg-indigo-50/60 dark:bg-indigo-500/10",
    border: "border-indigo-200 dark:border-indigo-500/20",
    badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
    chartColor: "#6366f1",
  },
};

export function getModuleAccent(moduleId: string): ModuleAccentStyle {
  if (!moduleId) return MODULE_ACCENTS.home;
  const key = moduleId.toLowerCase();
  return MODULE_ACCENTS[key] || MODULE_ACCENTS.home;
}
