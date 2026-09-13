"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster, toast } from "sonner";
import { Timeline, TimelineEvent } from "@/components/ui/timeline";
import { Truck, Package, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Delivery status type and styling
type DeliveryStatus =
  | "pending"
  | "assigned"
  | "in_transit"
  | "delivered"
  | "failed"
  | "rescheduled";

// Types
interface Truck {
  id: string;
  registration: string;
  model: string;
  capacity: number;
  license_plate: string;
  isActive: boolean;
  deliveryCount: number;
  utilizationRate: number;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
}

interface Delivery {
  id: string;
  delivery_no: string;
  status: DeliveryStatus;
  truck: Truck;
  driver: Driver;
  destination: string;
  estimated_km: number;
  actual_km: number | null;
  scheduled_date: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  createdAt: string;
}

// Mock data (replace with API)
const MOCK_TRUCKS: Truck[] = [
  {
    id: "truck1",
    registration: "REG-001",
    model: "Hyundai Mighty EX4",
    capacity: 1000,
    license_plate: "AB-12-CD",
    isActive: true,
    deliveryCount: 3,
    utilizationRate: 75,
  },
  {
    id: "truck2",
    registration: "REG-002",
    model: "Tata ACE Diesel",
    capacity: 1500,
    license_plate: "XY-34-ZW",
    isActive: true,
    deliveryCount: 2,
    utilizationRate: 50,
  },
  {
    id: "truck3",
    registration: "REG-003",
    model: "Mahindra Bolero",
    capacity: 800,
    license_plate: "MN-56-PQ",
    isActive: false,
    deliveryCount: 0,
    utilizationRate: 0,
  },
];

const MOCK_DELIVERIES: Delivery[] = [
  {
    id: "del1",
    delivery_no: "DEL-2025001",
    status: "in_transit",
    truck: MOCK_TRUCKS[0]!,
    driver: { id: "drv1", name: "John Smith", phone: "+254-700-000-001" },
    destination: "Downtown Market, Nairobi",
    estimated_km: 45,
    actual_km: 32,
    scheduled_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    picked_up_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    delivered_at: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "del2",
    delivery_no: "DEL-2025002",
    status: "delivered",
    truck: MOCK_TRUCKS[0]!,
    driver: { id: "drv1", name: "John Smith", phone: "+254-700-000-001" },
    destination: "Central Warehouse, Mombasa",
    estimated_km: 120,
    actual_km: 125,
    scheduled_date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    picked_up_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    delivered_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "del3",
    delivery_no: "DEL-2025003",
    status: "pending",
    truck: MOCK_TRUCKS[1]!,
    driver: { id: "drv2", name: "Jane Doe", phone: "+254-700-000-002" },
    destination: "East Side Store, Eldoret",
    estimated_km: 200,
    actual_km: null,
    scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    picked_up_at: null,
    delivered_at: null,
    createdAt: new Date().toISOString(),
  },
];

export default function FleetDashboard() {
  const [deliveries, setDeliveries] = useState<Delivery[]>(MOCK_DELIVERIES);
  const [selectedId, setSelectedId] = useState<string>(MOCK_DELIVERIES[0]?.id ?? "");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"fleet" | "deliveries">("fleet");

  const trucks = MOCK_TRUCKS;
  const selectedDelivery = useMemo(
    () => deliveries.find((d) => d.id === selectedId) ?? null,
    [deliveries, selectedId]
  );

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      const matchesStatus = !filterStatus || d.status === filterStatus;
      const matchesSearch =
        !searchTerm ||
        d.delivery_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.destination.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [deliveries, filterStatus, searchTerm]);

  const activeDeliveries = useMemo(
    () => deliveries.filter((d) => ["pending", "assigned", "in_transit"].includes(d.status)),
    [deliveries]
  );
  const completedDeliveries = useMemo(
    () => deliveries.filter((d) => d.status === "delivered"),
    [deliveries]
  );
  const failedDeliveries = useMemo(
    () => deliveries.filter((d) => d.status === "failed"),
    [deliveries]
  );

  function handleStatusUpdate(deliveryId: string, newStatus: DeliveryStatus) {
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId
          ? {
            ...d,
            status: newStatus,
            picked_up_at:
              newStatus === "in_transit" ? new Date().toISOString() : d.picked_up_at,
            delivered_at:
              newStatus === "delivered" ? new Date().toISOString() : d.delivered_at,
          }
          : d
      )
    );

    const delivery = deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return;

    // Sonner notifications
    switch (newStatus) {
      case "assigned":
        toast("Delivery assigned", {
          description: `${delivery.delivery_no} • ${delivery.destination}`,
        });
        break;
      case "in_transit":
        toast.info("Delivery in transit", {
          description: `${delivery.delivery_no} • Driver: ${delivery.driver.name}`,
        });
        break;
      case "delivered":
        toast.success("Delivery completed", {
          description: `${delivery.delivery_no} delivered successfully.`,
        });
        break;
      case "failed":
        toast.error("Delivery failed", {
          description: `${delivery.delivery_no} • Please review and reschedule.`,
        });
        break;
      default:
        break;
    }
  }

  function getTimelineEvents(delivery: Delivery): TimelineEvent[] {
    const events: TimelineEvent[] = [
      {
        id: "created",
        status: "created",
        timestamp: delivery.createdAt,
        notes: "Delivery order created",
      },
    ];

    if (delivery.picked_up_at) {
      events.push({
        id: "picked_up",
        status: "picked_up",
        timestamp: delivery.picked_up_at,
        notes: "Order picked up from warehouse",
      });
    }

    if (delivery.delivered_at) {
      events.push({
        id: "delivered",
        status: "delivered",
        timestamp: delivery.delivered_at,
        notes: "Order delivered to destination",
      });
    }

    if (delivery.status === "failed") {
      events.push({
        id: "failed",
        status: "failed",
        timestamp: new Date().toISOString(),
        notes: "Delivery marked as failed",
      });
    }

    return events;
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 p-8">
      {/* Sonner Toaster (if not in root layout) */}
      <Toaster richColors position="top-right" />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Fleet & Delivery Management</h1>
          <p className="text-slate-600 mt-2">Manage your fleet and track deliveries.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Active Trucks</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {trucks.filter((t) => t.isActive).length}
                  </p>
                </div>
                <Truck className="text-4xl text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Active Deliveries</p>
                  <p className="text-3xl font-bold text-slate-900">{activeDeliveries.length}</p>
                </div>
                <Package className="text-4xl text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Completed Today</p>
                  <p className="text-3xl font-bold text-slate-900">{completedDeliveries.length}</p>
                </div>
                <CheckCircle className="text-4xl text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Failed</p>
                  <p className="text-3xl font-bold text-slate-900">{failedDeliveries.length}</p>
                </div>
                <AlertCircle className="text-4xl text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Left: Fleet & Deliveries */}
          <div className="col-span-2 space-y-8">
            {/* Tabs */}
            <div className="flex gap-4">
              <Button
                variant={activeTab === "fleet" ? "default" : "outline"}
                onClick={() => setActiveTab("fleet")}
                className="px-6"
              >
                Fleet
              </Button>
              <Button
                variant={activeTab === "deliveries" ? "default" : "outline"}
                onClick={() => setActiveTab("deliveries")}
                className="px-6"
              >
                Deliveries
              </Button>
            </div>

            {/* Fleet View */}
            {activeTab === "fleet" && (
              <div className="grid gap-4">
                {trucks.map((truck) => (
                  <Card key={truck.id} className={!truck.isActive ? "opacity-50" : ""}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">{truck.registration}</h3>
                          <p className="text-sm text-slate-600">{truck.model}</p>
                          <p className="text-xs text-slate-500 mt-1">Plate: {truck.license_plate}</p>
                        </div>

                        <div className="text-right space-y-2">
                          <div>
                            <p className="text-sm text-slate-600">Capacity</p>
                            <p className="font-semibold text-slate-900">{truck.capacity} units</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">Utilization</p>
                            <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${truck.utilizationRate > 70 ? "bg-red-500" : "bg-green-500"
                                  }`}
                                style={{ width: `${truck.utilizationRate}%` }}
                              />
                            </div>
                            <p className="text-xs text-slate-500">{truck.utilizationRate}% utilized</p>
                          </div>
                        </div>

                        <div className="ml-4">
                          <Badge
                            className={
                              truck.isActive
                                ? truck.deliveryCount > 0
                                  ? "bg-amber-500 text-white"
                                  : "bg-slate-500 text-white"
                                : "bg-rose-600 text-white"
                            }
                          >
                            {truck.isActive
                              ? truck.deliveryCount > 0
                                ? "In Transit"
                                : "Pending"
                              : "Failed"}
                          </Badge>
                          <p className="text-sm text-slate-600 mt-2">{truck.deliveryCount} active</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Deliveries View */}
            {activeTab === "deliveries" && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex gap-4">
                  <Input
                    placeholder="Search by delivery #, destination..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-md text-sm"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="failed">Failed</option>
                    <option value="rescheduled">Rescheduled</option>
                  </select>
                </div>

                {/* Delivery Cards */}
                <div className="grid gap-4">
                  {filteredDeliveries.map((delivery) => (
                    <Card
                      key={delivery.id}
                      className={`cursor-pointer transition-all ${selectedId === delivery.id ? "ring-2 ring-blue-500 bg-blue-50" : "hover:shadow-md"
                        }`}
                      onClick={() => setSelectedId(delivery.id)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900">{delivery.delivery_no}</h3>
                            <p className="text-sm text-slate-600">{delivery.destination}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              Driver: {delivery.driver.name} • Truck: {delivery.truck.registration}
                            </p>
                          </div>

                          <div className="text-right space-y-2">
                            <Badge
                              className={
                                delivery.status === "delivered"
                                  ? "bg-emerald-600 text-white"
                                  : delivery.status === "failed"
                                    ? "bg-rose-600 text-white"
                                    : delivery.status === "in_transit"
                                      ? "bg-amber-500 text-white"
                                      : "bg-blue-600 text-white"
                              }
                            >
                              {delivery.status.replace("_", " ").toUpperCase()}
                            </Badge>
                            <p className="text-xs text-slate-600">
                              {delivery.actual_km || delivery.estimated_km} km
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Timeline & Details */}
          {selectedDelivery && (
            <div className="col-span-1 space-y-8">
              {/* Delivery Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Delivery Details</CardTitle>
                  <CardDescription>{selectedDelivery.delivery_no}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-600">Destination</p>
                    <p className="font-semibold text-slate-900">{selectedDelivery.destination}</p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-600">Driver</p>
                    <p className="font-semibold text-slate-900">{selectedDelivery.driver.name}</p>
                    <p className="text-xs text-slate-600">{selectedDelivery.driver.phone}</p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-600">Truck</p>
                    <p className="font-semibold text-slate-900">{selectedDelivery.truck.registration}</p>
                    <p className="text-xs text-slate-600">{selectedDelivery.truck.model}</p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-600">Distance</p>
                    <p className="font-semibold text-slate-900">
                      {selectedDelivery.actual_km || selectedDelivery.estimated_km} km
                      {selectedDelivery.actual_km && selectedDelivery.estimated_km && (
                        <span className="text-xs text-slate-600 ml-2">
                          (est: {selectedDelivery.estimated_km}km)
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Status Update Buttons */}
                  <div className="pt-4 border-t space-y-2">
                    <p className="text-sm font-semibold text-slate-900">Update Status</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(["assigned", "in_transit", "delivered", "failed"] as const).map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={selectedDelivery.status === status ? "default" : "outline"}
                          onClick={() => handleStatusUpdate(selectedDelivery.id, status)}
                          className="text-xs"
                        >
                          {status.replace(/_/g, " ")}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Delivery Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <Timeline events={getTimelineEvents(selectedDelivery)} />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
