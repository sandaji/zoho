
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getApiUrl, API_ENDPOINTS } from "@/lib/api-config";
import { getAuthHeadersWithToken } from "@/lib/api-utils";
import { useToast } from "@/lib/toast-context";

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  onCustomerCreated: (customer: Customer) => void;
}

export function AddCustomerDialog({
  open,
  onOpenChange,
  token,
  onCustomerCreated,
}: AddCustomerDialogProps) {
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast("Please enter customer name", "warning");
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch(getApiUrl(API_ENDPOINTS.CUSTOMERS), {
        method: "POST",
        headers: getAuthHeadersWithToken(token),
        body: JSON.stringify({
          name: newCustomer.name.trim(),
          phone: newCustomer.phone.trim() || null,
          email: newCustomer.email.trim() || null,
        }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        toast("Customer created successfully", "success");
        onCustomerCreated(json.data);
        onOpenChange(false);
        setNewCustomer({ name: "", phone: "", email: "" });
      } else {
        toast(json.message || "Failed to create customer", "error");
      }
    } catch (err) {
      console.error("Error adding customer:", err);
      toast("Failed to create customer", "error");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer-name">Name *</Label>
            <Input
              id="customer-name"
              value={newCustomer.name}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, name: e.target.value })
              }
              placeholder="Customer name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-phone">Phone</Label>
            <Input
              id="customer-phone"
              value={newCustomer.phone}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, phone: e.target.value })
              }
              placeholder="0712 345 678"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-email">Email</Label>
            <Input
              id="customer-email"
              type="email"
              value={newCustomer.email}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, email: e.target.value })
              }
              placeholder="email@example.com"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddCustomer} disabled={!newCustomer.name.trim() || isAdding}>
            {isAdding ? "Adding..." : "Add Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
