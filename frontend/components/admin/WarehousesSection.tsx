"use client";

import { useEffect, useState } from "react";
import { AdminTable, Column } from "./AdminTable";
import { Warehouse, fetchWarehouses } from "@/lib/admin-api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { Button } from "../ui/button";

export default function WarehousesSection() {
  const { token } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Warehouse | null>(null);

  useEffect(() => {
    if (token) {
      fetchWarehouses(token)
        .then(setWarehouses)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [token]);

  const columns: Column<Warehouse>[] = [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "location", label: "Location" },
    {
      key: "branch.name",
      label: "Branch",
      render: (branchName) => (branchName as string) || "-",
    },
    {
      key: "capacity",
      label: "Capacity",
      render: (capacity) => (capacity as number).toLocaleString(),
    },
    {
      key: "_count.inventory",
      label: "Inventory Count",
      render: (inventory) => String(inventory || 0),
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
        title="Warehouses"
        data={warehouses}
        columns={columns}
        loading={loading}
        searchKeys={["name", "code", "location", "branch.name"]}
        actions={(warehouse) => (
          <Button variant="outline" size="sm" onClick={() => setSelected(warehouse)}>
            View Details
          </Button>
        )}
      />

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Warehouse Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Code</p>
                  <p className="text-sm">{selected.code}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-sm">{selected.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Location</p>
                  <p className="text-sm">{selected.location}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Branch</p>
                  <p className="text-sm">{selected.branch?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Capacity</p>
                  <p className="text-sm font-semibold">{selected.capacity.toLocaleString()} units</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={selected.isActive ? "default" : "secondary"}>
                    {selected.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
