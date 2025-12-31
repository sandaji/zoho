/**
 * Custom hook for inventory data management
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getProducts,
  getInventoryStats,
  getCategories,
  getBranches,
  exportInventoryToCSV,
  type Product,
  type InventoryStats,
} from "@/lib/api/inventory.api";
import { toast } from "sonner";

interface UseInventoryOptions {
  autoFetch?: boolean;
  initialPage?: number;
  initialLimit?: number;
}

export function useInventory(options: UseInventoryOptions = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { autoFetch = true } = options;

  // Parameters from URL
  const pageParam = parseInt(searchParams.get("page") || "1");
  const limitParam = parseInt(searchParams.get("limit") || "10");
  const searchParam = searchParams.get("search") || "";
  const categoryParam = searchParams.get("category") || "all";
  const statusParam = searchParams.get("status") || "all";
  const sortByParam = searchParams.get("sortBy") || "createdAt";
  const sortOrderParam = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [branches, setBranches] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [pagination, setPagination] = useState({
    page: pageParam,
    limit: limitParam,
    total: 0,
    totalPages: 0,
  });

  // Filter & Sort State
  const [filters, setFilters] = useState({
    search: searchParam,
    category: categoryParam,
    status: statusParam,
    sortBy: sortByParam,
    sortOrder: sortOrderParam,
  });

  /**
   * Fetch products from API
   */
  const fetchProducts = useCallback(
    async (params?: {
      page?: number;
      search?: string;
      category?: string;
      status?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }) => {
      setIsLoading(true);
      setError(null);

      try {
        const fetchParams = {
          page: params?.page || pagination.page,
          limit: pagination.limit,
          search: params?.search !== undefined ? params.search : filters.search,
          category: params?.category || filters.category,
          status: params?.status || filters.status,
          sortBy: params?.sortBy || filters.sortBy,
          sortOrder: params?.sortOrder || filters.sortOrder,
        };

        const response = await getProducts(fetchParams);

        setProducts(response.data.products);
        setPagination(response.data.pagination);

        // Update URL
        const newParams = new URLSearchParams(searchParams.toString());
        if (fetchParams.page > 1) newParams.set("page", fetchParams.page.toString());
        else newParams.delete("page");
        
        if (fetchParams.search) newParams.set("search", fetchParams.search);
        else newParams.delete("search");
        
        if (fetchParams.category !== "all") newParams.set("category", fetchParams.category);
        else newParams.delete("category");
        
        if (fetchParams.status !== "all") newParams.set("status", fetchParams.status);
        else newParams.delete("status");

        if (fetchParams.sortBy !== "createdAt") newParams.set("sortBy", fetchParams.sortBy);
        else newParams.delete("sortBy");

        if (fetchParams.sortOrder !== "desc") newParams.set("sortOrder", fetchParams.sortOrder);
        else newParams.delete("sortOrder");

        router.replace(`?${newParams.toString()}`, { scroll: false });

      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch products";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.page, pagination.limit, filters, searchParams, router]
  );

  /**
   * Fetch inventory statistics
   */
  const fetchStats = useCallback(async () => {
    try {
      const response = await getInventoryStats();
      setStats(response.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  /**
   * Fetch categories
   */
  const fetchCategories = useCallback(async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }, []);

  /**
   * Fetch branches
   */
  const fetchBranches = useCallback(async () => {
    try {
      const response = await getBranches();
      setBranches(response.data.branches);
    } catch (err) {
      console.error("Failed to fetch branches:", err);
      // Branches might not be accessible to all users
      setBranches([]);
    }
  }, []);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchProducts(),
      fetchStats(),
      fetchCategories(),
      fetchBranches(),
    ]);
  }, [fetchProducts, fetchStats, fetchCategories, fetchBranches]);

  /**
   * Update search filter
   */
  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  /**
   * Update category filter
   */
  const setCategory = useCallback((category: string) => {
    setFilters((prev) => ({ ...prev, category }));
  }, []);

  /**
   * Update status filter
   */
  const setStatus = useCallback((status: string) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  /**
   * Update sort field and order
   */
  const setSort = useCallback(
    (sortBy: string, sortOrder?: "asc" | "desc") => {
      setFilters((prev) => {
        const newOrder = sortOrder || (prev.sortBy === sortBy && prev.sortOrder === "asc" ? "desc" : "asc");
        return { ...prev, sortBy, sortOrder: newOrder };
      });
    },
    []
  );

  /**
   * Go to specific page
   */
  const goToPage = useCallback(
    (page: number) => {
      setPagination((prev) => ({ ...prev, page }));
      fetchProducts({ page });
    },
    [fetchProducts]
  );

  /**
   * Export current products
   */
  const exportData = useCallback(() => {
    try {
      exportInventoryToCSV(products);
      toast.success("Inventory exported successfully");
    } catch (err) {
      toast.error("Failed to export inventory");
    }
  }, [products]);

  /**
   * Filtered products (handled server-side now, but keeping for compatibility)
   */
  const filteredProducts = products;

  /**
   * Calculate derived data
   */
  const lowStockProducts = filteredProducts.filter(
    (p) => p.quantity <= p.reorder_level && p.quantity > 0
  );

  const outOfStockProducts = filteredProducts.filter((p) => p.quantity === 0);

  const totalValue = filteredProducts.reduce(
    (sum, p) => sum + p.quantity * p.cost_price,
    0
  );

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      refresh();
    }
  }, [autoFetch]);

  // Fetch products when sort or filters change
  useEffect(() => {
    if (autoFetch) {
      fetchProducts({ page: 1 });
    }
  }, [filters.category, filters.status, filters.sortBy, filters.sortOrder, filters.search, autoFetch]);

  return {
    // Data
    products: filteredProducts,
    stats: stats || {
      totalItems: filteredProducts.length,
      totalValue,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      categoriesCount: categories.length,
      activeProducts: filteredProducts.filter((p) => p.status === "active")
        .length,
    },
    categories,
    branches,
    pagination,

    // Derived data
    lowStockProducts,
    outOfStockProducts,

    // State
    isLoading,
    error,

    // Filters
    filters,
    setSearch,
    setCategory,
    setStatus,
    setSort,

    // Actions
    refresh,
    fetchProducts,
    goToPage,
    exportData,
  };
}
