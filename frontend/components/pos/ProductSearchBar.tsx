import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
}

export function ProductSearchBar({ value, onChange, onAdd }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="SKU, barcode, name, description…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
        />
        <Button onClick={onAdd} disabled={!value.trim()}>
          Add
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: Scan barcode or type product name
      </p>
    </div>
  );
}
