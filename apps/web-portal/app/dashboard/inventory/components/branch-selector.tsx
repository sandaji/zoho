"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin } from "lucide-react";

interface BranchSelectorProps {
  branches: Array<{ id: string; name: string }>;
  selectedBranch: string;
  onBranchChange: (branchId: string) => void;
  isLoading?: boolean;
}

export function BranchSelector({
  branches,
  selectedBranch,
  onBranchChange,
  isLoading,
}: BranchSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 text-slate-600 dark:text-slate-400" />
      <Select value={selectedBranch} onValueChange={onBranchChange} disabled={isLoading}>
        <SelectTrigger className="w-48 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
          <SelectValue placeholder="Select branch..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Branches</SelectItem>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
