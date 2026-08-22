"use client";

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Search, User, UserPlus, X, Check, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

// Customer type
export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

interface POSCustomerSelectProps {
  token: string;
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
}

export interface POSCustomerSelectHandle {
  openSearch: () => void;
}

export const POSCustomerSelect = forwardRef<POSCustomerSelectHandle, POSCustomerSelectProps>(
  function POSCustomerSelect({ token, selectedCustomer, onCustomerSelect }, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "" });
  const [isAdding, setIsAdding] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Search customers
  const searchCustomers = useCallback(async (term: string) => {
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
      getApiUrl(`${API_ENDPOINTS.CUSTOMERS_SEARCH}?q=${encodeURIComponent(term)}`),
      { headers: getAuthHeadersWithToken(token) }
      );
      const json = await res.json();
      if (json.success && json.data) {
        setSearchResults(json.data);
      }
    } catch (err) {
      console.error("Error searching customers:", err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchCustomers(searchTerm);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, searchCustomers]);

  // F2 (or any other trigger) can call this to jump straight into the
  // customer search dialog, focused and ready to type.
  useImperativeHandle(ref, () => ({
    openSearch: () => setIsOpen(true),
  }));

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle customer selection
  const handleSelect = (customer: Customer | null) => {
    onCustomerSelect(customer);
    setIsOpen(false);
    setSearchTerm("");
    setSearchResults([]);
  };

  // Add new customer
  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) return;

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
        handleSelect(json.data);
        setShowAddDialog(false);
        setNewCustomer({ name: "", phone: "", email: "" });
      }
    } catch (err) {
      console.error("Error adding customer:", err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      {/* Customer display — single row */}
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
        {/* Icon + label */}
        <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
          <User className="h-4 w-4" />
          <span className="text-xs font-medium text-slate-500 hidden sm:inline">Customer</span>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-slate-200 shrink-0" />

        {/* Customer info or walk-in badge */}
        <div className="flex-1 min-w-0">
          {selectedCustomer ? (
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-sm font-semibold text-slate-900 truncate leading-none">
                {selectedCustomer.name}
              </span>
              {selectedCustomer.phone && (
                <span className="text-xs text-slate-400 truncate hidden sm:inline">
                  {selectedCustomer.phone}
                </span>
              )}
            </div>
          ) : (
            <Badge
              variant="secondary"
              className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50 font-medium"
            >
              <Store className="h-3 w-3 mr-1" />
              Counter Sale
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          >
            {selectedCustomer ? "Change" : "Select"}
          </Button>
          {selectedCustomer && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleSelect(null)}
              className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50"
              aria-label="Clear customer"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Customer Selection Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
          </DialogHeader>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              ref={searchInputRef}
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Counter Sale Option */}
          <button
            onClick={() => handleSelect(null)}
            className="flex items-center justify-between w-full p-3 rounded-lg border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-200 flex items-center justify-center">
                <Store className="h-5 w-5 text-amber-700" />
              </div>
              <div className="text-left">
                <p className="font-medium text-amber-900">Counter Sale</p>
                <p className="text-sm text-amber-700">Counter customer</p>
              </div>
            </div>
            {!selectedCustomer && <Check className="h-5 w-5 text-amber-700" />}
          </button>

          {/* Search Results */}
          <div className="max-h-60 overflow-auto space-y-1">
            {isSearching ? (
              <div className="flex items-center justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelect(customer)}
                  className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-700" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-slate-900">{customer.name}</p>
                      <p className="text-sm text-slate-600">
                        {customer.phone || customer.email || "No contact info"}
                      </p>
                    </div>
                  </div>
                  {selectedCustomer?.id === customer.id && (
                    <Check className="h-5 w-5 text-blue-700" />
                  )}
                </button>
              ))
            ) : searchTerm.length >= 2 ? (
              <p className="text-center text-sm text-slate-500 py-4">No customers found</p>
            ) : (
              <p className="text-center text-sm text-slate-500 py-4">Type to search customers...</p>
            )}
          </div>

          {/* Add New Customer Button */}
          <Button
            variant="outline"
            onClick={() => {
              setShowAddDialog(true);
              setNewCustomer({ name: searchTerm, phone: "", email: "" });
            }}
            className="w-full gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add New Customer
          </Button>
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
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
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Customer name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone</Label>
              <Input
                id="customer-phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="0712 345 678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomer} disabled={!newCustomer.name.trim() || isAdding}>
              {isAdding ? "Adding..." : "Add Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
  }
);
