"use client";

import { useEffect, useState, useMemo } from "react";
import { AdminTable, Column } from "./AdminTable";
import { 
  Delivery, 
  fetchDeliveries, 
  User, 
  Truck, 
  Sales,
  StockTransfer,
  fetchUsers,
  fetchTrucks,
  fetchSales,
  fetchStockTransfers,
  createDelivery,
  updateDeliveryStatus,
  CreateDeliveryPayload,
  UpdateDeliveryStatusPayload,
} from "@/lib/admin-api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { Button } from "../ui/button";
import { DeliveryStatus } from "@/lib/types";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { toast } from "@/hooks/use-toast";

const statusVariant = (status: string) => {
    switch (status) {
      case "delivered": return "default";
      case "in_transit": return "default";
      case "failed": return "destructive";
      case "returned_to_base": return "destructive";
      default: return "secondary";
    }
};

// Main Component
export default function DeliveriesSection() {
    const { token } = useAuth();
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [sales, setSales] = useState<Sales[]>([]);
    const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Delivery | null>(null);
    const [isCreateOpen, setCreateOpen] = useState(false);
    const [isUpdateOpen, setUpdateOpen] = useState(false);

    const drivers = useMemo(() => users.filter(u => u.role === 'driver' && u.isActive), [users]);
    const activeTrucks = useMemo(() => trucks.filter(t => t.isActive), [trucks]);

    const fetchData = () => {
        if (token) {
            setLoading(true);
            Promise.all([
                fetchDeliveries(token),
                fetchUsers(token),
                fetchTrucks(token),
                fetchSales(token),
                fetchStockTransfers(token),
            ]).then(([deliveriesData, usersData, trucksData, salesData, transfersData]) => {
                setDeliveries(deliveriesData);
                setUsers(usersData);
                setTrucks(trucksData);
                setSales(salesData);
                setStockTransfers(transfersData);
            }).catch(err => {
                console.error(err);
                toast({ title: "Error", description: "Failed to fetch necessary data.", variant: "destructive" });
            }).finally(() => setLoading(false));
        }
    };

    useEffect(() => {
        fetchData();
    }, [token]);

    const handleCreateSuccess = () => {
        setCreateOpen(false);
        fetchData();
        toast({ title: "Success", description: "Delivery created successfully." });
    }

    const handleUpdateSuccess = () => {
        setUpdateOpen(false);
        setSelected(null);
        fetchData();
        toast({ title: "Success", description: "Delivery status updated." });
    }

    const columns: Column<Delivery>[] = [
      { key: "delivery_no", label: "Delivery #" },
      { key: "createdAt", label: "Created At", render: (date) => new Date(date as string).toLocaleDateString() },
      { key: "driver.name", label: "Driver", render: (name) => name || "-" },
      { key: "truck.registration", label: "Truck", render: (reg) => reg || "-" },
      { key: "destination", label: "Destination" },
      {
        key: "status",
        label: "Status",
        render: (status) => (
          <Badge variant={statusVariant(status as DeliveryStatus)}>
            {(status as string).toUpperCase().replace("_", " ")}
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
          headerActions={<Button onClick={() => setCreateOpen(true)}>Create Delivery</Button>}
          actions={(delivery) => (
            <Button variant="outline" size="sm" onClick={() => setSelected(delivery)}>
                View Details
            </Button>
          )}
        />
        
        {/* View Details Dialog */}
        <Dialog open={!!selected && !isUpdateOpen} onOpenChange={() => setSelected(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delivery Details</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm font-medium text-muted-foreground">Delivery #</p><p>{selected.delivery_no}</p></div>
                  <div><p className="text-sm font-medium text-muted-foreground">Status</p><Badge variant={statusVariant(selected.status)}>{selected.status.toUpperCase()}</Badge></div>
                  <div><p className="text-sm font-medium text-muted-foreground">Driver</p><p>{selected.driver?.name || "-"}</p></div>
                  <div><p className="text-sm font-medium text-muted-foreground">Truck</p><p>{selected.truck?.registration || "-"}</p></div>
                  <div className="col-span-2"><p className="text-sm font-medium text-muted-foreground">Destination</p><p>{selected.destination}</p></div>
                  {selected.sales && <div className="col-span-2"><p className="text-sm font-medium text-muted-foreground">Sales Order</p><p>{selected.sales.invoice_no}</p></div>}
                  {selected.stockTransfer && <div className="col-span-2"><p className="text-sm font-medium text-muted-foreground">Stock Transfer</p><p>{selected.stockTransfer.documentId}</p></div>}
                </div>
              </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => { setUpdateOpen(true) }}>Update Status</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Create and Update Dialogs */}
        <CreateDeliveryDialog 
            isOpen={isCreateOpen}
            onClose={() => setCreateOpen(false)}
            onSuccess={handleCreateSuccess}
            drivers={drivers}
            trucks={activeTrucks}
            sales={sales}
            stockTransfers={stockTransfers}
        />
        {selected && <UpdateStatusDialog
            isOpen={isUpdateOpen}
            onClose={() => setUpdateOpen(false)}
            onSuccess={handleUpdateSuccess}
            delivery={selected}
        />}
      </>
    );
}


// Create Delivery Dialog Component
function CreateDeliveryDialog({ isOpen, onClose, onSuccess, drivers, trucks, sales, stockTransfers }: any) {
    const { token } = useAuth();
    const [deliveryType, setDeliveryType] = useState<"sales" | "transfer">("sales");
    const [payload, setPayload] = useState<Partial<CreateDeliveryPayload>>({});
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!token || !payload.driverId || !payload.truckId || !payload.destination || (!payload.salesDocumentId && !payload.stockTransferId)) {
            toast({ title: "Error", description: "Please fill all required fields.", variant: "destructive"});
            return;
        }
        setSubmitting(true);
        try {
            await createDelivery(token, payload as CreateDeliveryPayload);
            onSuccess();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: (error as Error).message, variant: "destructive"});
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader><DialogTitle>Create New Delivery</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Delivery Type</Label>
                            <Select value={deliveryType} onValueChange={(v: "sales" | "transfer") => setDeliveryType(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sales">Sales Order</SelectItem>
                                    <SelectItem value="transfer">Stock Transfer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                             <Label>{deliveryType === 'sales' ? "Sales Order" : "Stock Transfer"}</Label>
                             <Select onValueChange={v => setPayload(p => ({ ...p, salesDocumentId: deliveryType === 'sales' ? v : undefined, stockTransferId: deliveryType === 'transfer' ? v : undefined }))}>
                                 <SelectTrigger><SelectValue /></SelectTrigger>
                                 <SelectContent>
                                     {(deliveryType === 'sales' ? sales : stockTransfers).map(item => (
                                         <SelectItem key={item.id} value={item.id}>{deliveryType === 'sales' ? (item as Sales).invoice_no : (item as StockTransfer).documentId}</SelectItem>
                                     ))}
                                 </SelectContent>
                             </Select>
                        </div>
                    </div>
                    <div className="space-y-2"><Label>Driver</Label><Select onValueChange={v => setPayload(p => ({ ...p, driverId: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{drivers.map((d:User) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Truck</Label><Select onValueChange={v => setPayload(p => ({ ...p, truckId: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{trucks.map((t:Truck) => <SelectItem key={t.id} value={t.id}>{t.registration} ({t.model})</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Destination</Label><Input onChange={e => setPayload(p => ({ ...p, destination: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Notes</Label><Input onChange={e => setPayload(p => ({ ...p, notes: e.target.value }))} /></div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Creating..." : "Create Delivery"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Update Status Dialog Component
function UpdateStatusDialog({ isOpen, onClose, onSuccess, delivery }: { isOpen: boolean, onClose: () => void, onSuccess: () => void, delivery: Delivery }) {
    const { token } = useAuth();
    const [payload, setPayload] = useState<Partial<UpdateDeliveryStatusPayload>>({ status: delivery.status });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!token || !payload.status) return;
        setSubmitting(true);
        try {
            await updateDeliveryStatus(token, delivery.id, payload as UpdateDeliveryStatusPayload);
            onSuccess();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: (error as Error).message, variant: "destructive"});
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader><DialogTitle>Update Delivery Status</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2"><Label>Status</Label>
                        <Select value={payload.status} onValueChange={v => setPayload(p => ({ ...p, status: v as DeliveryStatus }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.values(DeliveryStatus).map(s => <SelectItem key={s} value={s}>{s.toUpperCase().replace("_", " ")}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {payload.status === 'delivered' && (
                        <>
                            <div className="space-y-2"><Label>OTP</Label><Input placeholder="Enter OTP from customer" onChange={e => setPayload(p => ({ ...p, otp: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Photo URL</Label><Input placeholder="URL of delivery photo" onChange={e => setPayload(p => ({ ...p, podPhotoUrl: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Signature</Label><Input placeholder="Base64 encoded signature" onChange={e => setPayload(p => ({ ...p, podSignature: e.target.value }))} /></div>
                        </>
                    )}
                    <div className="space-y-2"><Label>Notes</Label><Input onChange={e => setPayload(p => ({ ...p, notes: e.target.value }))} defaultValue={delivery.notes || ''} /></div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Updating..." : "Update Status"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

