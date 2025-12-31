/**
 * Fleet Module - Data Transfer Objects
 */

export interface CreateTruckDTO {
  registration: string;
  model: string;
  capacity: number;
  license_plate?: string;
}

export interface UpdateTruckDTO {
  model?: string;
  capacity?: number;
  license_plate?: string;
  isActive?: boolean;
}

export interface TruckResponseDTO {
  id: string;
  registration: string;
  model: string;
  capacity: number;
  license_plate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeliveryDTO {
  salesId: string;
  driverId: string;
  truckId: string;
  destination: string;
  estimated_km?: number;
  scheduled_date?: string;
  notes?: string;
}

export interface UpdateDeliveryDTO {
  status?: string;
  destination?: string;
  actual_km?: number;
  picked_up_at?: string;
  delivered_at?: string;
  notes?: string;
}

export interface DeliveryResponseDTO {
  id: string;
  delivery_no: string;
  status: string;
  salesId: string;
  driverId: string;
  truckId: string;
  destination: string;
  estimated_km?: number;
  actual_km?: number;
  scheduled_date?: string;
  picked_up_at?: string;
  delivered_at?: string;
  notes?: string;
}

export interface DeliveryListQueryDTO {
  page?: number;
  limit?: number;
  status?: string;
  driverId?: string;
  truckId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Query DTOs for GET endpoints
 */
export interface GetTrucksQueryDTO {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string; // Search by registration, model, license_plate
}

export interface GetTrucksResponseDTO {
  id: string;
  registration: string;
  model: string;
  capacity: number;
  license_plate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deliveryCount?: number; // Number of active deliveries
  utilizationRate?: number; // Percentage of capacity used in current deliveries
}

/**
 * Response DTOs
 */
export interface TrucksListResponseDTO {
  data: GetTrucksResponseDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DeliveryDetailResponseDTO {
  id: string;
  delivery_no: string;
  status: string;
  sales?: {
    id: string;
    invoice_no: string;
    total_amount: number;
  };
  driver?: {
    id: string;
    name: string;
    phone?: string;
  };
  truck?: GetTrucksResponseDTO;
  destination: string;
  estimated_km?: number;
  actual_km?: number;
  scheduled_date?: string;
  picked_up_at?: string;
  delivered_at?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveriesListResponseDTO {
  data: DeliveryDetailResponseDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Update Delivery Status DTO
 */
export interface UpdateDeliveryStatusDTO {
  status:
    | "pending"
    | "assigned"
    | "in_transit"
    | "delivered"
    | "failed"
    | "rescheduled";
  actual_km?: number;
  picked_up_at?: string;
  delivered_at?: string;
  notes?: string;
}

/**
 * Timeline Event DTO for delivery progress
 */
export interface DeliveryTimelineEventDTO {
  id: string;
  status: string;
  timestamp: string;
  notes?: string;
}

export interface DeliveryTimelineDTO {
  deliveryId: string;
  delivery_no: string;
  status: string;
  events: DeliveryTimelineEventDTO[];
}
