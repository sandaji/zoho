"use client";

import { useState, useEffect } from "react";
import { 
  Calendar, 
  ChevronRight, 
  Lock, 
  Unlock, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { FiscalPeriod } from "@/types/admin";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast";

export default function PeriodManagementPage() {
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [yearToInit, setYearToInit] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchPeriods(yearToInit);
  }, [yearToInit]);

  const fetchPeriods = async (year: number) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/finance/periods?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.status === "success") {
        setPeriods(data.data);
      } else {
        showErrorToast("Failed to fetch periods", { details: data.message || "An unknown error occurred."});
        setPeriods([]);
      }
    } catch (error) {
      console.error("Error fetching periods:", error);
       showErrorToast("Error", { details: "Could not connect to the server."});
    } finally {
      setLoading(false);
    }
  };
  
  const initializeYear = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/finance/periods/initialize`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ year: yearToInit })
      });
      const data = await res.json();
      if (data.status === "success") {
        showSuccessToast(`Fiscal Year ${yearToInit} initialized successfully!`);
        fetchPeriods(yearToInit);
      } else {
         showErrorToast("Initialization failed", { details: data.message || `Could not initialize fiscal year ${yearToInit}.`});
      }
    } catch (error) {
      console.error("Error initializing year:", error);
      showErrorToast("Error", { details: "Could not connect to the server to initialize year."});
    } finally {
      setLoading(false);
    }
  };

  const handleLockToggle = async (period: FiscalPeriod) => {
    const action = period.isLocked ? "unlock" : "lock";
    try {
      setLoadingAction(period.id);
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/finance/periods/${period.id}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (data.status === 'success') {
        showSuccessToast(`Period ${period.name} has been ${action}ed.`);
        // Refresh the list
        const updatedPeriods = periods.map(p => p.id === period.id ? { ...data.data } : p);
        setPeriods(updatedPeriods);
      } else {
        showErrorToast(`Failed to ${action} period`, { details: data.message || "An unknown error occurred."});
      }
    } catch (error) {
       showErrorToast("Error", { details: "Could not connect to the server."});
    } finally {
      setLoadingAction(null);
    }
  };
  
  const getStatusBadge = (status: 'open' | 'closed' | 'locked') => {
    switch(status) {
      case 'open': return <Badge className="bg-blue-50 text-blue-600 text-[10px] uppercase font-bold border-none px-2 py-0">Open</Badge>;
      case 'locked': return <Badge className="bg-amber-50 text-amber-600 text-[10px] uppercase font-bold border-none px-2 py-0">Locked</Badge>;
      case 'closed': return <Badge className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold border-none px-2 py-0">Closed</Badge>;
    }
  }


  return (
    <div className="p-6 space-y-8 bg-slate-50/30 min-h-screen text-slate-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Fiscal Periods</h1>
          <p className="text-slate-500">Manage accounting periods, open/close years, and maintain fiscal integrity.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-white" onClick={() => fetchPeriods(yearToInit)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Initialization Card */}
        <Card className="shadow-sm border-slate-100">
          <CardHeader>
            <CardTitle className="text-lg">Initialize Fiscal Year</CardTitle>
            <CardDescription>Start a new fiscal year with 12 monthly periods.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Select Year</label>
              <Input 
                type="number" 
                value={yearToInit} 
                onChange={(e) => setYearToInit(parseInt(e.target.value))}
                className="bg-slate-50 border-slate-100"
              />
            </div>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 h-10" 
              onClick={initializeYear}
              disabled={loading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate Year & Periods
            </Button>
            <div className="p-3 bg-amber-50 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Initializing a fiscal year will create 12 periods from January to December. 
                Ensure this matches your organization's accounting cycle.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Current Status Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-slate-100 overflow-hidden">
            <div className="h-1 bg-blue-600 w-full" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
              <div>
                <CardTitle className="text-xl">Fiscal Cycle: {yearToInit}</CardTitle>
                <CardDescription>{periods.length} Accounting Periods Managed</CardDescription>
              </div>
               {periods.length > 0 && <Badge className="bg-green-100 text-green-700 border-none font-bold px-3 py-1">
                Active Year
              </Badge>}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-50 animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg" />
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-slate-100 rounded" />
                          <div className="h-3 w-48 bg-slate-100 rounded" />
                        </div>
                      </div>
                      <div className="h-4 w-20 bg-slate-100 rounded" />
                    </div>
                  ))}
                  </div>
                ) : periods.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {periods.map((period, idx) => (
                      <div key={period.id} className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-lg border border-slate-100 flex items-center justify-center text-blue-600 font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-slate-700">{period.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {format(new Date(period.startDate), "MMM dd")} - {format(new Date(period.endDate), "MMM dd, yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(period.status)}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleLockToggle(period)}
                            disabled={loadingAction === period.id}
                            className="h-8 w-8"
                          >
                            {loadingAction === period.id ? (
                               <RefreshCw className="w-4 h-4 text-slate-500 animate-spin" />
                            ) : period.isLocked ? (
                              <Lock className="w-4 h-4 text-amber-500 hover:text-amber-700 transition-colors" />
                            ) : (
                              <Unlock className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                   <div className="text-center py-10">
                      <p className="text-slate-500">No fiscal periods found for {yearToInit}.</p>
                      <p className="text-sm text-slate-400">Try initializing the fiscal year.</p>
                    </div>
                )}
                
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Audit Status</p>
                <p className="text-lg font-bold text-slate-700">All Reconciled</p>
              </div>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
              <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Integrity Lock</p>
                <p className="text-lg font-bold text-slate-700">Internal Enabled</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
