"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, DollarSign, Upload, Plus, ChevronRight } from "lucide-react";
import Link from "next/link";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  description: string;
}

interface QuickActionsProps {
  onActionClick?: (actionId: string) => void;
}

export const QuickActions = ({ onActionClick }: QuickActionsProps) => {
  const actions: QuickAction[] = [
    {
      id: "create-invoice",
      label: "Create Invoice",
      icon: <FileText className="h-5 w-5" />,
      href: "/dashboard/sales/new",
      description: "Create a new sales invoice",
    },
    {
      id: "record-payment",
      label: "Record Payment",
      icon: <DollarSign className="h-5 w-5" />,
      href: "/dashboard/finance/ar",
      description: "Record a customer payment",
    },
    {
      id: "upload-bank",
      label: "Upload Bank Statement",
      icon: <Upload className="h-5 w-5" />,
      href: "/dashboard/finance/reconciliation",
      description: "Import bank transactions",
    },
    {
      id: "journal-entry",
      label: "New Journal Entry",
      icon: <Plus className="h-5 w-5" />,
      href: "/dashboard/finance/gl",
      description: "Create a manual GL entry",
    },
  ];

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {actions.map((action) => (
            <Link key={action.id} href={action.href} onClick={() => onActionClick?.(action.id)}>
              <Button
                variant="outline"
                className="w-full justify-start h-auto px-3 py-2 text-left hover:bg-gray-50"
              >
                <div className="flex items-start gap-3">
                  <div className="text-gray-600 flex-shrink-0 mt-1">{action.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900">{action.label}</p>
                    <p className="text-xs text-gray-500 truncate">{action.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
