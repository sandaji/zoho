import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Package, AlertCircle } from "lucide-react";
import { TopProduct, LowStockItem } from "@/lib/dashboard.service";

export function InventoryTables({ topProducts, lowStockItems, loading }: { topProducts: TopProduct[], lowStockItems: LowStockItem[], loading: boolean }) {
  if (loading) return <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Top Products Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Best performing products</CardDescription>
          </div>
          <Badge variant="outline"><Package className="h-3 w-3 mr-1" /> {topProducts.length}</Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right">KES {p.revenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Progress value={p.stockLevel} className="w-16 h-2" />
                      <span className="text-xs">{p.stockLevel}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Low Stock Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Low Stock Alert</CardTitle>
            <CardDescription>Items requiring attention</CardDescription>
          </div>
          <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Critical</Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStockItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.currentStock}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "critical" ? "destructive" : "secondary"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}