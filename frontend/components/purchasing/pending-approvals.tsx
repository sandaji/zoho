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
        return "border-info-border bg-info-muted text-info";
      case "high_value":
        return "border-warning-border bg-warning-muted text-foreground";
      case "executive":
        return "border-destructive/20 bg-destructive/10 text-destructive";
      default:
        return "border-border bg-muted text-muted-foreground";
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
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
            <div className="py-10 text-center text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" />
              <p>No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="flex flex-col gap-4 rounded-md border border-border/70 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">{approval.purchaseOrder.poNumber}</h4>
                      <Badge className={getLevelBadgeColor(approval.currentLevel)}>
                        {approval.currentLevel?.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        Vendor:{" "}
                        <span className="text-foreground">
                          {approval.purchaseOrder.vendor.name}
                        </span>
                      </p>
                      <p>
                        Amount:{" "}
                        <span className="font-medium text-foreground">
                          KSH {approval.purchaseOrder.totalAmount.toLocaleString()}
                        </span>
                      </p>
                      <p className="text-xs">
                        Submitted: {format(new Date(approval.createdAt), "MMM dd, yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:ml-4 sm:flex sm:shrink-0">
                    <Button
                      onClick={() => openApprovalDialog(approval, "approve")}
                      size="sm"
                      className="bg-success text-success-foreground hover:bg-success/90"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => openApprovalDialog(approval, "reject")}
                      size="sm"
                      variant="outline"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
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
              <p className="text-sm text-muted-foreground">
                {selectedApproval?.purchaseOrder.vendor.name}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Amount:</p>
              <p className="text-sm text-muted-foreground">
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
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  ? "bg-success text-success-foreground hover:bg-success/90"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
