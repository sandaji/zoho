"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  FileText,
  FileEdit,
  Receipt,
  Banknote,
  Eye,
  Pencil,
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

interface POSMenuBarProps {
  token: string;
  branchId: string | null;
  onCustomerCreated: (customer: Customer) => void;
  // The document editor now lives in the main POS cart (unified shopping
  // cart), so "New document" just tells the page which mode to switch the
  // cart into instead of opening its own separate editor.
  onNewDraft: () => void;
  onNewQuote: () => void;
  onEditDocument: (id: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Returns YYYY-MM-DD for today in local timezone
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DOC_TYPE_LABELS: Record<DocType, string> = {
  ALL: "All",
  DRAFT: "Sales Drafts",
  QUOTE: "Quotations",
  CREDIT_NOTE: "Credit Notes / Sales Return",
  INVOICE: "Sales Invoices",
};

// Unique colour per document type, for fast visual scanning in the
// transactions table. A CONVERTED quote (i.e. one already turned into an
// invoice) gets its own distinct shade so it reads differently from a
// still-open quotation at a glance.
const DOC_TYPE_BADGE_CLASS: Record<DocType, string> = {
  ALL: "bg-slate-100 text-slate-700 border-slate-200",
  DRAFT: "bg-slate-100 text-slate-700 border-slate-300",
  QUOTE: "bg-blue-50 text-blue-700 border-blue-200",
  CREDIT_NOTE: "bg-rose-50 text-rose-700 border-rose-200",
  INVOICE: "bg-emerald-50 text-emerald-700 border-emerald-200",
};
const CONVERTED_QUOTE_BADGE_CLASS = "bg-indigo-50 text-indigo-700 border-indigo-200";

function docTypeBadgeClass(doc: SalesDocument): string {
  if (doc.type === "QUOTE" && doc.status === "CONVERTED") {
    return CONVERTED_QUOTE_BADGE_CLASS;
  }
  return DOC_TYPE_BADGE_CLASS[doc.type as DocType] ?? DOC_TYPE_BADGE_CLASS.ALL;
}

function docTypeBadgeLabel(doc: SalesDocument): string {
  if (doc.type === "QUOTE" && doc.status === "CONVERTED") return "Quote \u2192 Invoice";
  return doc.type;
}

// The three document types a user can start from scratch. Invoices are
// never created directly here — they only come from converting a saved
// Draft or Quote (see "Convert to Invoice" on the document itself), and
// Credit Notes only come from an already-closed Invoice.
const NEW_DOC_CHOICES: Array<{
  type: "DRAFT" | "QUOTE" | "CREDIT_NOTE";
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}> = [
  {
    type: "DRAFT",
    title: "Draft",
    description: "Save items for later. Converts to an invoice when ready.",
    icon: FileEdit,
    accent: "border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700",
  },
  {
    type: "QUOTE",
    title: "Quote",
    description: "Send a price quotation to a customer for approval.",
    icon: FileText,
    accent: "border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700",
  },
  {
    type: "CREDIT_NOTE",
    title: "Credit Note",
    description: "Return items against an already-closed invoice.",
    icon: Receipt,
    accent: "border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700",
  },
];

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

export function POSMenuBar({
  token,
  branchId,
  onCustomerCreated,
  onNewDraft,
  onNewQuote,
  onEditDocument,
}: POSMenuBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // ── New document: type chooser (Draft / Quote / Credit Note) ──
  const [docChooserOpen, setDocChooserOpen] = useState(false);

  // ── Convert-to-invoice (row action) ──
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // ── Credit note dialog (raised against a closed/paid invoice) ──
  const [creditNoteOpen, setCreditNoteOpen] = useState(false);
  const [creditNoteInvoice, setCreditNoteInvoice] = useState<SalesDocument | null>(null);
  const [creditNoteReturnQty, setCreditNoteReturnQty] = useState<Record<string, number>>({});
  const [creditNoteAlreadyCredited, setCreditNoteAlreadyCredited] = useState<Record<string, number>>({});
  const [creditNoteReason, setCreditNoteReason] = useState("");
  const [creditNoteLoading, setCreditNoteLoading] = useState(false);
  const [creditNoteSubmitting, setCreditNoteSubmitting] = useState(false);

  // ── Record payment dialog (supports split payments — multiple methods
  // against one invoice, e.g. part cash + part M-Pesa — and partial
  // payments left to be cleared later) ──
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<SalesDocument | null>(null);
  const [paymentLines, setPaymentLines] = useState<
    { _key: string; method: PaymentMethod; amount: number; reference: string }[]
  >([]);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // ── Deep link: /dashboard/pos?view=document opens the type chooser ──
  useEffect(() => {
    if (searchParams?.get("view") === "document") {
      setDocChooserOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("view");
      const qs = params.toString();
      router.replace(qs ? `/dashboard/pos?${qs}` : "/dashboard/pos");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  // ── Open transactions panel for a doc type ────────────────────────────────
  function openTransactions(type: DocType) {
    setActiveDocType(type);
    setTxPanelOpen(true);
  }

  // ── Open the credit note dialog for a closed/paid invoice ──────────────────
  async function openCreditNoteFor(doc: SalesDocument) {
    setTxPanelOpen(false);
    setCreditNoteInvoice(doc);
    setCreditNoteReturnQty({});
    setCreditNoteReason("");
    setCreditNoteAlreadyCredited({});
    setCreditNoteOpen(true);
    setCreditNoteLoading(true);
    try {
      const params = new URLSearchParams({ type: "CREDIT_NOTE", sourceDocumentId: doc.id });
      const res = await fetch(`${getApiUrl(API_ENDPOINTS.SALES_DOCUMENTS)}?${params}`, {
        headers: getAuthHeadersWithToken(token),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const raw = json.data;
        const list: SalesDocument[] = Array.isArray(raw) ? raw : (raw.data ?? []);
        const credited: Record<string, number> = {};
        for (const cn of list) {
          for (const item of cn.items || []) {
            credited[item.productId] = (credited[item.productId] || 0) + Math.abs(item.quantity);
          }
        }
        setCreditNoteAlreadyCredited(credited);
      }
    } catch {
      // Non-fatal — proceed assuming nothing has been credited yet.
    } finally {
      setCreditNoteLoading(false);
    }
  }

  // ── Submit the credit note ────────────────────────────────────────────
  async function submitCreditNote() {
    if (!creditNoteInvoice) return;
    const items = creditNoteInvoice.items
      .filter((item) => (creditNoteReturnQty[item.id] || 0) > 0)
      .map((item) => ({
        productId: item.productId,
        description: item.description,
        quantity: creditNoteReturnQty[item.id],
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        discount: 0,
      }));

    if (!items.length) {
      toast("Select at least one item to return", "warning");
      return;
    }
    if (creditNoteReason.trim().length < 10) {
      toast("Reason must be at least 10 characters", "warning");
      return;
    }

    setCreditNoteSubmitting(true);
    try {
      const res = await fetch(
        getApiUrl(API_ENDPOINTS.SALES_DOCUMENT_CREDIT_NOTE(creditNoteInvoice.id)),
        {
          method: "POST",
          headers: getAuthHeadersWithToken(token),
          body: JSON.stringify({ items, reason: creditNoteReason.trim() }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.error?.message || json.message || "Failed to create credit note", "error");
        return;
      }
      toast(`Credit note created: ${json.data?.documentId || ""}`, "success");
      setCreditNoteOpen(false);
      setCreditNoteInvoice(null);
      setCreditNoteReturnQty({});
      setCreditNoteReason("");
      fetchDocuments(activeDocType, fromDate, toDate, searchValue);
    } catch {
      toast("Failed to create credit note", "error");
    } finally {
      setCreditNoteSubmitting(false);
    }
  }

  // ── Open the record-payment dialog for an invoice with an outstanding balance ──
  function openPaymentDialog(doc: SalesDocument) {
    setTxPanelOpen(false);
    setPaymentInvoice(doc);
    setPaymentLines([
      { _key: crypto.randomUUID(), method: "cash", amount: doc.balance, reference: "" },
    ]);
    setPaymentDialogOpen(true);
  }

  function addPaymentLine() {
    setPaymentLines((prev) => [
      ...prev,
      { _key: crypto.randomUUID(), method: "cash", amount: 0, reference: "" },
    ]);
  }

  function updatePaymentLine(
    key: string,
    patch: Partial<{ method: PaymentMethod; amount: number; reference: string }>
  ) {
    setPaymentLines((prev) => prev.map((l) => (l._key === key ? { ...l, ...patch } : l)));
  }

  function removePaymentLine(key: string) {
    setPaymentLines((prev) => prev.filter((l) => l._key !== key));
  }

  // ── Submit one or more payment lines against the invoice, sequentially.
  // Each line becomes its own Payment record (its own method/reference),
  // so "500 cash + 500 M-Pesa" on one invoice records as two payments. A
  // partial total is fine — the balance simply carries forward for the
  // customer to clear later. ──
  async function submitPayments() {
    if (!paymentInvoice) return;
    const validLines = paymentLines.filter((l) => l.amount > 0);
    if (!validLines.length) {
      toast("Enter at least one payment amount", "warning");
      return;
    }
    const totalEntered = validLines.reduce((s, l) => s + l.amount, 0);
    if (totalEntered > paymentInvoice.balance + 0.01) {
      toast(
        `Total entered (${formatCurrency(totalEntered)}) exceeds the outstanding balance (${formatCurrency(paymentInvoice.balance)})`,
        "warning"
      );
      return;
    }

    setPaymentSubmitting(true);
    try {
      for (const line of validLines) {
        const res = await fetch(getApiUrl(API_ENDPOINTS.SALES_DOCUMENT_PAYMENT(paymentInvoice.id)), {
          method: "POST",
          headers: getAuthHeadersWithToken(token),
          body: JSON.stringify({
            amount: line.amount,
            payment_method: line.method,
            reference: line.reference || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          toast(json.error?.message || json.message || "Failed to record a payment", "error");
          fetchDocuments(activeDocType, fromDate, toDate, searchValue);
          return;
        }
      }
      const fullySettled = totalEntered >= paymentInvoice.balance - 0.01;
      toast(
        fullySettled
          ? `Invoice ${paymentInvoice.documentId} fully paid`
          : `Payment recorded — balance remaining: ${formatCurrency(paymentInvoice.balance - totalEntered)}`,
        "success"
      );
      setPaymentDialogOpen(false);
      setPaymentInvoice(null);
      setPaymentLines([]);
      fetchDocuments(activeDocType, fromDate, toDate, searchValue);
    } catch {
      toast("Failed to record payment", "error");
    } finally {
      setPaymentSubmitting(false);
    }
  }

  // ── Open the type chooser (Draft / Quote / Credit Note) ────────────────────
  function openNewDocument() {
    setDocChooserOpen(true);
  }

  // ── Pick a type from the chooser ────────────────────────────────────────────
  function chooseDocType(type: "DRAFT" | "QUOTE" | "CREDIT_NOTE") {
    setDocChooserOpen(false);
    if (type === "CREDIT_NOTE") {
      // Credit notes always originate from an already-closed/paid invoice —
      // open the transactions panel pre-filtered to invoices so the user can
      // pick the source invoice. Full item-level credit-note entry (partial
      // vs. full return) happens from that invoice's detail view.
      setActiveDocType("INVOICE");
      setTxPanelOpen(true);
      toast("Select a closed/paid invoice to raise a credit note against", "info");
      return;
    }
    if (type === "DRAFT") {
      onNewDraft();
    } else {
      onNewQuote();
    }
  }

  // ── Convert a saved Draft/Quote to an Invoice ───────────────────────────────
  async function handleConvertToInvoice(doc: SalesDocument) {
    setConvertingId(doc.id);
    try {
      const res = await fetch(getApiUrl(API_ENDPOINTS.SALES_DOCUMENT_CONVERT(doc.id)), {
        method: "POST",
        headers: getAuthHeadersWithToken(token),
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.error?.message || json.message || "Failed to convert to invoice", "error");
        return;
      }
      toast(`Invoice created: ${json.data?.documentId || ""}`, "success");
      fetchDocuments(activeDocType, fromDate, toDate, searchValue);
    } catch {
      toast("Failed to convert to invoice", "error");
    } finally {
      setConvertingId(null);
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
          {/* 6 — New document: choose Draft / Quote / Credit Note */}
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={openNewDocument}
          >
            <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />
            New document
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
                            <span className="text-slate-400 italic">Counter Customer</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("capitalize text-[10px]", docTypeBadgeClass(doc))}>
                            {docTypeBadgeLabel(doc)}
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
                            {(doc.type === "DRAFT" ||
                              (doc.type === "QUOTE" && doc.status !== "CONVERTED")) &&
                              doc.status !== "VOID" && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title="Convert to Invoice"
                                  disabled={convertingId === doc.id}
                                  onClick={() => handleConvertToInvoice(doc)}
                                >
                                  {convertingId === doc.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <FilePlus2 className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              )}
                            {doc.type === "INVOICE" && doc.status === "PAID" && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Raise Credit Note"
                                onClick={() => openCreditNoteFor(doc)}
                              >
                                <Receipt className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {doc.type === "INVOICE" &&
                              (doc.status === "SENT" || doc.status === "PARTIALLY_PAID") &&
                              doc.balance > 0 && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title="Record Payment"
                                  onClick={() => openPaymentDialog(doc)}
                                >
                                  <Banknote className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title={
                                (doc.type === "DRAFT" ||
                                  (doc.type === "QUOTE" && doc.status !== "CONVERTED")) &&
                                doc.status !== "VOID"
                                  ? "Edit"
                                  : "View"
                              }
                              onClick={() => {
                                if (
                                  (doc.type === "DRAFT" ||
                                    (doc.type === "QUOTE" && doc.status !== "CONVERTED")) &&
                                  doc.status !== "VOID"
                                ) {
                                  setTxPanelOpen(false);
                                  onEditDocument(doc.id);
                                } else {
                                  setTxPanelOpen(false);
                                  router.push(`/dashboard/pos/sales/${doc.id}`);
                                }
                              }}
                            >
                              {(doc.type === "DRAFT" ||
                                (doc.type === "QUOTE" && doc.status !== "CONVERTED")) &&
                              doc.status !== "VOID" ? (
                                <Pencil className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
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

      {/* ── DOCUMENT TYPE CHOOSER ── */}
      <Dialog open={docChooserOpen} onOpenChange={setDocChooserOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New Document</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500 -mt-2">
            Choose what you're creating. Invoices are never created directly here — save a
            Draft or Quote first, then convert it to an Invoice when it's ready.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {NEW_DOC_CHOICES.map((choice) => {
              const Icon = choice.icon;
              return (
                <button
                  key={choice.type}
                  onClick={() => chooseDocType(choice.type)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-colors",
                    choice.accent
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-sm font-semibold">{choice.title}</span>
                  <span className="text-xs opacity-80">{choice.description}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

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

      {/* ── CREDIT NOTE DIALOG (against a closed/paid invoice) ── */}
      <Dialog
        open={creditNoteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreditNoteInvoice(null);
            setCreditNoteReturnQty({});
            setCreditNoteReason("");
          }
          setCreditNoteOpen(open);
        }}
      >
        <DialogContent
          className="max-w-3xl w-full max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden"
          showCloseButton={false}
        >
          <DialogHeader className="flex-none px-6 py-4 border-b bg-slate-50">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold">
                Credit Note{creditNoteInvoice ? ` \u2014 ${creditNoteInvoice.documentId}` : ""}
              </DialogTitle>
              <button
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200"
                onClick={() => setCreditNoteOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {creditNoteLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : creditNoteInvoice ? (
              <>
                <p className="text-xs text-slate-500">
                  Select which products and quantities are being returned. Returns can be
                  partial or cover the full invoice.
                </p>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Product</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600 w-24">
                          Invoiced
                        </th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600 w-24">
                          Already Credited
                        </th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600 w-28">
                          Return Qty
                        </th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600 w-24">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditNoteInvoice.items.map((item) => {
                        const alreadyCredited = creditNoteAlreadyCredited[item.productId] || 0;
                        const remaining = Math.max(0, item.quantity - alreadyCredited);
                        const returnQty = creditNoteReturnQty[item.id] || 0;
                        return (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="px-3 py-2">
                              <p className="font-medium">{item.product?.name || item.description}</p>
                              {item.product?.sku && (
                                <p className="text-[11px] text-slate-400 font-mono">
                                  {item.product.sku}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                            <td className="px-3 py-2 text-right text-slate-500">{alreadyCredited}</td>
                            <td className="px-3 py-2 text-right">
                              <Input
                                type="number"
                                min={0}
                                max={remaining}
                                value={returnQty}
                                disabled={remaining === 0}
                                onChange={(e) => {
                                  const v = Math.max(0, Math.min(remaining, Number(e.target.value)));
                                  setCreditNoteReturnQty((prev) => ({ ...prev, [item.id]: v }));
                                }}
                                className="h-7 w-20 text-xs text-right ml-auto"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              {formatCurrency((returnQty || 0) * item.unitPrice)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Reason (required)</Label>
                  <Textarea
                    value={creditNoteReason}
                    onChange={(e) => setCreditNoteReason(e.target.value)}
                    placeholder="Why is this being returned/credited? (min. 10 characters)"
                    className="min-h-20 text-xs"
                  />
                </div>
              </>
            ) : null}
          </div>

          <DialogFooter className="flex-none border-t px-6 py-4 bg-slate-50">
            <Button variant="outline" onClick={() => setCreditNoteOpen(false)} disabled={creditNoteSubmitting}>
              Cancel
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={submitCreditNote}
              disabled={creditNoteSubmitting || creditNoteLoading}
            >
              {creditNoteSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Submitting…
                </>
              ) : (
                "Raise Credit Note"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── RECORD PAYMENT DIALOG (supports split payments across methods, and partial payments) ── */}
      <Dialog
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentInvoice(null);
            setPaymentLines([]);
          }
          setPaymentDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-lg w-full flex flex-col gap-0 p-0 overflow-hidden" showCloseButton={false}>
          <DialogHeader className="flex-none px-6 py-4 border-b bg-slate-50">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold">
                Record Payment{paymentInvoice ? ` — ${paymentInvoice.documentId}` : ""}
              </DialogTitle>
              <button
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200"
                onClick={() => setPaymentDialogOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>

          {paymentInvoice && (
            <div className="px-6 pt-4 space-y-4">
              <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-4 py-3 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Invoice Total</p>
                  <p className="font-semibold">{formatCurrency(paymentInvoice.total)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Already Paid</p>
                  <p className="font-semibold text-emerald-700">
                    {formatCurrency(paymentInvoice.total - paymentInvoice.balance)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 text-xs">Balance Due</p>
                  <p className="font-bold text-rose-600">{formatCurrency(paymentInvoice.balance)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Payment{paymentLines.length > 1 ? "s" : ""} (split across methods if needed)
                  </Label>
                  <Button variant="outline" size="sm" onClick={addPaymentLine}>
                    <Plus className="mr-1 h-3 w-3" /> Add Method
                  </Button>
                </div>
                {paymentLines.map((line) => (
                  <div key={line._key} className="flex items-center gap-2">
                    <Select
                      value={line.method}
                      onValueChange={(v) => updatePaymentLine(line._key, { method: v as PaymentMethod })}
                    >
                      <SelectTrigger className="h-9 w-32 shrink-0">
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
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.amount || ""}
                      onChange={(e) =>
                        updatePaymentLine(line._key, { amount: Number(e.target.value) })
                      }
                      placeholder="Amount"
                      className="h-9 text-right"
                    />
                    <Input
                      value={line.reference}
                      onChange={(e) => updatePaymentLine(line._key, { reference: e.target.value })}
                      placeholder="Ref (optional)"
                      className="h-9 w-28 shrink-0"
                    />
                    {paymentLines.length > 1 && (
                      <button
                        className="text-slate-400 hover:text-red-500 shrink-0"
                        onClick={() => removePaymentLine(line._key)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {(() => {
                const totalEntered = paymentLines.reduce((s, l) => s + (l.amount || 0), 0);
                const remaining = paymentInvoice.balance - totalEntered;
                return (
                  <div className="flex justify-between text-xs px-1">
                    <span className="text-slate-500">Total entered: {formatCurrency(totalEntered)}</span>
                    <span className={remaining < -0.01 ? "text-red-600 font-semibold" : "text-slate-500"}>
                      {remaining > 0.01
                        ? `Remaining after this: ${formatCurrency(remaining)}`
                        : remaining < -0.01
                          ? "Exceeds balance due"
                          : "Fully settled"}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          <DialogFooter className="flex-none border-t px-6 py-4 bg-slate-50 mt-4">
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} disabled={paymentSubmitting}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={submitPayments}
              disabled={paymentSubmitting}
            >
              {paymentSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Recording…
                </>
              ) : (
                "Record Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
