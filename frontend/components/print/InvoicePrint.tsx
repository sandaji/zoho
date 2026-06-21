"use client";

import React from "react";

export type InvoiceLine = {
  id?: string;
  sku?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type InvoiceDocument = {
  documentId: string;
  type: "INVOICE" | "QUOTE" | string;
  issueDate?: string;
  customerName?: string;
  preparedBy?: string; // sales prefix
  items: InvoiceLine[];
  subtotal: number;
  tax: number;
  total: number;
};

export default function InvoicePrint({ doc }: { doc: InvoiceDocument }) {
  return (
    <div className="max-w-3xl mx-auto bg-white p-6 print:p-0 print:mx-0">
      <style>{`@media print { .no-print{ display:none !important } .page-break{ page-break-after: always } body { background: #fff; } }
        table { border-collapse: collapse }
      `}</style>

      <header className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold uppercase">
            {doc.type === "INVOICE" ? "SALES INVOICE" : "QUOTATION"}
          </h2>
          <div className="text-sm text-slate-600">{doc.documentId}</div>
        </div>
        <div className="text-right">
          <div className="text-sm">
            Date: {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : "-"}
          </div>
          <div className="text-sm">Prepared By: {doc.preparedBy || "-"}</div>
        </div>
      </header>

      <section className="mb-4">
        <div className="text-sm text-slate-700">Bill To:</div>
        <div className="font-semibold text-base">{doc.customerName || "Walk-in Customer"}</div>
      </section>

      <section className="mb-6 overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-slate-100">
              <th className="p-2 text-left w-12">S.NO</th>
              <th className="p-2 text-left w-28">CODE</th>
              <th className="p-2 text-left">DESCRIPTION</th>
              <th className="p-2 text-right w-20">QUANTITY</th>
              <th className="p-2 text-right w-28">PRICE</th>
              <th className="p-2 text-right w-28">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((it, idx) => (
              <tr key={it.id || idx} className="border-t">
                <td className="p-2">{idx + 1}</td>
                <td className="p-2 font-mono">{it.sku || "-"}</td>
                <td className="p-2">{it.description}</td>
                <td className="p-2 text-right">{it.quantity}</td>
                <td className="p-2 text-right">KES {it.unitPrice.toLocaleString()}</td>
                <td className="p-2 text-right">KES {it.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col items-end gap-1 mb-8">
        <div className="flex justify-between w-64">
          <span className="text-sm text-slate-600">Subtotal:</span>
          <span className="font-medium">KES {doc.subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between w-64">
          <span className="text-sm text-slate-600">VAT (16%):</span>
          <span className="font-medium">KES {doc.tax.toLocaleString()}</span>
        </div>
        <div className="flex justify-between w-64 text-lg font-bold pt-2">
          <span>Grand Total:</span>
          <span>KES {doc.total.toLocaleString()}</span>
        </div>
      </section>

      <footer className="mt-12 grid grid-cols-2 gap-6">
        <div className="text-sm">
          <div className="font-semibold">PREPARED BY {doc.preparedBy || "---"}</div>
          <div className="mt-8 h-16 border-b"></div>
          <div className="text-xs text-slate-500 mt-2">Signature</div>
        </div>
        <div className="text-sm">
          <div className="font-semibold">RECEIVED BY</div>
          <div className="mt-8 h-16 border-b"></div>
          <div className="text-xs text-slate-500 mt-2">Signature</div>
        </div>
      </footer>
    </div>
  );
}
