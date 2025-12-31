
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { API_ENDPOINTS, getApiUrl, getAuthHeaders } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface PendingRequest {
  id: string;
  user: { name: string; email: string };
  leaveType: { name: string };
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
}

export function PendingApprovals({ pending, onProcessed }: { pending: PendingRequest[], onProcessed: () => void }) {
  const { showToast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAction = async (id: string, status: "APPROVED" | "REJECTED") => {
    setProcessingId(id);
    try {
      const res = await fetch(getApiUrl(API_ENDPOINTS.LEAVE_UPDATE_STATUS(id)), {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("Failed to process request");

      showToast("Success", `Request ${status.toLowerCase()} successfully`, "success");
      onProcessed();
    } catch (error) {
      showToast("Error", "Failed to process leave request", "error");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="grid gap-4">
      {pending.map((request) => (
        <Card key={request.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">{request.user.name}</CardTitle>
              <CardDescription>{request.user.email}</CardDescription>
            </div>
            <Badge variant="secondary">{request.leaveType.name}</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Duration: {request.days} days
                </p>
                {request.reason && (
                  <p className="mt-2 text-sm italic text-muted-foreground">
                    "{request.reason}"
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  disabled={!!processingId}
                  onClick={() => handleAction(request.id, "REJECTED")}
                >
                  <X className="mr-2 h-4 w-4" /> Reject
                </Button>
                <Button 
                  size="sm"
                  disabled={!!processingId}
                  onClick={() => handleAction(request.id, "APPROVED")}
                >
                  <Check className="mr-2 h-4 w-4" /> Approve
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {pending.length === 0 && (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-muted-foreground">
          No pending leave requests.
        </div>
      )}
    </div>
  );
}
