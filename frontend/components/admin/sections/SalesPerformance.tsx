"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/utils";
import {
  fetchSalesPerformance,
  SalesPerformanceItem as ItemRow,
  SalesPerformanceDay as DayRow,
  SalesPerformanceSalesman as SalesmanRow,
  SalesPerformanceSummary,
} from "@/lib/admin-api";

export default function SalesPerformance({ branchId }: { branchId?: string }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [days, setDays] = useState<DayRow[]>([]);
  const [salesmen, setSalesmen] = useState<SalesmanRow[]>([]);
  const [summary, setSummary] = useState<SalesPerformanceSummary | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchSalesPerformance(token, { branchId, limit: 10 })
      .then((data) => {
        setItems(data.byItem);
        setDays(data.byDay);
        setSalesmen(data.bySalesman);
        setSummary(data.summary);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [token, branchId]);

  return (
    <div className="space-y-4">
      <style>{`@media print { .no-print { display: none !important } }`}</style>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold">Sales Performance</h2>
        <div className="no-print flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-1 rounded bg-emerald-600 text-white text-sm print:hidden"
          >
            Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-1 bg-white p-3 rounded shadow-sm">
          <h3 className="text-sm font-semibold mb-2">Key Summary</h3>
          {summary ? (
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Total Revenue</span>
                <span className="font-medium">{formatCurrency(summary.totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Tax</span>
                <span>{formatCurrency(summary.totalTax)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Orders</span>
                <span>{summary.totalOrders}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Order</span>
                <span>{formatCurrency(summary.avgOrderValue)}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-400">
              {loading ? "Loading…" : "No summary available"}
            </div>
          )}
        </div>

        <div className="col-span-1 lg:col-span-2 bg-white p-3 rounded shadow-sm">
          <h3 className="text-sm font-semibold mb-2">Revenue by Day</h3>
          {days.length === 0 ? (
            <div className="text-sm text-slate-400">{loading ? "Loading…" : "No data"}</div>
          ) : (
            <div className="space-y-2">
              <div className="w-full flex items-end gap-1 h-28">
                {days.map((d) => {
                  const max = Math.max(...days.map((x) => x.revenue));
                  const hPct = max > 0 ? (d.revenue / max) * 100 : 2;
                  return (
                    <div key={d.date} className="flex-1 text-center">
                      <div
                        title={formatCurrency(d.revenue)}
                        className="mx-0.5 bg-emerald-600"
                        style={{ height: `${Math.max(4, hPct)}%`, width: "100%" }}
                      ></div>
                      <div className="text-xs mt-1">{d.date.slice(5)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-3 rounded shadow-sm overflow-auto">
          <h3 className="text-sm font-semibold mb-2">Top Items</h3>
          <table className="w-full text-sm table-auto">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="pr-4">S.NO</th>
                <th>CODE</th>
                <th>DESCRIPTION</th>
                <th className="text-right">QTY</th>
                <th className="text-right">REVENUE</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.productId} className="border-t">
                  <td className="pr-4 py-2">{i + 1}</td>
                  <td className="py-2 font-mono">{it.sku}</td>
                  <td className="py-2 truncate">{it.name}</td>
                  <td className="py-2 text-right">{it.totalQty}</td>
                  <td className="py-2 text-right">{formatCurrency(it.totalRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-3 rounded shadow-sm overflow-auto">
          <h3 className="text-sm font-semibold mb-2">By Salesman</h3>
          <table className="w-full text-sm table-auto">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="pr-4">S.NO</th>
                <th>INITIALS</th>
                <th>NAME</th>
                <th className="text-right">ORDERS</th>
                <th className="text-right">REVENUE</th>
              </tr>
            </thead>
            <tbody>
              {salesmen.map((s, i) => (
                <tr key={s.userId} className="border-t">
                  <td className="pr-4 py-2">{i + 1}</td>
                  <td className="py-2 font-mono uppercase">
                    {s.salesPrefix ||
                      s.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                  </td>
                  <td className="py-2 truncate">{s.name}</td>
                  <td className="py-2 text-right">{s.orderCount}</td>
                  <td className="py-2 text-right">{formatCurrency(s.totalRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
