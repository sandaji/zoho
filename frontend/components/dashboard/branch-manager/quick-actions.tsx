import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package, Truck, Users } from "lucide-react";

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Frequently used operations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-blue-50 hover:border-blue-200">
            <ShoppingCart className="h-6 w-6 text-blue-600" />
            <span>New Sale</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-orange-50 hover:border-orange-200">
            <Package className="h-6 w-6 text-orange-600" />
            <span>Inventory Check</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-green-50 hover:border-green-200">
            <Truck className="h-6 w-6 text-green-600" />
            <span>Receive Delivery</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-purple-50 hover:border-purple-200">
            <Users className="h-6 w-6 text-purple-600" />
            <span>Staff Schedule</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}