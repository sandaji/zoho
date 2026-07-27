"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SavingsGoal } from "../types";
import { formatCurrencyCompact } from "../lib/api";

interface SavingPlansProps {
  plans: SavingsGoal[];
  onAddGoal?: () => void;
  className?: string;
}

export function SavingPlans({ plans, onAddGoal, className }: SavingPlansProps) {
  return (
    <Card className={cn("border-gray-200 shadow-sm", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Saving Plans
            </CardTitle>
            <p className="text-sm text-gray-500">Track your goals</p>
          </div>
          {onAddGoal && (
            <button
              onClick={onAddGoal}
              className="flex items-center gap-1 text-sm font-medium text-[#104f38] hover:underline"
            >
              <Plus className="h-4 w-4" />
              Add Goal
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {plans.length > 0 ? (
          plans.map((plan) => {
            return (
              <div
                key={plan.id}
                className="rounded-lg border border-gray-100 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full",
                        plan.color || "bg-[#104f38] text-white"
                      )}
                    >
                      <Target className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatCurrencyCompact(plan.remaining)} to go
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {plan.percentage.toFixed(0)}%
                  </span>
                </div>

                <Progress value={plan.percentage} className="h-2 [&>div]:bg-[#104f38]" />

                <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                  <span>{formatCurrencyCompact(plan.currentAmount)}</span>
                  <span>{formatCurrencyCompact(plan.targetAmount)}</span>
                </div>

                {plan.description && (
                  <p className="mt-2 text-xs text-gray-500">{plan.description}</p>
                )}

                {plan.deadline && (
                  <p className="mt-1 text-xs text-gray-400">
                    Target: {new Date(plan.deadline).toLocaleDateString("en-KE", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center">
            <Target className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No saving goals yet</p>
            {onAddGoal && (
              <button
                onClick={onAddGoal}
                className="mt-3 rounded-lg bg-[#104f38] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d3f2d]"
              >
                Create Your First Goal
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
