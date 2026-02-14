"use client"
import { useEffect, useState } from 'react';
import { formatCurrency } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiClient } from '@/lib/api-client';
import { AlertCircle } from 'lucide-react';

interface IncomeStatementData {
  revenue: number;
  cogs: number;
  operatingExpenses: number;
  taxes: number;
}

const IncomeStatement = () => {
  const [data, setData] = useState<IncomeStatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.request<IncomeStatementData>('/v1/finance/income-statement', 'GET');
        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.error?.message || 'Failed to fetch income statement');
        }
      } catch (err) {
        setError('An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);


  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse bg-gray-200 dark:bg-gray-800 rounded-md" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const grossProfit = data.revenue - data.cogs;
  const operatingIncome = grossProfit - data.operatingExpenses;
  const netIncome = operatingIncome - data.taxes;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Statement</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Item</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Revenue</TableCell>
              <TableCell className="text-right">{formatCurrency(data.revenue)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Cost of Goods Sold (COGS)</TableCell>
              <TableCell className="text-right text-red-500">({formatCurrency(data.cogs)})</TableCell>
            </TableRow>
            <TableRow className="font-semibold bg-gray-50 dark:bg-gray-800">
              <TableCell>Gross Profit</TableCell>
              <TableCell className="text-right">{formatCurrency(grossProfit)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Operating Expenses</TableCell>
              <TableCell className="text-right text-red-500">({formatCurrency(data.operatingExpenses)})</TableCell>
            </TableRow>
            <TableRow className="font-semibold bg-gray-50 dark:bg-gray-800">
              <TableCell>Operating Income</TableCell>
              <TableCell className="text-right">{formatCurrency(operatingIncome)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Taxes</TableCell>
              <TableCell className="text-right text-red-500">({formatCurrency(data.taxes)})</TableCell>
            </TableRow>
            <TableRow className="font-bold text-lg bg-gray-100 dark:bg-gray-700">
              <TableCell>Net Income</TableCell>
              <TableCell className="text-right">{formatCurrency(netIncome)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default IncomeStatement;
