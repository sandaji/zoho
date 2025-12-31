
"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API_ENDPOINTS, getApiUrl, getAuthHeaders } from "@/lib/api-config";
import { LeaveBalanceCards } from "./components/leave-balance-cards";
import { LeaveRequestsTable } from "./components/leave-requests-table";
import { PendingApprovals } from "./components/pending-approvals";
import { RequestLeaveDialog } from "./components/request-leave-dialog";
import { useToast } from "@/hooks/use-toast";

export default function LeaveDashboard() {
  const [balance, setBalance] = useState([]);
  const [requests, setRequests] = useState([]);
  const [pending, setPending] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [balanceRes, requestsRes] = await Promise.all([
        fetch(getApiUrl(API_ENDPOINTS.LEAVE_BALANCE), { headers: getAuthHeaders() }),
        fetch(getApiUrl(API_ENDPOINTS.LEAVE_MY_REQUESTS), { headers: getAuthHeaders() })
      ]);

      const balanceData = await balanceRes.json();
      const requestsData = await requestsRes.json();

      if (balanceData.success) setBalance(balanceData.data);
      if (requestsData.success) setRequests(requestsData.data);

      // Optionally fetch pending if user has manager role
      const pendingRes = await fetch(getApiUrl(API_ENDPOINTS.LEAVE_PENDING), { headers: getAuthHeaders() });
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        if (pendingData.success) setPending(pendingData.data);
      }
    } catch (error) {
      showToast("Error", "Failed to fetch leave data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Leave Management</h2>
        <div className="flex items-center space-x-2">
          <RequestLeaveDialog onProcessed={fetchData} />
        </div>
      </div>

      <LeaveBalanceCards balance={balance} isLoading={isLoading} />

      <Tabs defaultValue="my-leave" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-leave">My Leave History</TabsTrigger>
          {pending.length > 0 && (
            <TabsTrigger value="approvals">
              Pending Approvals 
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {pending.length}
              </span>
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="my-leave" className="space-y-4">
          <LeaveRequestsTable requests={requests} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="approvals" className="space-y-4">
          <PendingApprovals pending={pending} onProcessed={fetchData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
