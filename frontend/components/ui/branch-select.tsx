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
import { fetchBranches, Branch } from "@/lib/admin-api";

interface BranchSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function BranchSelect({
  value,
  onValueChange,
  disabled,
}: BranchSelectProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    const loadBranches = async () => {
      if (!token) return;
      try {
        const data = await fetchBranches(token);
        setBranches(data || []);
      } catch (error) {
        console.error("Error fetching branches:", error);
        toast.error("Failed to load branches");
      } finally {
        setIsLoading(false);
      }
    };

    loadBranches();
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-2 border rounded-md">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 text-sm text-gray-500">Loading branches...</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select branch" />
      </SelectTrigger>
      <SelectContent>
        {branches.map((branch) => (
          <SelectItem key={branch.id} value={branch.id}>
            {branch.code} - {branch.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
