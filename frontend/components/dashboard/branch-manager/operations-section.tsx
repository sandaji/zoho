import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Clock, Users } from "lucide-react";
import { PendingOrder, StaffPerformance } from "@/lib/dashboard.service";

interface OperationsProps {
  pendingOrders: PendingOrder[];
  staffPerformance: StaffPerformance[];
  loading: boolean;
}

export function OperationsSection({ pendingOrders, staffPerformance, loading }: OperationsProps) {
  if (loading) return <div className="h-64 bg-muted animate-pulse rounded-lg" />;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Pending Orders */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Pending Orders
          </CardTitle>
          <CardDescription>Orders awaiting processing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingOrders.length > 0 ? (
            pendingOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div>
                  <div className="font-medium">{order.id}</div>
                  <div className="text-sm text-muted-foreground">{order.customer}</div>
                  <div className="text-xs text-muted-foreground/80">
                    {order.items} items • {order.timeElapsed} min ago
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    KES {(order.amount ?? 0).toLocaleString()}
                  </div>
                  <Badge
                    variant={order.status === "ready" ? "default" : "secondary"}
                    className="mt-1"
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">No pending orders</div>
          )}
        </CardContent>
      </Card>

      {/* Staff Performance */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Staff Performance
          </CardTitle>
          <CardDescription>Top performing staff members</CardDescription>
        </CardHeader>
        <CardContent>
          {staffPerformance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Conversion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffPerformance.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium">{staff.name}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{staff.role}</span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      KES {(staff.sales ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20">
                          <Progress
                            value={(staff.conversionRate ?? 0) * 100}
                            className="h-2"
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {((staff.conversionRate ?? 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No staff performance data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}