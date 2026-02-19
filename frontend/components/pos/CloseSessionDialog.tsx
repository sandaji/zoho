"use client";

import { useForm } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  expectedCash: number;
  onSubmit: (actualCash: number, notes?: string) => Promise<void>;
  onClose: () => void;
}

export function CloseSessionDialog({
  expectedCash,
  onSubmit,
  onClose,
}: Props) {
  const { register, handleSubmit } = useForm();

  const submit = async (data: any) => {
    const actualCash = parseFloat(data.actualCash);
    await onSubmit(actualCash, data.notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold">
          Close Cashier Session
        </h2>

        <div>
          <p className="text-sm text-muted-foreground">
            Expected Cash
          </p>
          <p className="text-2xl font-bold">
            KES {expectedCash.toFixed(2)}
          </p>
        </div>

        <form
          onSubmit={handleSubmit(submit)}
          className="space-y-3"
        >
          <input
            type="number"
            step="0.01"
            placeholder="Actual Cash"
            {...register("actualCash", { required: true })}
            className="w-full border rounded px-3 py-2"
          />

          <textarea
            placeholder="Notes (optional)"
            {...register("notes")}
            className="w-full border rounded px-3 py-2"
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>

            <Button type="submit" className="flex-1">
              Close Session
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
