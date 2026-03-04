"use client";

import { useEffect, useState } from "react";
import { AdminTable, Column } from "./AdminTable";
import { Delivery, fetchDeliveries } from "@/lib/admin-api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { Button } from "../ui/button";
import { DeliveryStatus } from "@/lib/types";

const statusVariant = (status: string) => {
    switch (status) {
      case "delivered": return "default";
      case "in_transit": return "default";
      case "failed": return "destructive";
      default: return "secondary";
    }
  };
  
  export default function DeliveriesSection() {
    const { token } = useAuth();
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Delivery | null>(null);
  
    useEffect(() => {
      if (token) {
        fetchDeliveries(token)
          .then(setDeliveries)
          .catch(console.error)
          .finally(() => setLoading(false));
      }
    }, [token]);
  
    const columns: Column<Delivery>[] = [
      { key: "delivery_no", label: "Delivery #" },
      {
        key: "createdAt",
        label: "Created At",
        render: (date) => new Date(date as string | number | Date).toLocaleDateString(),
      },
      {
        key: "driver.name",
        label: "Driver",
        render: (driverName) => <>{driverName || "-"}</>,
      },
      {
        key: "truck.registration",
        label: "Truck",
        render: (truckRegistration) => <>{truckRegistration || "-"}</>,
      },
      { key: "destination", label: "Destination" },
      {
        key: "status",
        label: "Status",
        render: (status) => (
          <Badge variant={statusVariant(status as DeliveryStatus)}>
            {(status as DeliveryStatus).toUpperCase().replace("_", " ")}
          </Badge>
        ),
      },
    ];
  
    return (
      <>
        <AdminTable
          title="Deliveries"
          data={deliveries}
          columns={columns}
          loading={loading}
          searchKeys={["delivery_no", "driver.name", "truck.registration", "destination", "status"]}
          actions={(delivery) => (
              <Button variant="outline" size="sm" onClick={() => setSelected(delivery)}>
                  View Details
              </Button>
          )}
        />
  
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delivery Details</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Delivery #</p>
                    <p className="text-sm font-semibold">{selected.delivery_no}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge variant={statusVariant(selected.status)}>
                      {selected.status.toUpperCase().replace("_", " ")}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Driver</p>
                    <p className="text-sm">{selected.driver?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Truck</p>
                    <p className="text-sm">{selected.truck?.registration || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Destination</p>
                    <p className="text-sm">{selected.destination}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }
