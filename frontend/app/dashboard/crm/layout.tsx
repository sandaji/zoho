"use client";

import { useAuth } from "@/lib/auth-context";
import { useHasPermission } from "@/hooks/use-permissions";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Users, Truck, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const CRM_SECTIONS = {
  customers: {
    label: "Customers",
    icon: Users,
    href: "/dashboard/crm/customers",
    permissions: ["sales.customer.view", "sales.customer.manage"],
  },
  vendors: {
    label: "Vendors",
    icon: Truck,
    href: "/dashboard/crm/vendors",
    permissions: ["purchasing.vendor.view", "purchasing.vendor.manage"],
  },
};

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { hasAnyPermission } = useHasPermission();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (
      !isLoading &&
      (!isAuthenticated ||
        !hasAnyPermission([
          "sales.customer.view",
          "sales.customer.manage",
          "purchasing.vendor.view",
          "purchasing.vendor.manage",
        ]))
    ) {
      router.push("/auth/login");
    }
  }, [isLoading, isAuthenticated, hasAnyPermission, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-emerald-50/30">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600" />
          <p className="font-medium text-emerald-700">Loading CRM…</p>
        </div>
      </div>
    );
  }

  // Get available sections for this user
  const availableSections = Object.entries(CRM_SECTIONS).filter(([_, section]) =>
    hasAnyPermission(section.permissions)
  );

  if (availableSections.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-emerald-50/30">
        <div className="rounded-xl border border-red-100 bg-white p-10 text-center shadow-sm">
          <Users className="mx-auto mb-3 h-12 w-12 text-red-400" />
          <h1 className="text-xl font-bold text-red-600">Access Denied</h1>
          <p className="mt-1 text-sm text-slate-500">
            You don&apos;t have permission to access CRM.
          </p>
        </div>
      </div>
    );
  }

  // Determine current section from pathname
  const currentSection = Object.entries(CRM_SECTIONS).find(
    ([_, section]) => pathname.includes(section.href)
  )?.[0] as keyof typeof CRM_SECTIONS | undefined;


  return (
    <div className="flex flex-col min-h-screen bg-emerald-50/20">
      {/* ── Navigation Header ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-emerald-100 bg-white/95 backdrop-blur-sm px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Back Button & Title */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg hover:bg-emerald-50 p-2 transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5 text-emerald-700" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-emerald-900">CRM Module</h1>
              <p className="text-xs text-emerald-500">Customers & Vendors Management</p>
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex gap-2">
            {availableSections.map(([key, sectionConfig]) => {
              const Icon = sectionConfig.icon;
              const isActive =
                pathname.includes(sectionConfig.href) ||
                (key === currentSection);

              return (
                <Link
                  key={key}
                  href={sectionConfig.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-emerald-600 text-white shadow-md"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{sectionConfig.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
