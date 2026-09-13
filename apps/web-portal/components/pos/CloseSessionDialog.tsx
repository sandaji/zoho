"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import clsx from "clsx";

interface Props {
  open: boolean;
  expectedCash: number;
  onSubmit: (actualCash: number, notes?: string) => Promise<void>;
  onClose: () => void;
}

interface FormValues {
  actualCash: string;
  notes?: string;
}

export function CloseSessionDialog({
  open,
  expectedCash,
  onSubmit,
  onClose,
}: Props) {
  const { register, handleSubmit, watch, reset } = useForm<FormValues>();
  const [loading, setLoading] = useState(false);

  const actualCash = parseFloat(watch("actualCash") || "0");
  const difference = actualCash - expectedCash;

  const submit = async (data: FormValues) => {
    setLoading(true);
    try {
      await onSubmit(parseFloat(data.actualCash), data.notes);
      reset();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />

        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2">
          <Card className="p-6 space-y-6 shadow-2xl border border-border">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-xl font-semibold">
                Close Cashier Session
              </Dialog.Title>

              <Dialog.Close asChild>
                <button className="p-2 rounded hover:bg-muted transition">
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Expected Cash */}
            <div className="bg-muted/40 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                Expected Cash
              </p>
              <p className="text-3xl font-bold tracking-tight">
                KES {expectedCash.toFixed(2)}
              </p>
            </div>

            <form
              onSubmit={handleSubmit(submit)}
              className="space-y-4"
            >
              {/* Actual Cash */}
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Actual Cash Counted
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Enter counted cash"
                  {...register("actualCash", { required: true })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Difference Display */}
              {actualCash > 0 && (
                <div
                  className={clsx(
                    "rounded-md p-3 text-sm font-medium",
                    difference === 0 && "bg-green-500/10 text-green-600",
                    difference > 0 && "bg-blue-500/10 text-blue-600",
                    difference < 0 && "bg-red-500/10 text-red-600"
                  )}
                >
                  {difference === 0 && "Balanced ✔ No difference"}
                  {difference > 0 &&
                    `Over by KES ${difference.toFixed(2)}`}
                  {difference < 0 &&
                    `Short by KES ${Math.abs(difference).toFixed(2)}`}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Add any explanation if there is a variance"
                  {...register("notes")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? "Closing..." : "Close Session"}
                </Button>
              </div>
            </form>
          </Card>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
