"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { PendingApprovalsCard } from "@/components/purchasing/pending-approvals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Purchase Order Approvals</h1>
          <p className="text-gray-600">Manage pending purchase order approvals</p>
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
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Purchase Order Approvals</h1>
        <p className="text-gray-600">
          Approve or reject pending purchase orders based on your approval level
        </p>
      </div>

      <div className="grid gap-4">
        {/* Approval Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>Approval Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Approval Levels:</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <strong>STANDARD</strong> (KSH &lt; 10,000): Requires Branch Manager/Manager
                  approval
                </li>
                <li>
                  <strong>HIGH_VALUE</strong> (KSH 10,000 - 100,000): Requires Manager/Admin
                  approval
                </li>
                <li>
                  <strong>EXECUTIVE</strong> (KSH &gt; 100,000): Requires Super Admin/CEO approval
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Your Role:</h3>
              <p className="text-sm text-gray-600">{user?.role || "Unknown"}</p>
            </div>

            <div className="bg-blue-50 p-3 rounded text-sm">
              💡 <strong>Tip:</strong> Review the PO details carefully before approving. Once
              approved, it will move to the next approval level or be marked as APPROVED.
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <PendingApprovalsCard />
      </div>
    </div>
  );
}
