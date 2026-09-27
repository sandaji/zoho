"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { PendingApprovalsCard } from "@/components/purchasing/pending-approvals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Lightbulb, ShieldCheck } from "lucide-react";

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    if (user) {
      const approvalPermissions = [
        "system.role.super_admin",
        "purchasing.order.approve_standard",
        "purchasing.order.approve_high",
        "purchasing.order.approve_executive",
      ];

      const userPermissions = user.permissions || [];
      const canApprove = approvalPermissions.some((perm) => userPermissions.includes(perm));

      setHasPermission(canApprove);
    }
  }, [user]);

  if (!hasPermission) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Purchase Order Approvals</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage pending purchase order approvals
            </p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to approve purchase orders. Please contact your administrator
            to grant you approval permissions (purchasing.order.approve_*).
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Purchase Order Approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Approve or reject pending purchase orders based on your approval level
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {/* Approval Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>Approval Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-border/70 bg-muted/30 p-3">
                <span className="inline-flex rounded-sm bg-info-muted px-2 py-1 text-xs font-semibold text-info">
                  STANDARD
                </span>
                <p className="mt-2 text-sm font-medium">Under KSH 10,000</p>
                <p className="mt-1 text-xs text-muted-foreground">Branch Manager or Manager</p>
              </div>
              <div className="rounded-md border border-border/70 bg-muted/30 p-3">
                <span className="inline-flex rounded-sm bg-warning-muted px-2 py-1 text-xs font-semibold text-foreground">
                  HIGH VALUE
                </span>
                <p className="mt-2 text-sm font-medium">KSH 10,000 - 100,000</p>
                <p className="mt-1 text-xs text-muted-foreground">Manager or Admin</p>
              </div>
              <div className="rounded-md border border-border/70 bg-muted/30 p-3">
                <span className="inline-flex rounded-sm bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
                  EXECUTIVE
                </span>
                <p className="mt-2 text-sm font-medium">Over KSH 100,000</p>
                <p className="mt-1 text-xs text-muted-foreground">Super Admin or CEO</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/70 pt-3 text-sm">
              <span className="font-medium">Your role</span>
              <span className="text-muted-foreground">{user?.role || "Unknown"}</span>
            </div>

            <div className="flex items-start gap-2 rounded-md border border-info-border bg-info-muted/50 p-3 text-sm">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <p>
                <strong>Review each order carefully.</strong> Approved orders move to the next
                approval level or are marked as approved.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <PendingApprovalsCard />
      </div>
    </div>
  );
}
