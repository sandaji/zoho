"use client";
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiClient } from '@/lib/api-client';
import { AlertCircle } from 'lucide-react';

interface ChartData {
  name: string;
  revenue: number;
  expenses: number;
}

const RevenueExpenseChart = () => {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.request<ChartData[]>('/v1/finance/revenue-expense-chart', 'GET');
        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.error?.message || 'Failed to fetch chart data');
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
    return <div className="h-[300px] w-full animate-pulse bg-gray-200 dark:bg-gray-800 rounded-md" />;
  }

  if (error) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-red-500">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="revenue" fill="#8884d8" />
        <Bar dataKey="expenses" fill="#82ca9d" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default RevenueExpenseChart;
