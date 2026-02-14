"use client";

import { useEffect, useState } from "react";
import { format, startOfYear } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { API_ENDPOINTS, getAuthHeaders, getApiUrl } from "@/lib/api-config";
import { Loader2, CalendarIcon, Download, RefreshCw, ArrowUpRight, ArrowDownRight } from "lucide-react";
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

interface AccountItem {
  id: string;
  account_code: string;
  account_name: string;
  category: string;
  amount: number;
}

interface ProfitLossData {
  revenueItems: AccountItem[];
  expenseItems: AccountItem[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

export default function ProfitLossPage() {
  const [startDate, setStartDate] = useState<Date>(startOfYear(new Date()));
  const [endDate, setEndDate] = useState<Date>(new Date());

  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const url = `${getApiUrl(API_ENDPOINTS.FINANCE_PROFIT_LOSS)}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;

      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("Failed to fetch report");

      const json = await res.json();
      setData(json.data);
    } catch (error) {
      toast.error("Error loading Profit & Loss");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  const AccountSection = ({ title, accounts, total, positiveIsGood = true }: { title: string, accounts: AccountItem[], total: number, positiveIsGood?: boolean }) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4 bg-muted p-2 rounded">{title}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Account Name</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                No transactions
              </TableCell>
            </TableRow>
          ) : (
            accounts.map((acc) => (
              <TableRow key={acc.id}>
                <TableCell className="font-mono text-xs">{acc.account_code}</TableCell>
                <TableCell>{acc.account_name}</TableCell>
                <TableCell className="text-right">{formatCurrency(acc.amount)}</TableCell>
              </TableRow>
            ))
          )}
          <TableRow className="bg-muted/50 font-bold">
            <TableCell colSpan={2}>Total {title}</TableCell>
            <TableCell className={cn("text-right", positiveIsGood ? "text-green-600" : "text-red-600")}>
              {formatCurrency(total)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );

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
          <h1 className="text-3xl font-bold tracking-tight">Profit & Loss</h1>
          <p className="text-muted-foreground">
            Income Statement for {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
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
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(data.totalRevenue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(data.totalExpenses)}</div>
              </CardContent>
            </Card>
            <Card className={cn("border-l-4", data.netIncome >= 0 ? "border-l-green-500" : "border-l-red-500")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Income</CardTitle>
                {data.netIncome >= 0 ? <ArrowUpRight className="h-4 w-4 text-green-500" /> : <ArrowDownRight className="h-4 w-4 text-red-500" />}
              </CardHeader>
              <CardContent>
                <div className={cn("text-2xl font-bold", data.netIncome >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatCurrency(data.netIncome)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Detailed Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <AccountSection title="Revenue (Income)" accounts={data.revenueItems} total={data.totalRevenue} />
              <AccountSection title="Expenses" accounts={data.expenseItems} total={data.totalExpenses} positiveIsGood={false} />

              <div className="mt-8 pt-4 border-t border-double border-t-4 flex justify-between items-center font-bold text-xl">
                <span>Net Income (Loss)</span>
                <span className={data.netIncome >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(data.netIncome)}</span>
              </div>
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
