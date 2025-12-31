import { Table, TableHeader, TableRow, TableHead, TableBody } from "@/components/ui/table";
import { CartItemRow } from "./CartItemRow";
import { ShoppingCart } from "lucide-react";

export function CartTable({ cart, onQty, onRemove }: any) {
  if (!cart.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ShoppingCart className="h-12 w-12 text-slate-300 mb-3" />
        <p className="text-lg font-medium text-slate-700">Cart is Empty</p>
        <p className="text-sm text-slate-500 mt-1">Scan a barcode or search to add items to cart</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Subtotal</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {cart.map((item: any) => (
            <CartItemRow
              key={item.productId}
              item={item}
              onQtyChange={(q) => onQty(item.productId, q)}
              onRemove={() => onRemove(item.productId)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
