"use client";

import { Store, Calendar, ChevronDown, RefreshCw, Download, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface HeaderProps {
  user: any;
  timeRange: string;
  onTimeRangeChange: (r: string) => void;
  onRefresh: () => void;
  onExport: (fmt: "csv" | "pdf") => void;
  loading: boolean;
  exporting: boolean;
}

const TIME_RANGES = ["day", "week", "month", "quarter"];

export function DashboardHeader({
  user,
  timeRange,
  onTimeRangeChange,
  onRefresh,
  onExport,
  loading,
  exporting,
}: HeaderProps) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-white px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <Store className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none text-emerald-900">
              Branch Manager Dashboard
            </h1>
            <p className="mt-0.5 text-sm text-emerald-600">
              Welcome back,{" "}
              <span className="font-semibold text-emerald-800">{user?.name}</span>
            </p>
          </div>
        </div>

        {/* Right: controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Branch selector (static label – extend when branch API is available) */}
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
            <Store className="h-3.5 w-3.5" />
            <span>Main Branch</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </div>

          {/* Time range picker */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span className="capitalize">{timeRange}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {TIME_RANGES.map((r) => (
                <DropdownMenuItem
                  key={r}
                  onClick={() => onTimeRangeChange(r)}
                  className={cn(
                    "capitalize",
                    r === timeRange && "bg-emerald-50 font-semibold text-emerald-700"
                  )}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sync status + refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className={cn(
              "gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50",
              loading && "opacity-70"
            )}
          >
            {loading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span className="text-xs">Syncing…</span>
              </>
            ) : (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs">Live</span>
              </>
            )}
          </Button>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                disabled={exporting || loading}
                className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Download className="h-3.5 w-3.5" />
                {exporting ? "Exporting…" : "Export"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport("csv")}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("pdf")}>Export as PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
