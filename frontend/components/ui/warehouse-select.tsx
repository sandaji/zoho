"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { fetchWarehouses, Warehouse } from "@/lib/admin-api";

interface WarehouseSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function WarehouseSelect({
  value,
  onValueChange,
  disabled,
}: WarehouseSelectProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    const loadWarehouses = async () => {
      if (!token) return;
      try {
        const data = await fetchWarehouses(token);
        setWarehouses(data || []);
      } catch (error) {
        console.error("Error fetching warehouses:", error);
        toast.error("Failed to load warehouses");
      } finally {
        setIsLoading(false);
      }
    };

    loadWarehouses();
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-2 border rounded-md">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 text-sm text-gray-500">Loading warehouses...</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select warehouse (default: main)" />
      </SelectTrigger>
      <SelectContent>
        {warehouses.map((warehouse) => (
          <SelectItem key={warehouse.id} value={warehouse.id}>
            {warehouse.code} - {warehouse.name} ({warehouse.location})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
