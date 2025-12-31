"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { API_ENDPOINTS, getAuthHeaders, getApiUrl } from "@/lib/api-config";
import { Loader2, CalendarIcon, Download, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AccountBalance {
  id: string;
  account_code: string;
  account_name: string;
  category: string;
  balance: number;
}

interface BalanceSheetData {
  assets: AccountBalance[];
  liabilities: AccountBalance[];
  equity: AccountBalance[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export default function BalanceSheetPage() {
  const [date, setDate] = useState<Date>(new Date());
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${getApiUrl(API_ENDPOINTS.FINANCE_BALANCE_SHEET)}?date=${date.toISOString()}`,
        {
          headers: getAuthHeaders(),
        }
      );
      
      if (!res.ok) throw new Error("Failed to fetch report");
      
      const json = await res.json();
      setData(json.data);
    } catch (error) {
      toast.error("Error loading Balance Sheet");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [date]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount);
  };

  const AccountSection = ({ title, accounts, total }: { title: string, accounts: AccountBalance[], total: number }) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4 bg-muted p-2 rounded">{title}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Account Name</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.length === 0 ? (
             <TableRow>
               <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                 No active accounts
               </TableCell>
             </TableRow>
          ) : (
            accounts.map((acc) => (
              <TableRow key={acc.id}>
                <TableCell className="font-mono text-xs">{acc.account_code}</TableCell>
                <TableCell>{acc.account_name}</TableCell>
                <TableCell className="text-right">{formatCurrency(acc.balance)}</TableCell>
              </TableRow>
            ))
          )}
          <TableRow className="bg-muted/50 font-bold">
            <TableCell colSpan={2}>Total {title}</TableCell>
            <TableCell className="text-right">{formatCurrency(total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Balance Sheet</h1>
          <p className="text-muted-foreground">
            Financial position as of {format(date, "MMMM dd, yyyy")}
          </p>
        </div>
        
        <div className="flex gap-2">
           <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card className="lg:col-span-2">
             <CardHeader>
               <CardTitle>Total Assets = Liabilities + Equity</CardTitle>
               <CardDescription>
                  Assets: <span className="font-bold text-foreground">{formatCurrency(data.totalAssets)}</span> | 
                  Liabilities & Equity: <span className="font-bold text-foreground">{formatCurrency(data.totalLiabilities + data.totalEquity)}</span>
               </CardDescription>
             </CardHeader>
           </Card>

           <Card className="h-fit">
             <CardHeader>
               <CardTitle>Assets</CardTitle>
             </CardHeader>
             <CardContent>
                <AccountSection title="Assets" accounts={data.assets} total={data.totalAssets} />
             </CardContent>
           </Card>

           <Card className="h-fit">
             <CardHeader>
               <CardTitle>Liabilities & Equity</CardTitle>
             </CardHeader>
             <CardContent>
                <AccountSection title="Liabilities" accounts={data.liabilities} total={data.totalLiabilities} />
                <AccountSection title="Equity" accounts={data.equity} total={data.totalEquity} />
                
                <div className="mt-8 pt-4 border-t flex justify-between items-center font-bold text-lg">
                   <span>Total Liabilities + Equity</span>
                   <span>{formatCurrency(data.totalLiabilities + data.totalEquity)}</span>
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
