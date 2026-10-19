/**
 * Centralized Module Theme Accents & Colors
 * Every module now shares the ERP primary accent (as on the Payroll page);
 * only chart colours differ per module so series stay distinguishable.
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

const PRIMARY_ACCENT: Omit<ModuleAccentStyle, "chartColor"> = {
  text: "text-foreground",
  icon: "text-primary",
  active: "bg-primary/10 text-primary",
  line: "bg-primary",
  bg: "bg-card",
  border: "border-border",
  badge: "bg-primary/10 text-primary",
};

const NEUTRAL_ACCENT: Omit<ModuleAccentStyle, "chartColor"> = {
  ...PRIMARY_ACCENT,
  icon: "text-muted-foreground",
  active: "bg-muted text-foreground",
  line: "bg-muted-foreground",
  badge: "bg-muted text-muted-foreground",
};

export const MODULE_ACCENTS: Record<string, ModuleAccentStyle> = {
  home: { ...NEUTRAL_ACCENT, chartColor: "#607080" },
  sales: { ...PRIMARY_ACCENT, chartColor: "#1060D0" },
  inventory: { ...PRIMARY_ACCENT, chartColor: "#1050A0" },
  finance: { ...PRIMARY_ACCENT, chartColor: "#D09020" },
  procurement: { ...PRIMARY_ACCENT, chartColor: "#168050" },
  hr: { ...PRIMARY_ACCENT, chartColor: "#D04040" },
  logistics: { ...PRIMARY_ACCENT, chartColor: "#4A87E0" },
  admin: { ...PRIMARY_ACCENT, chartColor: "#0B4088" },
  // Semantic variants accepted by <StatCard variant="...">
  default: { ...NEUTRAL_ACCENT, chartColor: "#607080" },
  success: {
    text: "text-foreground",
    icon: "text-success",
    active: "bg-success-muted text-success",
    line: "bg-success",
    bg: "bg-card",
    border: "border-border",
    badge: "bg-success-muted text-success",
    chartColor: "#168050",
  },
  emerald: {
    text: "text-foreground",
    icon: "text-success",
    active: "bg-success-muted text-success",
    line: "bg-success",
    bg: "bg-card",
    border: "border-border",
    badge: "bg-success-muted text-success",
    chartColor: "#168050",
  },
  warning: {
    text: "text-foreground",
    icon: "text-warning",
    active: "bg-warning-muted text-warning-foreground",
    line: "bg-warning",
    bg: "bg-card",
    border: "border-border",
    badge: "bg-warning-muted text-warning",
    chartColor: "#D09020",
  },
  amber: {
    text: "text-foreground",
    icon: "text-warning",
    active: "bg-warning-muted text-warning-foreground",
    line: "bg-warning",
    bg: "bg-card",
    border: "border-border",
    badge: "bg-warning-muted text-warning",
    chartColor: "#D09020",
  },
  danger: {
    text: "text-foreground",
    icon: "text-destructive",
    active: "bg-destructive/10 text-destructive",
    line: "bg-destructive",
    bg: "bg-card",
    border: "border-border",
    badge: "bg-destructive/10 text-destructive",
    chartColor: "#D04040",
  },
  rose: {
    text: "text-foreground",
    icon: "text-destructive",
    active: "bg-destructive/10 text-destructive",
    line: "bg-destructive",
    bg: "bg-card",
    border: "border-border",
    badge: "bg-destructive/10 text-destructive",
    chartColor: "#D04040",
  },
  info: { ...PRIMARY_ACCENT, chartColor: "#1050A0" },
  sky: { ...PRIMARY_ACCENT, chartColor: "#1050A0" },
};

export function getModuleAccent(moduleId: string): ModuleAccentStyle {
  if (!moduleId) return MODULE_ACCENTS.home;
  const key = moduleId.toLowerCase();
  return MODULE_ACCENTS[key] || MODULE_ACCENTS.home;
}
