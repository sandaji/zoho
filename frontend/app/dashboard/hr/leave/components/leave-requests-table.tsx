
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaveRequest {
  id: string;
  leaveType: { name: string };
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  reason: string;
  createdAt: string;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Pending", variant: "secondary" },
  APPROVED: { label: "Approved", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
};

export function LeaveRequestsTable({ requests, isLoading }: { requests: LeaveRequest[], isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Requested On</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">{request.leaveType.name}</TableCell>
              <TableCell>
                {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
              </TableCell>
              <TableCell>{request.days}</TableCell>
              <TableCell className="max-w-[200px] truncate">{request.reason || "-"}</TableCell>
              <TableCell>
                <Badge variant={statusMap[request.status]?.variant || "secondary"}>
                  {statusMap[request.status]?.label || request.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {new Date(request.createdAt).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
          {requests.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No leave history found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
