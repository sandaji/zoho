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
import { fetchVendors } from "@/lib/admin-api";

// Inline interface for Vendor as it might not be in admin-api yet
interface Vendor {
  id: string;
  code: string;
  name: string;
}

interface VendorSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function VendorSelect({
  value,
  onValueChange,
  disabled,
}: VendorSelectProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    const loadVendors = async () => {
      if (!token) return;
      try {
        const data = await fetchVendors(token);
        setVendors(data || []);
      } catch (error) {
        console.error("Error fetching vendors:", error);
        toast.error("Failed to load vendors");
      } finally {
        setIsLoading(false);
      }
    };

    loadVendors();
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-2 border rounded-md">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 text-sm text-gray-500">Loading vendors...</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select a vendor" />
      </SelectTrigger>
      <SelectContent>
        {vendors.map((vendor) => (
          <SelectItem key={vendor.id} value={vendor.id}>
            {vendor.code} - {vendor.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
