import { Store, Calendar, ChevronRight, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface HeaderProps {
  user: any;
  timeRange: string;
  onTimeRangeChange: (r: string) => void;
  onRefresh: () => void;
  onExport: (fmt: "csv" | "pdf") => void;
  loading: boolean;
  exporting: boolean;
}

export function DashboardHeader({ user, timeRange, onTimeRangeChange, onRefresh, onExport, loading, exporting }: HeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Branch Manager Dashboard</h1>
        <div className="flex items-center gap-2 mt-2">
          <Store className="h-4 w-4 text-slate-500" />
          <p className="text-slate-600">
            Welcome back, <span className="font-semibold">{user?.name}</span>
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Time Range Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="capitalize">{timeRange}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {['day', 'week', 'month', 'quarter'].map(r => (
              <DropdownMenuItem key={r} onClick={() => onTimeRangeChange(r)}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={exporting || loading} className="gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExport("csv")}>CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("pdf")}>PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}