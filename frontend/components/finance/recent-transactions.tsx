"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowDownLeft, ArrowUpRight, Utensils, Zap, ShoppingBag, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Transaction } from "../../app/dashboard/finance/types";
import { formatCurrency, formatDateShort } from "../../app/dashboard/finance/lib/api";

interface RecentTransactionsProps {
  transactions: Transaction[];
  onViewAll?: () => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  food: <Utensils className="h-4 w-4" />,
  utilities: <Zap className="h-4 w-4" />,
  shopping: <ShoppingBag className="h-4 w-4" />,
  internet: <Wifi className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  food: "bg-orange-100 text-orange-600",
  utilities: "bg-yellow-100 text-yellow-600",
  shopping: "bg-purple-100 text-purple-600",
  internet: "bg-blue-100 text-blue-600",
  payroll: "bg-indigo-100 text-indigo-600",
  rent: "bg-pink-100 text-pink-600",
  supplies: "bg-cyan-100 text-cyan-600",
  marketing: "bg-green-100 text-green-600",
  income: "bg-emerald-100 text-emerald-600",
  sales: "bg-lime-100 text-lime-600",
  services: "bg-teal-100 text-teal-600",
  other: "bg-gray-100 text-gray-600",
};

export function RecentTransactions({ transactions, onViewAll }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Recent Transactions
          </CardTitle>
          <p className="text-sm text-gray-500">Latest activity</p>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">No transactions yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Recent Transactions
            </CardTitle>
            <p className="text-sm text-gray-500">Latest activity</p>
          </div>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-sm font-medium text-[#104f38] hover:underline"
            >
              View All
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  className={cn(
                    "h-10 w-10",
                    categoryColors[transaction.category] ||
                      categoryColors[transaction.type] ||
                      "bg-gray-100 text-gray-600"
                  )}
                >
                  <AvatarFallback>
                    {categoryIcons[transaction.category] ||
                      (transaction.type === "income" ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      ))}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {transaction.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDateShort(transaction.date)} • {transaction.category}
                    {transaction.reference && ` • ${transaction.reference}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    "text-sm font-bold",
                    transaction.type === "income" ? "text-green-600" : "text-red-600"
                  )}
                >
                  {transaction.type === "income" ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
