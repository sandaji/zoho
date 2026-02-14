"use client";

import { useEffect, useState } from "react";
import { format, startOfYear } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { API_ENDPOINTS, getAuthHeaders, getApiUrl } from "@/lib/api-config";
import { Loader2, CalendarIcon, Download, RefreshCw, ArrowUp, ArrowDown } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CashFlowEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  account: string;
}

interface CashFlowData {
  summary: {
    cashIn: number;
    cashOut: number;
    netChange: number;
  };
  details: CashFlowEntry[];
}

export default function CashFlowPage() {
  const [startDate, setStartDate] = useState<Date>(startOfYear(new Date()));
  const [endDate, setEndDate] = useState<Date>(new Date());

  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const url = `${getApiUrl(API_ENDPOINTS.FINANCE_CASH_FLOW)}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;

      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("Failed to fetch report");

      const json = await res.json();
      setData(json.data);
    } catch (error) {
      toast.error("Error loading Cash Flow");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  const DatePicker = ({ date, setDate, label }: { date: Date, setDate: (d: Date) => void, label: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[180px] justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{label}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && setDate(d)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Statement of Cash Flows</h1>
          <p className="text-muted-foreground">
            Direct Cash Movements for {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
          </p>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <DatePicker date={startDate} setDate={setStartDate} label="Start Date" />
          <span className="text-muted-foreground">-</span>
          <DatePicker date={endDate} setDate={setEndDate} label="End Date" />

          <Button variant="outline" onClick={fetchReport} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 gap-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cash In</CardTitle>
                <ArrowUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(data.summary.cashIn)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cash Out</CardTitle>
                <ArrowDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(data.summary.cashOut)}</div>
              </CardContent>
            </Card>
            <Card className={cn("border-l-4", data.summary.netChange >= 0 ? "border-l-green-500" : "border-l-red-500")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Change in Cash</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn("text-2xl font-bold", data.summary.netChange >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatCurrency(data.summary.netChange)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Cash Transaction Details</CardTitle>
              <CardDescription>All transactions affecting Cash/Bank accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.details.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No cash transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.details.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.date), "MMM d, yyyy")}</TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell>{entry.account}</TableCell>
                        <TableCell className={cn("text-right font-medium", entry.amount >= 0 ? "text-green-600" : "text-red-600")}>
                          {formatCurrency(entry.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-10 text-muted-foreground">
          No data available.
        </div>
      )}
    </div>
  );
}
