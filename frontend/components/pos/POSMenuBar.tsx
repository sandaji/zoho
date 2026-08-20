"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronDown,
  SlidersHorizontal,
  Search,
  FilePlus2,
  Eye,
  Printer,
  Loader2,
  X,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import { getApiUrl, API_ENDPOINTS } from "@/lib/api-config";
import { getAuthHeadersWithToken } from "@/lib/api-utils";
import { useToast } from "@/lib/toast-context";
import { formatCurrency, safeFormatDate, cn } from "@/lib/utils";
import { AddCustomerDialog } from "@/components/pos/AddCustomerDialog";
import { AutocompleteProductSearch } from "@/components/pos/AutocompleteProductSearch";
import type { Customer } from "@/components/pos/POSCustomerSelect";
import { useAuth } from "@/lib/auth-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocType = "ALL" | "DRAFT" | "QUOTE" | "CREDIT_NOTE" | "INVOICE";
type PaymentMethod = "cash" | "card" | "mpesa" | "cheque" | "bank_transfer";

interface SalesDocumentItem {
  id: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  product?: { name: string; sku: string };
}

interface SalesDocument {
  id: string;
  documentId: string;
  type: string;
  status: string;
  issueDate: string;
  total: number;
  balance: number;
  customer?: { id: string; name: string } | null;
  items: SalesDocumentItem[];
}

interface SalesDocumentListResponse {
  success: boolean;
  data: { data: SalesDocument[]; total: number } | SalesDocument[];
}

// New invoice line item (client-side only, before submission)
interface InvoiceLine {
  _key: string; // ephemeral client key
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
}

interface POSMenuBarProps {
  token: string;
  branchId: string | null;
  onCustomerCreated: (customer: Customer) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function emptyLine(): InvoiceLine {
  return {
    _key: crypto.randomUUID(),
    productId: "",
    productName: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
    taxRate: 0.16,
    discount: 0,
  };
}

function lineSubtotal(l: InvoiceLine): number {
  return l.quantity * l.unitPrice - l.discount;
}

function lineTax(l: InvoiceLine): number {
  return lineSubtotal(l) * l.taxRate;
}

function lineTotal(l: InvoiceLine): number {
  return lineSubtotal(l) + lineTax(l);
}

const DOC_TYPE_LABELS: Record<DocType, string> = {
  ALL: "All",
  DRAFT: "Sales Drafts",
  QUOTE: "Quotations",
  CREDIT_NOTE: "Credit Notes / Sales Return",
  INVOICE: "Sales Invoices",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive" | "warning"
> = {
  DRAFT: "secondary",
  SENT: "outline",
  PARKED: "warning",
  HELD: "warning",
  PARTIALLY_PAID: "warning",
  PAID: "default",
  VOID: "destructive",
  CONVERTED: "secondary",
  CREDITED: "secondary",
  PARTIALLY_CREDITED: "warning",
  CLOSED: "secondary",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function POSMenuBar({ token, branchId, onCustomerCreated }: POSMenuBarProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
   const [currentTime, setCurrentTime] = React.useState(new Date());
     React.useEffect(() => {
       const timer = setInterval(() => {
         setCurrentTime(new Date());
       }, 1000);

       return () => clearInterval(timer);
     }, []);

  // ── Master: new customer dialog ──
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  // ── Transactions panel ──
  const [txPanelOpen, setTxPanelOpen] = useState(false);
  const [activeDocType, setActiveDocType] = useState<DocType>("ALL");
  const [documents, setDocuments] = useState<SalesDocument[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // ── Filter dates ──
  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(todayISO());

  // ── Search ──
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // ── New Invoice dialog ──
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceCustomer, setInvoiceCustomer] = useState<Customer | null>(null);
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([emptyLine()]);
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState<PaymentMethod>("cash");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [invoiceSubmitting, setInvoiceSubmitting] = useState<"draft" | "invoice" | null>(null);

  // ── Invoice customer picker (search + create) ──
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerPickerMode, setCustomerPickerMode] = useState<"search" | "create">("search");
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const customerSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Close tx panel on Escape ──
  useEffect(() => {
    if (!txPanelOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTxPanelOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [txPanelOpen]);

  // ── Focus search input when toggled open ──
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [searchOpen]);

  // ── Fetch documents ──────────────────────────────────────────────────────────
  const fetchDocuments = useCallback(
    async (docType: DocType, from: string, to: string, search?: string) => {
      if (!branchId) return;
      setTxLoading(true);
      try {
        const params = new URLSearchParams({ branchId });
        if (docType !== "ALL") params.set("type", docType);
        if (from) params.set("startDate", from);
        if (to) params.set("endDate", to);
        if (search && search.length >= 2) params.set("search", search);

        const res = await fetch(`${getApiUrl(API_ENDPOINTS.SALES_DOCUMENTS)}?${params}`, {
          headers: getAuthHeadersWithToken(token),
        });
        const json: SalesDocumentListResponse = await res.json();
        if (!res.ok || !json.success) {
          toast("Failed to fetch documents", "error");
          return;
        }
        // Unwrap: backend returns { success, data: { data: [], total } }
        const raw = json.data;
        const list = Array.isArray(raw) ? raw : ((raw as any).data ?? []);

        // Client-side search fallback when backend doesn't support it yet
        if (search && search.length >= 2) {
          const q = search.toLowerCase();
          const filtered = list.filter(
            (d: SalesDocument) =>
              d.documentId.toLowerCase().includes(q) || d.customer?.name.toLowerCase().includes(q)
          );
          setDocuments(filtered);
        } else {
          setDocuments(list);
        }
      } catch {
        toast("Failed to fetch documents", "error");
      } finally {
        setTxLoading(false);
      }
    },
    [branchId, token, toast]
  );

  // Re-fetch whenever the panel opens or filters change
  useEffect(() => {
    if (txPanelOpen) {
      fetchDocuments(activeDocType, fromDate, toDate, searchValue);
    }
  }, [txPanelOpen, activeDocType, fromDate, toDate]);

  // ── Debounced search ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchValue.length < 2) {
      if (txPanelOpen) fetchDocuments(activeDocType, fromDate, toDate);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      await fetchDocuments(activeDocType, fromDate, toDate, searchValue);
      setIsSearching(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchValue]);

  // ── Customer picker: search existing customers ───────────────────────────
  useEffect(() => {
    if (customerSearchDebounce.current) clearTimeout(customerSearchDebounce.current);
    if (customerSearchTerm.length < 2) {
      setCustomerSearchResults([]);
      return;
    }
    setCustomerSearchLoading(true);
    customerSearchDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(
          getApiUrl(
            `${API_ENDPOINTS.CUSTOMERS_SEARCH}?q=${encodeURIComponent(customerSearchTerm)}`
          ),
          { headers: getAuthHeadersWithToken(token) }
        );
        const json = await res.json();
        if (json.success && json.data) setCustomerSearchResults(json.data);
      } catch {
        // silently ignore
      } finally {
        setCustomerSearchLoading(false);
      }
    }, 300);
    return () => {
      if (customerSearchDebounce.current) clearTimeout(customerSearchDebounce.current);
    };
  }, [customerSearchTerm, token]);

  function openCustomerPicker() {
    setCustomerPickerMode("search");
    setCustomerSearchTerm("");
    setCustomerSearchResults([]);
    setCustomerPickerOpen(true);
  }

  function selectInvoiceCustomer(c: Customer) {
    setInvoiceCustomer(c);
    setCustomerPickerOpen(false);
    setCustomerSearchTerm("");
    setCustomerSearchResults([]);
  }

  // ── Open transactions panel for a doc type ────────────────────────────────
  function openTransactions(type: DocType) {
    setActiveDocType(type);
    setTxPanelOpen(true);
  }

  // ── Invoice totals ────────────────────────────────────────────────────────
  const invoiceSubtotal = invoiceLines.reduce((s, l) => s + lineSubtotal(l), 0);
  const invoiceTax = invoiceLines.reduce((s, l) => s + lineTax(l), 0);
  const invoiceDiscount = invoiceLines.reduce((s, l) => s + l.discount, 0);
  const invoiceTotal = invoiceLines.reduce((s, l) => s + lineTotal(l), 0);

  // ── Update a line field ───────────────────────────────────────────────────
  function updateLine(key: string, patch: Partial<InvoiceLine>) {
    setInvoiceLines((prev) => prev.map((l) => (l._key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setInvoiceLines((prev) => prev.filter((l) => l._key !== key));
  }

  function resetInvoiceForm() {
    setInvoiceCustomer(null);
    setInvoiceLines([emptyLine()]);
    setInvoicePaymentMethod("cash");
    setInvoiceNotes("");
    setInvoiceSubmitting(null);
  }

  // ── Submit new invoice ─────────────────────────────────────────────────────
  async function submitInvoice(type: "DRAFT" | "INVOICE") {
    const validLines = invoiceLines.filter((l) => l.productId && l.quantity > 0);
    if (!validLines.length) {
      toast("Add at least one product", "warning");
      return;
    }
    if (!branchId) {
      toast("No branch selected", "error");
      return;
    }

    setInvoiceSubmitting(type === "DRAFT" ? "draft" : "invoice");
    try {
      const body = {
        type,
        customerId: invoiceCustomer?.id || undefined,
        issueDate: new Date().toISOString(),
        notes: invoiceNotes || undefined,
        paymentMethod: invoicePaymentMethod,
        subtotal: invoiceSubtotal,
        tax: invoiceTax,
        discount: invoiceDiscount,
        total: invoiceTotal,
        items: validLines.map((l) => ({
          productId: l.productId,
          description: l.description || l.productName || "Sale item",
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate,
          discount: l.discount,
          total: lineTotal(l),
        })),
      };

      const res = await fetch(getApiUrl(API_ENDPOINTS.SALES_DOCUMENTS), {
        method: "POST",
        headers: getAuthHeadersWithToken(token),
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.error?.message || json.message || "Failed to save document", "error");
        return;
      }

      const label = type === "DRAFT" ? "Draft saved" : "Invoice created";
      toast(`${label}: ${json.data?.documentId || ""}`, "success");
      setInvoiceOpen(false);
      resetInvoiceForm();
    } catch (e) {
      toast("Unexpected error", "error");
    } finally {
      setInvoiceSubmitting(null);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── MENU BAR ── */}
      <div className="flex flex-wrap items-center  rounded-lg border bg-white px-4 py-2 shadow-sm">
        <div className="flex flex-3 gap-2 items  ">
          {/* 1 — Master */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Master <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setShowAddCustomer(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                New Customer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 2 — Transactions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Transactions <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(["ALL", "DRAFT", "QUOTE", "CREDIT_NOTE", "INVOICE"] as DocType[]).map((t, i) => (
                <React.Fragment key={t}>
                  {i === 1 && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={() => openTransactions(t)}>
                    {DOC_TYPE_LABELS[t]}
                    {t === activeDocType && txPanelOpen && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                  </DropdownMenuItem>
                </React.Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 3 — Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                Filter
                {(fromDate || toDate) && (
                  <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 space-y-3">
              <p className="text-xs font-semibold text-slate-700">Date Range</p>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">From Date</Label>
                  <Input
                    type="date"
                    value={fromDate}
                    max={toDate || undefined}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To Date</Label>
                  <Input
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>
              {(fromDate || toDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-slate-500"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                  }}
                >
                  <X className="mr-1.5 h-3.5 w-3.5" /> Clear dates
                </Button>
              )}
            </PopoverContent>
          </Popover>

          {/* 4 — Search */}
          <div className="flex items-center gap-3">
            <Button
              variant={searchOpen ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (searchOpen) {
                  setSearchOpen(false);
                  setSearchValue("");
                } else {
                  setSearchOpen(true);
                  if (!txPanelOpen) setTxPanelOpen(true);
                }
              }}
            >
              <Search className="mr-1.5 h-3.5 w-8" />
              Search
            </Button>
            {searchOpen && (
              <div className="relative">
                <Input
                  ref={searchRef}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Invoice no. or customer…"
                  className="h-6 w-52 pr-7 text-xs "
                />
                {isSearching && (
                  <Loader2 className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400" />
                )}
                {!isSearching && searchValue && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setSearchValue("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 5- user */}
        <div className="flex flex-2 gap-2 items-center justify-center text-sm font-bold    ">
          <p className="text-sm text-muted-foreground">
            {user?.branch?.name || "Main Branch"} • {user?.name}
          </p>
          <span>
            {currentTime.toLocaleTimeString("en-KE", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </div>

        <div className="flex flex-1 justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/pos?view=document")}>
            <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />
            New document
          </Button>
          {/* 6 — New Sales Invoice */}
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => {
              resetInvoiceForm();
              setInvoiceOpen(true);
            }}
          >
            <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />
            New Sales Invoice
          </Button>
        </div>
      </div>

      {/* ── TRANSACTIONS SLIDE-OVER PANEL ── */}
      {txPanelOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setTxPanelOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between border-b px-5 py-3 bg-slate-50">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-slate-800">Transactions</h2>
                <Badge variant="secondary">{DOC_TYPE_LABELS[activeDocType]}</Badge>
                {(fromDate || toDate) && (
                  <Badge variant="outline" className="text-[10px]">
                    {fromDate || "…"} → {toDate || "…"}
                  </Badge>
                )}
              </div>
              <button
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200"
                onClick={() => setTxPanelOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-auto p-4">
              {txLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
                </div>
              ) : documents.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
                  <FilePlus2 className="h-8 w-8 opacity-40" />
                  <p className="text-sm">No documents found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-mono font-medium">{doc.documentId}</TableCell>
                        <TableCell className="whitespace-nowrap text-slate-500">
                          {safeFormatDate(doc.issueDate, { dateStyle: "short" })}
                        </TableCell>
                        <TableCell>
                          {doc.customer?.name ?? (
                            <span className="text-slate-400 italic">Walk-in</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-[10px]">
                            {doc.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={STATUS_VARIANT[doc.status] ?? "secondary"}
                            className="text-[10px]"
                          >
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(doc.total)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="View"
                              onClick={() => {
                                setTxPanelOpen(false);
                                router.push(`/dashboard/pos/sales/${doc.id}`);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Print"
                              onClick={() => {
                                setTxPanelOpen(false);
                                router.push(`/dashboard/pos/sales/${doc.id}?print=true`);
                              }}
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Panel footer */}
            <div className="border-t px-5 py-3 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
              <span>
                {documents.length} document{documents.length !== 1 ? "s" : ""}
              </span>
              <span>Press Esc to close</span>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD CUSTOMER DIALOG (Master → New Customer) ── */}
      <AddCustomerDialog
        open={showAddCustomer}
        onOpenChange={setShowAddCustomer}
        token={token}
        onCustomerCreated={(customer) => {
          onCustomerCreated(customer);
          setShowAddCustomer(false);
          toast(`Customer "${customer.name}" created`, "success");
        }}
      />

      {/* ── NEW SALES INVOICE DIALOG ── */}
      <Dialog
        open={invoiceOpen}
        onOpenChange={(open) => {
          if (!open) resetInvoiceForm();
          setInvoiceOpen(open);
        }}
      >
        <DialogContent
          className="max-w-5xl w-full h-[90vh] flex flex-col gap-0 p-0 overflow-hidden"
          showCloseButton={false}
        >
          {/* Dialog header */}
          <DialogHeader className="flex-none px-6 py-4 border-b bg-slate-50">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold">New Sales Invoice</DialogTitle>
              <button
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200"
                onClick={() => {
                  resetInvoiceForm();
                  setInvoiceOpen(false);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>

          {/* Dialog scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Customer selector */}
            <div className="flex items-center justify-between rounded-lg border p-3 bg-slate-50">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-0.5">Customer</p>
                {invoiceCustomer ? (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-slate-900">
                      {invoiceCustomer.name}
                    </span>
                    {invoiceCustomer.phone && (
                      <span className="text-xs text-slate-500">{invoiceCustomer.phone}</span>
                    )}
                    <button
                      className="text-slate-400 hover:text-slate-600"
                      onClick={() => setInvoiceCustomer(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-slate-400 italic">Walk-in / Counter Sale</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={openCustomerPicker}>
                  {invoiceCustomer ? "Change" : "Select Customer"}
                </Button>
              </div>
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Line Items
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInvoiceLines((prev) => [...prev, emptyLine()])}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Row
                </Button>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600 w-52">
                        Product
                      </th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">
                        Description
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600 w-16">
                        Qty
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600 w-24">
                        Unit Price
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600 w-16">
                        Tax %
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600 w-20">
                        Discount
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600 w-24">
                        Amount
                      </th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceLines.map((line, idx) => (
                      <tr
                        key={line._key}
                        className={cn(
                          "border-b last:border-0",
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                        )}
                      >
                        {/* Product search cell */}
                        <td className="px-2 py-1.5 align-top">
                          {line.productId ? (
                            <div className="flex items-center gap-1">
                              <span className="font-medium truncate max-w-[160px]">
                                {line.productName}
                              </span>
                              <button
                                className="text-slate-400 hover:text-slate-600 shrink-0"
                                onClick={() =>
                                  updateLine(line._key, { productId: "", productName: "" })
                                }
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-48">
                              <AutocompleteProductSearch
                                branchId={branchId ?? ""}
                                token={token}
                                autoFocus={false}
                                onSelect={(product) =>
                                  updateLine(line._key, {
                                    productId: product.id,
                                    productName: product.name,
                                    description: product.name,
                                    unitPrice: product.unit_price,
                                  })
                                }
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            value={line.description}
                            onChange={(e) => updateLine(line._key, { description: e.target.value })}
                            className="h-7 text-xs"
                            placeholder="Description"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(line._key, {
                                quantity: Math.max(1, Number(e.target.value)),
                              })
                            }
                            className="h-7 text-xs text-right"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={line.unitPrice}
                            onChange={(e) =>
                              updateLine(line._key, { unitPrice: Number(e.target.value) })
                            }
                            className="h-7 text-xs text-right"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={Math.round(line.taxRate * 100)}
                            onChange={(e) =>
                              updateLine(line._key, { taxRate: Number(e.target.value) / 100 })
                            }
                            className="h-7 text-xs text-right"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={line.discount}
                            onChange={(e) =>
                              updateLine(line._key, { discount: Number(e.target.value) })
                            }
                            className="h-7 text-xs text-right"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right font-medium whitespace-nowrap">
                          {formatCurrency(lineTotal(line))}
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <button
                            className="text-slate-400 hover:text-red-500"
                            onClick={() => removeLine(line._key)}
                            disabled={invoiceLines.length === 1}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals + payment + notes row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: payment method + notes */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Payment Method</Label>
                  <Select
                    value={invoicePaymentMethod}
                    onValueChange={(v) => setInvoicePaymentMethod(v as PaymentMethod)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Notes</Label>
                  <Textarea
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    placeholder="Optional notes…"
                    className="min-h-20 text-xs"
                  />
                </div>
              </div>

              {/* Right: totals */}
              <div className="rounded-lg border bg-slate-50 p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
                  Summary
                </p>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Subtotal</span>
                  <span>{formatCurrency(invoiceSubtotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Discount</span>
                  <span className="text-red-600">− {formatCurrency(invoiceDiscount)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">VAT (16%)</span>
                  <span>{formatCurrency(invoiceTax)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-sm font-bold">
                  <span>Grand Total</span>
                  <span className="text-emerald-700">{formatCurrency(invoiceTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dialog footer */}
          <DialogFooter className="flex-none border-t px-6 py-4 bg-slate-50">
            <Button
              variant="outline"
              onClick={() => {
                resetInvoiceForm();
                setInvoiceOpen(false);
              }}
              disabled={!!invoiceSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => submitInvoice("DRAFT")}
              disabled={!!invoiceSubmitting}
            >
              {invoiceSubmitting === "draft" ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving…
                </>
              ) : (
                "Save as Draft"
              )}
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => submitInvoice("INVOICE")}
              disabled={!!invoiceSubmitting}
            >
              {invoiceSubmitting === "invoice" ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Creating…
                </>
              ) : (
                "Create Invoice"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── INVOICE CUSTOMER PICKER (search existing + create new) ── */}
      <Dialog
        open={customerPickerOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCustomerSearchTerm("");
            setCustomerSearchResults([]);
            setCustomerPickerMode("search");
          }
          setCustomerPickerOpen(open);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {customerPickerMode === "create" ? "New Customer" : "Select Customer"}
            </DialogTitle>
          </DialogHeader>

          {customerPickerMode === "search" ? (
            <div className="space-y-3">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  autoFocus
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  placeholder="Search by name or phone…"
                  className="pl-8"
                />
              </div>

              {/* Walk-in option */}
              <button
                className="flex w-full items-center gap-3 rounded-lg border-2 border-amber-200 bg-amber-50 p-3 hover:bg-amber-100 transition-colors"
                onClick={() => {
                  setInvoiceCustomer(null);
                  setCustomerPickerOpen(false);
                }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-200 text-amber-700 shrink-0">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-amber-900">Walk-in / Counter Sale</p>
                  <p className="text-[11px] text-amber-700">No customer attached</p>
                </div>
              </button>

              {/* Results */}
              <div className="max-h-56 overflow-y-auto space-y-1">
                {customerSearchLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : customerSearchResults.length > 0 ? (
                  customerSearchResults.map((c) => (
                    <button
                      key={c.id}
                      className="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
                      onClick={() => selectInvoiceCustomer(c)}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 shrink-0 text-xs font-bold">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-900 truncate">{c.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {c.phone || c.email || "No contact info"}
                        </p>
                      </div>
                    </button>
                  ))
                ) : customerSearchTerm.length >= 2 ? (
                  <p className="text-center text-xs text-slate-400 py-4">No customers found</p>
                ) : (
                  <p className="text-center text-xs text-slate-400 py-4">
                    Type at least 2 characters to search
                  </p>
                )}
              </div>

              {/* Switch to create mode */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setCustomerPickerMode("create")}
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Create New Customer
              </Button>
            </div>
          ) : (
            /* ── Create mode ── */
            <div className="space-y-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500 -mt-1 px-0"
                onClick={() => setCustomerPickerMode("search")}
              >
                ← Back to search
              </Button>
              <AddCustomerDialog
                open={customerPickerOpen && customerPickerMode === "create"}
                onOpenChange={(open) => {
                  if (!open) setCustomerPickerMode("search");
                }}
                token={token}
                onCustomerCreated={(customer) => {
                  selectInvoiceCustomer(customer);
                  toast(`Customer "${customer.name}" created`, "success");
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
