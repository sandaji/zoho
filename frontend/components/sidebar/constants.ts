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
  admin: "bg-purple-500/15 text-purple-300",
  super_admin: "bg-amber-500/15 text-amber-300",
  branch_manager: "bg-blue-500/15 text-blue-300",
  manager: "bg-indigo-500/15 text-indigo-300",
  accountant: "bg-emerald-500/15 text-emerald-300",
  hr: "bg-pink-500/15 text-pink-300",
  cashier: "bg-cyan-500/15 text-cyan-300",
  warehouse_staff: "bg-orange-500/15 text-orange-300",
  driver: "bg-yellow-500/15 text-yellow-300",
  procurement: "bg-violet-500/15 text-violet-300",
  user: "bg-slate-500/15 text-slate-300",
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