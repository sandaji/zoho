import type { UserRole } from "@/lib/types/admin";

export const ROLE_LABELS: Record<UserRole | string, string> = {
  admin: "Admin",
  super_admin: "Super Admin",
  branch_manager: "Branch Manager",
  manager: "Manager",
  accountant: "Accountant",
  hr: "HR",
  cashier: "Cashier",
  warehouse_staff: "Warehouse Staff",
  driver: "Driver",
  procurement: "Procurement",
  user: "User",
};

export const ROLE_COLORS: Record<UserRole | string, string> = {
  admin: "bg-purple-500/10 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-500/20",
  super_admin: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-500/20",
  branch_manager: "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-500/20",
  manager: "bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-500/20",
  accountant: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-500/20",
  hr: "bg-pink-500/10 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300 border-pink-500/20",
  cashier: "bg-cyan-500/10 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 border-cyan-500/20",
  warehouse_staff: "bg-orange-500/10 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 border-orange-500/20",
  driver: "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300 border-yellow-500/20",
  procurement: "bg-violet-500/10 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 border-violet-500/20",
  user: "bg-slate-500/10 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 border-slate-500/20",
};

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";

export function isActivePath(pathname: string | null, href: string): boolean {
  const [path, query] = href.split("?");
  if (query) {
    return (
      pathname === path && 
      typeof window !== "undefined" && 
      window.location.search === `?${query}`
    );
  }
  if (path === "/dashboard") return pathname === path;
  return Boolean(pathname?.startsWith(path));
}