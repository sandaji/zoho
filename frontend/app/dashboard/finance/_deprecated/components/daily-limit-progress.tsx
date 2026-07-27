"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyLimitProgressProps {
  spent: number;
  limit: number;
  className?: string;
}

export function DailyLimitProgress({ spent, limit, className }: DailyLimitProgressProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const percentage = Math.min((spent / limit) * 100, 100);
  const remaining = Math.max(limit - spent, 0);
  const isNearLimit = percentage >= 80;
  const isOverLimit = spent > limit;

  return (
    <Card className={cn("border-gray-200 shadow-sm", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Daily Spending Limit
          </CardTitle>
          {isNearLimit && (
            <AlertCircle className={cn(
              "h-5 w-5",
              isOverLimit ? "text-red-500" : "text-yellow-500"
            )} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress
            value={percentage}
            className={cn(
              "h-3",
              isOverLimit
                ? "[&>div]:bg-red-500"
                : isNearLimit
                ? "[&>div]:bg-yellow-500"
                : "[&>div]:bg-[#104f38]"
            )}
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {percentage.toFixed(1)}% used
            </span>
            <span
              className={cn(
                "font-semibold",
                isOverLimit
                  ? "text-red-600"
                  : isNearLimit
                  ? "text-yellow-600"
                  : "text-gray-900"
              )}
            >
              {formatCurrency(remaining)} remaining
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Spent Today</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {formatCurrency(spent)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Daily Limit</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {formatCurrency(limit)}
            </p>
          </div>
        </div>

        {/* Warning Message */}
        {isOverLimit && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            ⚠️ You've exceeded your daily spending limit by {formatCurrency(spent - limit)}
          </div>
        )}
        {isNearLimit && !isOverLimit && (
          <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">
            ⚡ You're close to your daily limit. {formatCurrency(remaining)} remaining.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
