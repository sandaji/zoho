"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "lucide-react";
import { fetchFiscalPeriods } from "@/app/dashboard/finance/lib/api";
import type { FiscalPeriod } from "@/app/dashboard/finance/types";

interface PeriodSelectorProps {
  onPeriodChange?: (period: FiscalPeriod) => void;
  className?: string;
}

export const PeriodSelector = ({ onPeriodChange, className }: PeriodSelectorProps) => {
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<FiscalPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    const loadPeriods = async () => {
      try {
        const response = await fetchFiscalPeriods();
        if (response.success && response.data?.periods) {
          setPeriods(response.data.periods);
          if (response.data.currentPeriod) {
            setCurrentPeriod(response.data.currentPeriod);
            setSelectedId(response.data.currentPeriod.id);
          } else if (response.data.periods.length > 0) {
            // Default to first period if no current period specified
            setCurrentPeriod(response.data.periods[0]);
            setSelectedId(response.data.periods[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading fiscal periods:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPeriods();
  }, []);

  const handlePeriodChange = (periodId: string) => {
    setSelectedId(periodId);
    const selected = periods.find((p) => p.id === periodId);
    if (selected) {
      setCurrentPeriod(selected);
      onPeriodChange?.(selected);
    }
  };

  const formatPeriodLabel = (period: FiscalPeriod): string => {
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);

    if (period.month) {
      return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(startDate);
    } else if (period.quarter) {
      return `Q${period.quarter} ${period.year}`;
    }

    return `FY ${period.year}`;
  };

  if (loading) {
    return (
      <div className={className}>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (periods.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-500" />
        <Select value={selectedId} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {periods.map((period) => (
              <SelectItem key={period.id} value={period.id}>
                <div className="flex items-center gap-2">
                  <span>{formatPeriodLabel(period)}</span>
                  {period.status === "locked" && (
                    <span className="text-xs text-gray-500">(Locked)</span>
                  )}
                  {period.status === "closed" && (
                    <span className="text-xs text-gray-500">(Closed)</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {currentPeriod && (
        <div className="mt-2 text-xs text-gray-500">
          {new Date(currentPeriod.startDate).toLocaleDateString()} to{" "}
          {new Date(currentPeriod.endDate).toLocaleDateString()}
          {currentPeriod.status === "locked" && (
            <span className="ml-2 text-blue-600 font-medium">(Locked - No edits allowed)</span>
          )}
        </div>
      )}
    </div>
  );
};
