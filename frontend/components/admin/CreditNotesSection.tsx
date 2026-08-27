"use client";

import { useEffect, useState } from "react";
import { AdminTable, Column } from "./AdminTable";
import { CreditNote, fetchCreditNotes, approveCreditNote } from "@/lib/admin-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/utils";
import { Button } from "../ui/button";
import { SalesStatus } from "@/lib/types";
import { useToast } from "@/lib/toast-context";

const statusVariant = (status: string) => {
  switch (status) {
    case "CLOSED":
      return "default";
    case "DRAFT":
      return "secondary";
    case "VOID":
      return "destructive";
    default:
      return "secondary";
  }
};

export default function CreditNotesSection() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCN, setSelectedCN] = useState<CreditNote | null>(null);
  const [approving, setApproving] = useState(false);

  const loadCreditNotes = () => {
    if (token) {
      setLoading(true);
      fetchCreditNotes(token)
        .then(setCreditNotes)
        .catch((err) => {
          console.error(err);
          toast("Failed to fetch credit notes", "error");
        })
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    loadCreditNotes();
  }, [token]);

  const handleApprove = async (id: string) => {
    if (!token) return;
    try {
      setApproving(true);
      await approveCreditNote(token, id);
      toast("Credit note approved and closed", "success");
      setSelectedCN(null);
      loadCreditNotes();
    } catch (err: any) {
      toast(err.message || "Failed to approve credit note", "error");
    } finally {
      setApproving(false);
    }
  };

  const isManagerOrAdmin = user && ["admin", "super_admin", "manager"].includes(user.role);

  const columns: Column<CreditNote>[] = [
    { key: "documentId", label: "ID" },
    {
      key: "createdAt",
      label: "Date",
      render: (date) => new Date(date as string).toLocaleDateString(),
    },
    {
      key: "createdBy.name",
      label: "Created By",
    },
    {
      key: "approvedBy.name",
      label: "Approved By",
      render: (name) => (name as string) || "-",
    },
    {
      key: "total",
      label: "Total",
      render: (total) => formatCurrency(total as number),
    },
    {
      key: "status",
      label: "Status",
      render: (status) => (
        <Badge variant={statusVariant(status as string)}>
          {(status as string).toUpperCase()}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <AdminTable
        title="Credit Notes"
        data={creditNotes}
        columns={columns}
        loading={loading}
        searchKeys={["documentId", "createdBy.name", "status"]}
        actions={(cn) => (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedCN(cn)}>
              View Details
            </Button>
            {cn.status === "DRAFT" && isManagerOrAdmin && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => handleApprove(cn.id)}
                disabled={approving}
              >
                {approving ? "Closing..." : "Close CN"}
              </Button>
            )}
          </div>
        )}
      />

      <Dialog open={!!selectedCN} onOpenChange={() => setSelectedCN(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Credit Note Details - {selectedCN?.documentId}</DialogTitle>
          </DialogHeader>
          {selectedCN && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Document ID</p>
                  <p className="text-sm font-semibold">{selectedCN.documentId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={statusVariant(selectedCN.status)}>
                    {selectedCN.status.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date Created</p>
                  <p className="text-sm">
                    {new Date(selectedCN.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                  <p className="text-sm font-bold text-red-600 uppercase">
                    {formatCurrency(selectedCN.total)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created By</p>
                  <p className="text-sm">{selectedCN.createdBy?.name || "System"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Approved By</p>
                  <p className="text-sm font-semibold text-green-700">
                    {selectedCN.approvedBy?.name || "Pending Approval"}
                  </p>
                </div>
              </div>

              {/* Reason/Notes */}
              <div className="bg-slate-50 p-3 rounded border">
                <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase">Reason for Credit Note</p>
                <p className="text-sm italic text-slate-700">{selectedCN.notes || "No reason provided"}</p>
              </div>

              {/* Summary */}
              <div className="border-t pt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedCN.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{formatCurrency(selectedCN.tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t mt-2 pt-2">
                  <span>Total Credited</span>
                  <span>{formatCurrency(selectedCN.total)}</span>
                </div>
              </div>

              {/* Footer Actions */}
              {selectedCN.status === "DRAFT" && isManagerOrAdmin && (
                <div className="flex justify-end border-t pt-4">
                  <Button 
                    onClick={() => handleApprove(selectedCN.id)}
                    disabled={approving}
                    className="w-full sm:w-auto"
                  >
                    {approving ? "Closing..." : "Approve & Close Credit Note"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
