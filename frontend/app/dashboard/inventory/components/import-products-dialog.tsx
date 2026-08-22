"use client";

import { useState, useRef } from "react";
import { Loader2, Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { BranchSelect } from "@/components/ui/branch-select";
import { VendorSelect } from "@/components/ui/vendor-select";
import {
  bulkImportProducts,
  BulkImportProductRow,
  BulkImportResult,
} from "@/lib/admin-api";

interface ImportProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

interface ParsedRow extends BulkImportProductRow {
  _rowNum: number; // spreadsheet row number (header = 1)
  _error: string | null; // client-side validation problem, if any
}

// Accepts the exact header set the Export button produces, case/spacing-insensitive.
const HEADER_MAP: Record<string, keyof BulkImportProductRow> = {
  sku: "sku",
  name: "name",
  category: "category",
  quantity: "quantity",
  costprice: "cost_price",
  sellingprice: "unit_price",
  status: "status",
  reorderlevel: "reorder_level",
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseWorkbook(data: ArrayBuffer): ParsedRow[] {
  const workbook = XLSX.read(data, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    defval: "",
  });

  return rawRows.map((raw, index) => {
    // Map whatever headers the file actually has onto our known fields
    const mapped: Partial<BulkImportProductRow> = {};
    for (const [key, value] of Object.entries(raw)) {
      const field = HEADER_MAP[normalizeHeader(key)];
      if (!field) continue;
      (mapped as any)[field] = value;
    }

    const sku = String(mapped.sku ?? "").trim();
    const name = String(mapped.name ?? "").trim();
    const category = mapped.category ? String(mapped.category).trim() : undefined;
    const costPrice = mapped.cost_price === "" || mapped.cost_price == null ? NaN : Number(mapped.cost_price);
    const unitPrice = mapped.unit_price === "" || mapped.unit_price == null ? NaN : Number(mapped.unit_price);
    const quantity = mapped.quantity === "" || mapped.quantity == null ? undefined : Number(mapped.quantity);
    const reorderLevel =
      mapped.reorder_level === "" || mapped.reorder_level == null ? undefined : Number(mapped.reorder_level);
    const status = mapped.status ? String(mapped.status).trim().toLowerCase() : undefined;

    let error: string | null = null;
    if (!sku) error = "Missing SKU";
    else if (!name) error = "Missing product name";
    else if (isNaN(costPrice) || costPrice < 0) error = "Invalid cost price";
    else if (isNaN(unitPrice) || unitPrice < 0) error = "Invalid selling price";
    else if (status && !["active", "inactive", "discontinued"].includes(status)) {
      error = `Unrecognized status "${status}" (defaults to active)`;
    }

    return {
      _rowNum: index + 2, // +1 for 0-index, +1 for header row
      _error: error,
      sku,
      name,
      category,
      cost_price: costPrice,
      unit_price: unitPrice,
      quantity: isNaN(quantity as number) ? undefined : quantity,
      reorder_level: isNaN(reorderLevel as number) ? undefined : reorderLevel,
      status: status as BulkImportProductRow["status"] | undefined,
    };
  });
}

export function ImportProductsDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ImportProductsDialogProps) {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [branchId, setBranchId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const validRows = rows.filter((r) => !r._error);
  const invalidRows = rows.filter((r) => r._error);

  const resetState = () => {
    setBranchId("");
    setVendorId("");
    setFileName(null);
    setRows([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetState();
    onOpenChange(nextOpen);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setResult(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseWorkbook(buffer);
      if (parsed.length === 0) {
        toast.error("No rows found in that file");
        setRows([]);
      } else {
        setRows(parsed);
      }
    } catch (err) {
      console.error("Failed to parse file:", err);
      toast.error("Couldn't read that file. Make sure it's a valid .xlsx, .xls, or .csv export.");
      setRows([]);
      setFileName(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async () => {
    if (!token) return;
    if (!branchId) {
      toast.error("Select a branch to assign these products to");
      return;
    }
    if (!vendorId) {
      toast.error("Select a vendor for these products");
      return;
    }
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = validRows.map((r) => ({
        sku: r.sku,
        name: r.name,
        category: r.category,
        quantity: r.quantity,
        cost_price: r.cost_price,
        unit_price: r.unit_price,
        status: r.status,
        reorder_level: r.reorder_level,
      }));

      const importResult = await bulkImportProducts(token, {
        branchId,
        vendorId,
        products: payload,
      });

      setResult(importResult);

      if (importResult.failed === 0) {
        toast.success(`Imported all ${importResult.created} products successfully!`);
        onImportComplete?.();
      } else if (importResult.created > 0) {
        toast.warning(
          `Imported ${importResult.created} of ${importResult.total} products — ${importResult.failed} failed`
        );
        onImportComplete?.();
      } else {
        toast.error("No products were imported — see errors below");
      }
    } catch (err) {
      console.error("Bulk import failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to import products");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = !!branchId && !!vendorId && validRows.length > 0 && !isSubmitting && !isParsing;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Products</DialogTitle>
          <DialogDescription>
            Upload a spreadsheet with the same columns as the Export file (SKU, Name, Category,
            Quantity, Cost Price, Selling Price, Status, Reorder Level). Every product in the
            file will be created under the branch and vendor you choose below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Step 1: Branch + Vendor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Branch Assignment <span className="text-red-500">*</span>
              </Label>
              <BranchSelect value={branchId} onValueChange={setBranchId} disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label>
                Vendor <span className="text-red-500">*</span>
              </Label>
              <VendorSelect value={vendorId} onValueChange={setVendorId} disabled={isSubmitting} />
            </div>
          </div>

          {/* Step 2: File upload */}
          <div className="space-y-2">
            <Label>Spreadsheet File</Label>
            <label className="flex flex-col items-center justify-center gap-2 w-full h-28 border-2 border-dashed rounded-lg cursor-pointer hover:border-emerald-500 transition-colors">
              {isParsing ? (
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              ) : (
                <FileSpreadsheet className="h-6 w-6 text-gray-400" />
              )}
              <span className="text-sm text-gray-600">
                {fileName ? fileName : "Click to upload .xlsx, .xls, or .csv"}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
                disabled={isSubmitting}
              />
            </label>
          </div>

          {/* Preview */}
          {rows.length > 0 && !result && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  {validRows.length} ready to import
                </Badge>
                {invalidRows.length > 0 && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                    {invalidRows.length} will be skipped
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-56 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">Row</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead>Status / Issue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r._rowNum} className={r._error ? "bg-amber-50/60" : undefined}>
                        <TableCell className="text-xs text-gray-500">{r._rowNum}</TableCell>
                        <TableCell className="font-mono text-xs">{r.sku || "—"}</TableCell>
                        <TableCell className="text-sm">{r.name || "—"}</TableCell>
                        <TableCell className="text-sm">{r.category || "—"}</TableCell>
                        <TableCell className="text-right text-sm">{r.quantity ?? 0}</TableCell>
                        <TableCell className="text-right text-sm">
                          {isNaN(r.cost_price) ? "—" : r.cost_price}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {isNaN(r.unit_price) ? "—" : r.unit_price}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r._error ? (
                            <span className="text-amber-700">{r._error}</span>
                          ) : (
                            <span className="text-emerald-700">{r.status || "active"}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* Result summary */}
          {result && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  {result.created} created
                </Badge>
                {result.failed > 0 && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    {result.failed} failed
                  </Badge>
                )}
                <span className="text-gray-500">of {result.total} rows</span>
              </div>

              {result.errors.length > 0 && (
                <ScrollArea className="h-40 border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">Row</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((e, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs text-gray-500">{e.row}</TableCell>
                          <TableCell className="font-mono text-xs">{e.sku || "—"}</TableCell>
                          <TableCell className="text-xs text-red-700">{e.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={isSubmitting}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="mr-2 h-4 w-4" />
              Import {validRows.length > 0 ? `${validRows.length} Products` : "Products"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
