"use client";

import { useAuth } from "@/lib/auth-context";
import { useHasPermission } from "@/hooks/use-permissions";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, } from "react";
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

export default function AdminDashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { hasAnyPermission } = useHasPermission();
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = searchParams.get("section") || "overview";

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user?.role !== "admin" && !hasAnyPermission(['admin.user.manage', 'admin.branch.manage'])))) {
      router.push("/auth/login");
    }
  }, [isLoading, isAuthenticated, user, router, hasAnyPermission]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (user.role !== "admin" && !hasAnyPermission(['admin.user.manage', 'admin.branch.manage'])) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-slate-600">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    );
  }

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
      default:
        return <AdminOverview />;
    }
  };

  const getSectionTitle = () => {
    const titles: Record<string, string> = {
      overview: "Admin Module",
      branches: "Branch Management",
      warehouses: "Warehouse Management",
      users: "User Management",
      products: "Product Management",
      sales: "Sales Overview",
      deliveries: "Delivery Management",
      finance: "Finance Overview",
      payroll: "Payroll Management",
      roles: "Roles & Permissions",
    };
    return titles[section] || "Admin Dashboard";
  };

  return (
    <div className="">
      {/* Page Header */}
      <div className="mb-2 px-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{getSectionTitle()}</h1>
        {/* <p className="text-slate-600">
          Manage and monitor all aspects of your ERP system
        </p> */}
      </div>

      {/* Section Content */}
      <div className="bg-emerald-50 rounded-lg shadow-sm pl-4 pt-2">
        {renderSection()}
      </div>
    </div>
  );
}
