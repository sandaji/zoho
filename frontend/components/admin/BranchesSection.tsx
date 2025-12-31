"use client";

import { useEffect, useState } from "react";
import { AdminTable, Column } from "./AdminTable";
import { Branch, fetchBranches } from "@/lib/admin-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { Button } from "../ui/button";
import { toast } from "sonner";

export default function BranchesSection() {
  const { token } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  useEffect(() => {
    if (token) {
      setLoading(true);
      const promise = fetchBranches(token);

      promise
        .then(setBranches)
        .catch(() => {
          // Errors are handled by the toast
        })
        .finally(() => setLoading(false));

      toast.promise(promise, {
        loading: "Loading branches...",
        success: "Branches loaded successfully",
        error: "Failed to load branches",
      });
    }
  }, [token]);

  const columns: Column<Branch>[] = [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "city", label: "City" },
    {
      key: "phone",
      label: "Phone",
      render: (phone) => phone || "-",
    },
    {
      key: "isActive",
      label: "Status",
      render: (isActive) => (
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <AdminTable
        title="Branches"
        data={branches}
        columns={columns}
        loading={loading}
        searchKeys={["name", "code", "city"]}
        actions={(branch) => (
            <Button variant="outline" size="sm" onClick={() => setSelectedBranch(branch)}>
                View Details
            </Button>
        )}
      />

      <Dialog open={!!selectedBranch} onOpenChange={() => setSelectedBranch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Branch Details</DialogTitle>
          </DialogHeader>
          {selectedBranch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Code</p>
                  <p className="text-sm">{selectedBranch.code}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-sm">{selectedBranch.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">City</p>
                  <p className="text-sm">{selectedBranch.city}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-sm">{selectedBranch.phone || "-"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Address</p>
                  <p className="text-sm">{selectedBranch.address || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={selectedBranch.isActive ? "default" : "secondary"}>
                    {selectedBranch.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-sm">
                    {new Date(selectedBranch.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
