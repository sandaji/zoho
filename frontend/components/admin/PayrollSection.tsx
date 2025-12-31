"use client";

import { useEffect, useState } from "react";
import { AdminTable, Column } from "./AdminTable";
import { Payroll, fetchPayroll } from "@/lib/admin-api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { Button } from "../ui/button";
import { PayrollStatus } from "@/lib/types";

const statusVariant = (status: string) => {
    switch (status) {
      case "paid": return "default";
      case "approved": return "default";
      case "reversed": return "destructive";
      default: return "secondary";
    }
  };
  
  export default function PayrollSection() {
    const { token } = useAuth();
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Payroll | null>(null);
  
    useEffect(() => {
      if (token) {
        fetchPayroll(token)
          .then(setPayrolls)
          .catch(console.error)
          .finally(() => setLoading(false));
      }
    }, [token]);
  
    const columns: Column<Payroll>[] = [
      { key: "payroll_no", label: "Payroll #" },
      {
        key: "user.name",
        label: "Employee",
        render: (userName) => userName || "-",
      },
      {
        key: "createdAt",
        label: "Created At",
        render: (date) => new Date(date).toLocaleDateString(),
      },
      {
        key: "net_salary",
        label: "Net Salary",
        render: (salary) => `KES ${salary.toLocaleString()}`,
      },
      {
        key: "status",
        label: "Status",
        render: (status: PayrollStatus) => (
          <Badge variant={statusVariant(status)}>
            {status.toUpperCase()}
          </Badge>
        ),
      },
    ];
  
    return (
      <>
        <AdminTable
          title="Payroll Records"
          data={payrolls}
          columns={columns}
          loading={loading}
          searchKeys={["payroll_no", "user.name", "status"]}
          actions={(payroll) => (
              <Button variant="outline" size="sm" onClick={() => setSelected(payroll)}>
                  View Details
              </Button>
          )}
        />
  
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Payroll Details</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Payroll #</p>
                    <p className="text-sm font-semibold">{selected.payroll_no}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge variant={statusVariant(selected.status)}>
                      {selected.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Employee</p>
                    <p className="text-sm font-semibold">{selected.user?.name || "-"}</p>
                    <p className="text-xs text-muted-foreground">{selected.user?.email || "-"}</p>
                  </div>
                </div>
  
                <Separator />
  
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Net Salary:</span>
                    <span className="font-medium">KES {selected.net_salary.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }
