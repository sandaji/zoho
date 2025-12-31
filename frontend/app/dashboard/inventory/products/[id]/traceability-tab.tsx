"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { API_ENDPOINTS } from "@/lib/api-config";
import { useAuth } from "@/lib/auth-context";
import { Loader2, ArrowUpRight, ArrowDownLeft, RefreshCw } from "lucide-react";

interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  reference: string;
  createdAt: string;
  warehouse: {
    name: string;
    code: string;
  };
  createdById: string; // Could expand to user name if backend sends it
}

export function TraceabilityTab({ productId }: { productId: string }) {
  const { token } = useAuth();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productId && token) {
      fetchMovements();
    }
  }, [productId, token]);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const url = `${API_ENDPOINTS.STOCK_MOVEMENTS}?productId=${productId}&limit=20`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch stock movements");
      }

      const data = await response.json();
      setMovements(data.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load traceability data");
    } finally {
      setLoading(false);
    }
  };

  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case "INBOUND":
      case "PURCHASE_IN":
      case "TRANSFER_IN":
      case "RETURN_IN":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><ArrowDownLeft className="w-3 h-3 mr-1" /> Inbound</Badge>;
      case "OUTBOUND":
      case "SALE":
      case "TRANSFER_OUT":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><ArrowUpRight className="w-3 h-3 mr-1" /> Outbound</Badge>;
      case "ADJUSTMENT":
        return <Badge variant="outline"><RefreshCw className="w-3 h-3 mr-1" /> Adjustment</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Movement History</CardTitle>
      </CardHeader>
      <CardContent>
        {movements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No movements recorded.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>{new Date(movement.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                        {getMovementTypeBadge(movement.type)}
                        <span className="text-xs text-muted-foreground">{movement.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>{movement.reference || "-"}</TableCell>
                  <TableCell>{movement.warehouse?.name || "Unknown"}</TableCell>
                  <TableCell className={`text-right font-medium ${
                    ["OUTBOUND", "SALE", "TRANSFER_OUT"].includes(movement.type) ? "text-red-600" : "text-green-600"
                  }`}>
                    {["OUTBOUND", "SALE", "TRANSFER_OUT"].includes(movement.type) ? "-" : "+"}{movement.quantity}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
