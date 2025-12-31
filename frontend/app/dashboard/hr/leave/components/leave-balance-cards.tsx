
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, CheckCircle2, Clock } from "lucide-react";

interface LeaveBalance {
  leaveType: {
    id: string;
    name: string;
  };
  allocated: number;
  used: number;
  available: number;
}

export function LeaveBalanceCards({ balance, isLoading }: { balance: LeaveBalance[], isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[120px] w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {balance.map((item) => (
        <Card key={item.leaveType.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {item.leaveType.name}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.available} Days</div>
            <p className="text-xs text-muted-foreground">
              {item.used} used of {item.allocated} allocated for this year
            </p>
            <div className="mt-4 h-2 w-full rounded-full bg-secondary">
              <div 
                className="h-2 rounded-full bg-primary" 
                style={{ width: `${Math.min((item.used / (item.allocated || 1)) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      ))}
      {balance.length === 0 && (
        <Card className="col-span-full">
          <CardContent className="flex h-[100px] items-center justify-center text-muted-foreground">
            No leave allocations found for current year.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
