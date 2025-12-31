//frontend\app\dashboard\branches\page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MdAttachMoney,
  MdPeople,
  MdTrendingUp,
  MdLocationOn,
  MdArrowForward,
} from "react-icons/md";
import { StatCard } from "@/components/ui/stats";
import { API_ENDPOINTS, getApiUrl, getAuthHeaders } from "@/lib/api-config";

interface BranchSummary {
  id: string;
  name: string;
  code: string;
  location: string;
  manager_name?: string;
  total_revenue: number;
  total_employees: number;
  inventory_value: number;
  sales_growth: number;
  profit_margin: number;
}

/**
 * Branches List Page
 * Shows all branches with quick stats and navigation to individual dashboards
 */
export default function BranchesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState<"all" | "revenue" | "employees">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranches = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(getApiUrl(API_ENDPOINTS.BRANCHES), {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch branches");
        }

        const data = await response.json();
        if (data.success) {
          setBranches(data.data);
        } else {
          throw new Error(data.message || "Failed to fetch branches");
        }
      } catch (err: any) {
        console.error("Error fetching branches:", err);
        setError(err.message || "An error occurred while fetching branches");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBranches();
  }, []);

  const filteredBranches = branches
    .filter(
      (branch) =>
        branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        branch.code.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (filterBy === "revenue") {
        return b.total_revenue - a.total_revenue;
      } else if (filterBy === "employees") {
        return b.total_employees - a.total_employees;
      }
      return 0;
    });

  const totalRevenue = branches.reduce((sum, b) => sum + b.total_revenue, 0);
  const totalEmployees = branches.reduce((sum, b) => sum + b.total_employees, 0);
  const avgProfitMargin =
    branches.length > 0
      ? branches.reduce((sum, b) => sum + b.profit_margin, 0) / branches.length
      : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading branches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 mb-6">
            <h3 className="font-bold text-lg mb-1">Failed to Load Branches</h3>
            <p className="text-sm opacity-90">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900">All Branches</h1>
          <p className="text-gray-600 mt-1">
            {branches.length} branches • Total revenue: ${totalRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Branches"
            value={branches.length}
            icon={<MdLocationOn />}
            variant="info"
            size="md"
          />
          <StatCard
            title="Total Revenue"
            value={totalRevenue}
            icon={<MdAttachMoney />}
            variant="success"
            prefix="$"
            size="md"
          />
          <StatCard
            title="Total Employees"
            value={totalEmployees}
            icon={<MdPeople />}
            variant="info"
            size="md"
          />
          <StatCard
            title="Avg Profit Margin"
            value={avgProfitMargin}
            icon={<MdTrendingUp />}
            variant="success"
            suffix="%"
            size="md"
          />
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search branches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="all">Sort By</option>
              <option value="revenue">Highest Revenue</option>
              <option value="employees">Most Employees</option>
            </select>
          </div>
        </div>

        {/* Branches Grid */}
        {filteredBranches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBranches.map((branch) => (
              <div
                key={branch.id}
                className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden cursor-pointer group"
                onClick={() => router.push(`/dashboard/branch/${branch.id}`)}
              >
                {/* Header */}
                <div className="bg-linear-to-r from-blue-500 to-blue-600 px-6 py-4 text-white">
                  <h3 className="text-lg font-bold">{branch.name}</h3>
                  <p className="text-blue-100 text-sm">{branch.code}</p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  {/* Location and Manager */}
                  <div className="flex items-start gap-2">
                    <MdLocationOn className="text-gray-400 shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">{branch.location}</p>
                      {branch.manager_name && (
                        <p className="text-sm text-gray-500 mt-1">Manager: {branch.manager_name}</p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Revenue</p>
                      <p className="text-lg font-bold text-gray-900 mt-1">
                        ${(branch.total_revenue / 1000).toFixed(0)}K
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Employees</p>
                      <p className="text-lg font-bold text-gray-900 mt-1">
                        {branch.total_employees}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Inventory</p>
                      <p className="text-lg font-bold text-gray-900 mt-1">
                        ${(branch.inventory_value / 1000).toFixed(0)}K
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Growth</p>
                      <p className="text-lg font-bold text-green-600 mt-1">
                        +{branch.sales_growth}%
                      </p>
                    </div>
                  </div>

                  {/* Profit Margin */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs text-gray-500 uppercase">Profit Margin</p>
                      <p className="font-semibold text-gray-900">{branch.profit_margin}%</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-linear-to-r from-green-400 to-green-600"
                        style={{ width: `${Math.min(branch.profit_margin, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between group-hover:bg-blue-50 transition-colors">
                  <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
                    View Dashboard
                  </span>
                  <MdArrowForward className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No branches found matching your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
