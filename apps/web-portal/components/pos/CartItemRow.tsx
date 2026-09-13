import { TableRow, TableCell } from "@/components/ui/table";
import { AlertCircle, Trash2 } from "lucide-react";

interface Props {
  item: any;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
}

export function CartItemRow({ item, onQtyChange, onRemove }: Props) {
  // Determine stock status
  const isLowStock = item.quantity >= item.available * 0.8;
  // const isAtCapacity = item.quantity >= item.available;
  const canIncrement = item.quantity < item.available;

  const handleQuantityInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") return;

    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0) {
      onQtyChange(num);
    }
  };

  return (
    <TableRow className={isLowStock ? "bg-amber-50" : ""}>
      <TableCell className="font-mono text-xs">{item.sku}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span>{item.name}</span>
          {isLowStock && <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />}
        </div>
      </TableCell>
      <TableCell>ksh {item.unit_price.toFixed(2)}</TableCell>

      <TableCell>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onQtyChange(item.quantity - 1)}
            disabled={item.quantity <= 1}
            className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Decrease quantity"
          >
            −
          </button>
          <input
            type="number"
            min="1"
            max={item.available}
            value={item.quantity}
            onChange={handleQuantityInput}
            className="w-12 text-center border rounded px-1 py-1 text-sm font-medium"
          />
          <button
            type="button"
            onClick={() => onQtyChange(item.quantity + 1)}
            disabled={!canIncrement}
            className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={!canIncrement ? "Max stock reached" : "Increase quantity"}
          >
            +
          </button>
          <span className="text-xs text-slate-500 ml-1">/ {item.available}</span>
        </div>
      </TableCell>

      <TableCell className="font-semibold">
        ksh {(item.unit_price * item.quantity).toFixed(2)}
      </TableCell>

      <TableCell>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Remove item"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </TableCell>
    </TableRow>
  );
}
