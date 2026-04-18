"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { fetchPLQuickPreview } from "@/app/dashboard/finance/lib/api";
import type { PLQuickPreview as PLQuickPreviewData } from "@/app/dashboard/finance/types";

export const PLQuickPreview = () => {
  const [current, setCurrent] = useState<PLQuickPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const response = await fetchPLQuickPreview();
        if (response.success && response.data?.current) {
          setCurrent(response.data.current);
        } else {
          setError(response.error?.message || "Failed to load P&L data");
        }
      } catch (err) {
        console.error("Error loading P&L preview:", err);
        setError("An error occurred");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">P&L Quick Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">{error}</span>
        </CardContent>
      </Card>
    );
  }

  if (!current) {
    return null;
  }

  const isProfit = current.netIncome > 0;

  const sections = [
    {
      label: "Revenue",
      value: current.revenue,
      indent: 0,
      highlight: true,
    },
    {
      label: "Cost of Goods Sold",
      value: -current.cogs,
      indent: 1,
      type: "expense",
    },
    {
      label: "Gross Profit",
      value: current.grossProfit,
      indent: 0,
      highlight: true,
      subtext: `${current.grossMarginPercent.toFixed(1)}% margin`,
    },
    {
      label: "Operating Expenses",
      value: -current.operatingExpenses,
      indent: 1,
      type: "expense",
    },
    {
      label: "Operating Income",
      value: current.operatingIncome,
      indent: 0,
      highlight: true,
    },
    {
      label: "Net Income",
      value: current.netIncome,
      indent: 0,
      highlight: true,
      bold: true,
      subtext: `${current.netMarginPercent.toFixed(1)}% margin`,
    },
  ];

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">P&L Quick Preview</CardTitle>
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-sm font-medium",
              isProfit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}
          >
            {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {formatCurrency(current.netIncome)}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">Period: {current.period}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <div
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 rounded transition-colors",
                  section.highlight ? "bg-gray-50 border border-gray-200" : "",
                  section.bold ? "font-bold text-gray-900" : "text-gray-700"
                )}
              >
                <span className={cn("text-sm", section.indent === 1 && "ml-4")}>
                  {section.label}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    section.type === "expense" && "text-red-600",
                    section.highlight && "text-gray-900"
                  )}
                >
                  {formatCurrency(Math.abs(section.value))}
                </span>
              </div>
              {section.subtext && <p className="text-xs text-gray-500 px-2">{section.subtext}</p>}
              {section.highlight && idx < sections.length - 1 && (
                <div className="border-t border-gray-200" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
