"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Crown, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminBranchProvider } from "@/lib/AdminBranchContext";

import AdminOverview from "@/components/admin/AdminOverview";
import BranchesSection from "@/components/admin/BranchesSection";
import WarehousesSection from "@/components/admin/WarehousesSection";
import UsersSection from "@/components/admin/UsersSection";
import ProductsSection from "@/components/admin/ProductsSection";
import SalesSection from "@/components/admin/SalesSection";
import DeliveriesSection from "@/components/admin/DeliveriesSection";
import FinanceSection from "@/components/admin/FinanceSection";
import PayrollSection from "@/components/admin/PayrollSection";
import RolesSection from "@/components/admin/RolesSection";
import CreditNotesSection from "@/components/admin/CreditNotesSection";

const SECTION_META: Record<string, { title: string; subtitle: string; icon: React.ElementType }> = {
  overview: {
    title: "System Overview",
    subtitle: "Live snapshot across all operations",
    icon: Crown,
  },
  branches: {
    title: "Branch Management",
    subtitle: "Monitor and manage all branch locations",
    icon: Shield,
  },
  warehouses: {
    title: "Warehouse Management",
    subtitle: "Storage facilities and inventory allocation",
    icon: Shield,
  },
  users: {
    title: "User Management",
    subtitle: "Staff accounts, roles, and access levels",
    icon: Shield,
  },
  products: {
    title: "Product Catalog",
    subtitle: "SKUs, pricing, and stock management",
    icon: Shield,
  },
  sales: { title: "Sales Orders", subtitle: "All POS and manual transactions", icon: Shield },
  deliveries: {
    title: "Delivery Management",
    subtitle: "Fleet dispatch and delivery tracking",
    icon: Shield,
  },
  finance: {
    title: "Finance & Transactions",
    subtitle: "Ledger entries, income and expenses",
    icon: Shield,
  },
  payroll: {
    title: "Payroll Management",
    subtitle: "Employee salary records and disbursements",
    icon: Shield,
  },
  roles: {
    title: "Roles & Permissions",
    subtitle: "Define access control for all system roles",
    icon: Shield,
  },
  credit_notes: { title: "Credit Notes", subtitle: "Manage returns and refunds", icon: Shield },
};

export default function AdminDashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = searchParams.get("section") || "overview";

  const isAdminUser = user?.role === "admin" || user?.role === "super_admin";

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !isAdminUser) {
      const roleRoutes: Record<string, string> = {
        procurement: "/dashboard/purchasing",
        cashier: "/dashboard/pos",
        warehouse_staff: "/dashboard/inventory",
        driver: "/dashboard/fleet",
        hr: "/dashboard/employees",
        accountant: "/dashboard/finance",
      };
      const fallback = roleRoutes[user?.role ?? ""] ?? "/dashboard";
      router.replace(fallback);
    }
  }, [isLoading, isAuthenticated, isAdminUser, user, router]);

  // Return nothing while auth is resolving or if user isn't admin — no flash of forbidden UI
  if (isLoading || !user || !isAdminUser) return null;

  const renderSection = () => {
    switch (section) {
      case "overview":
        return <AdminOverview />;
      case "branches":
        return <BranchesSection />;
      case "warehouses":
        return <WarehousesSection />;
      case "users":
        return <UsersSection />;
      case "products":
        return <ProductsSection />;
      case "sales":
        return <SalesSection />;
      case "deliveries":
        return <DeliveriesSection />;
      case "finance":
        return <FinanceSection />;
      case "payroll":
        return <PayrollSection />;
      case "roles":
        return <RolesSection />;
      case "credit_notes":
        return <CreditNotesSection />;
      default:
        return <AdminOverview />;
    }
  };

  const meta = SECTION_META[section as keyof typeof SECTION_META] || SECTION_META["overview"];
  const MetaIcon = meta!.icon;

  return (
    <AdminBranchProvider>
      <div className="flex flex-col min-h-full bg-emerald-50/20">
        {/* ── Page heading strip ──────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 border-b border-emerald-100 bg-white/95 backdrop-blur-sm px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  section === "overview" ? "bg-yellow-400" : "bg-emerald-100"
                )}
              >
                <MetaIcon
                  className={cn(
                    "h-4 w-4",
                    section === "overview" ? "text-emerald-900" : "text-emerald-700"
                  )}
                />
              </div>
              <div>
                <h1 className="text-base font-bold leading-none text-emerald-900">{meta!.title}</h1>
                <p className="mt-0.5 text-xs text-emerald-500">{meta!.subtitle}</p>
              </div>
            </div>

            {/* Super Admin pill */}
            <div className="flex items-center gap-1.5 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1">
              <Crown className="h-3.5 w-3.5 text-yellow-600" />
              <span className="text-xs font-semibold text-yellow-800">Super Admin</span>
            </div>
          </div>
        </div>

        {/* ── Section content ─────────────────────────────────────────────── */}
        <main className="flex-1 p-5">{renderSection()}</main>
      </div>
    </AdminBranchProvider>
  );
}
