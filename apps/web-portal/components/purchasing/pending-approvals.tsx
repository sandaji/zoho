"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import { format } from "date-fns";

interface ApprovalData {
  id: string;
  purchaseOrderId: string;
  poNumber: string;
  vendorName: string;
  totalAmount: number;
  currentLevel: string;
  createdAt: string;
  purchaseOrder: {
    poNumber: string;
    totalAmount: number;
    vendor: {
      name: string;
    };
  };
}

export function PendingApprovalsCard() {
  const [approvals, setApprovals] = useState<ApprovalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject" | null>(null);
  const [comments, setComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const fetchPendingApprovals = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.request<ApprovalData[]>(
        "/v1/purchasing/approvals/pending",
        "GET"
      );

      if (response.success && response.data) {
        setApprovals(response.data);
      } else {
        showToast("Error", response.error?.message || "Failed to fetch approvals", "error");
      }
    } catch (error) {
      showToast("Error", "Failed to fetch approvals", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApproval) return;

    setIsSubmitting(true);
    try {
      const response = await apiClient.request(
        `/v1/purchasing/approvals/${selectedApproval.id}/approve`,
        "POST",
        { comments }
      );

      if (response.success) {
        showToast("Success", "Purchase order approved", "success");
        setIsDialogOpen(false);
        fetchPendingApprovals();
      } else {
        showToast("Error", response.error?.message || "Failed to approve", "error");
      }
    } catch (error) {
      showToast("Error", "Failed to approve", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval) return;

    setIsSubmitting(true);
    try {
      const response = await apiClient.request(
        `/v1/purchasing/approvals/${selectedApproval.id}/reject`,
        "POST",
        { reason: rejectionReason }
      );

      if (response.success) {
        showToast("Success", "Purchase order rejected", "success");
        setIsDialogOpen(false);
        fetchPendingApprovals();
      } else {
        showToast("Error", response.error?.message || "Failed to reject", "error");
      }
    } catch (error) {
      showToast("Error", "Failed to reject", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openApprovalDialog = (approval: ApprovalData, action: "approve" | "reject") => {
    setSelectedApproval(approval);
    setApprovalAction(action);
    setComments("");
    setRejectionReason("");
    setIsDialogOpen(true);
  };

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const getLevelBadgeColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "standard":
        return "bg-blue-100 text-blue-800";
      case "high_value":
        return "bg-orange-100 text-orange-800";
      case "executive":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pending Approvals
              </CardTitle>
              <CardDescription>
                {approvals.length} purchase order{approvals.length !== 1 ? "s" : ""} awaiting your
                approval
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading approvals...</div>
          ) : approvals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-400 mb-4" />
              <p>No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{approval.purchaseOrder.poNumber}</h4>
                      <Badge className={getLevelBadgeColor(approval.currentLevel)}>
                        {approval.currentLevel?.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Vendor: {approval.purchaseOrder.vendor.name}</p>
                      <p>Amount: KSH {approval.purchaseOrder.totalAmount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">
                        Submitted: {format(new Date(approval.createdAt), "MMM dd, yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 flex gap-2">
                    <Button
                      onClick={() => openApprovalDialog(approval, "approve")}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => openApprovalDialog(approval, "reject")}
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "approve" ? "Approve" : "Reject"} Purchase Order
            </DialogTitle>
            <DialogDescription>{selectedApproval?.purchaseOrder.poNumber}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium">Vendor:</p>
              <p className="text-sm text-gray-600">{selectedApproval?.purchaseOrder.vendor.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Amount:</p>
              <p className="text-sm text-gray-600">
                KSH {selectedApproval?.purchaseOrder.totalAmount.toLocaleString()}
              </p>
            </div>

            {approvalAction === "approve" ? (
              <div>
                <label className="block text-sm font-medium mb-2">Comments (Optional)</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add any approval comments..."
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  rows={3}
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-2">Rejection Reason</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  rows={3}
                  required
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={approvalAction === "approve" ? handleApprove : handleReject}
              disabled={isSubmitting || (approvalAction === "reject" && !rejectionReason.trim())}
              className={
                approvalAction === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {isSubmitting ? "Processing..." : approvalAction === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
