'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { CashierSession } from '@/hooks/cashier/useCashierSession';

export interface SessionOpenDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;

  /**
   * Callback when dialog should close
   */
  onOpenChange: (open: boolean) => void;

  /**
   * Callback to execute when opening session
   * Should handle API call and return the created session
   */
  onOpenSession: (
    openingBalance: number,
    notes?: string
  ) => Promise<CashierSession>;

  /**
   * Whether operation is loading
   */
  isLoading?: boolean;

  /**
   * Error message to display
   */
  error?: string | null;
}

/**
 * Dialog component for opening a new cashier session
 *
 * Features:
 * - Input validation for opening balance
 * - Optional notes field
 * - Loading state
 * - Error display
 * - Automatic dialog close on success
 *
 * @component
 */
export function SessionOpenDialog({
  isOpen,
  onOpenChange,
  onOpenSession,
  isLoading = false,
  error = null,
}: SessionOpenDialogProps) {
  const [openingBalance, setOpeningBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  /**
   * Validate and submit form
   */
  const handleSubmit = async () => {
    try {
      setLocalError(null);

      // Validate opening balance
      const balance = parseFloat(openingBalance);

      if (!openingBalance || isNaN(balance)) {
        setLocalError('Opening balance is required');
        return;
      }

      if (balance < 0) {
        setLocalError('Opening balance cannot be negative');
        return;
      }

      if (balance > 1000000) {
        setLocalError('Opening balance cannot exceed 1,000,000 KES');
        return;
      }

      // Call the open session callback
      await onOpenSession(balance, notes || undefined);

      // Reset form and close dialog
      setOpeningBalance('');
      setNotes('');
      onOpenChange(false);
    } catch (err) {
      // Error already handled by hook
      console.error('Failed to open session:', err);
    }
  };

  /**
   * Close dialog and reset form
   */
  const handleClose = () => {
    setOpeningBalance('');
    setNotes('');
    setLocalError(null);
    onOpenChange(false);
  };

  const displayError = localError || error;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Open Cashier Session</DialogTitle>
          <DialogDescription>
            Enter your opening balance to start a new cashier session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error Alert */}
          {displayError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}

          {/* Opening Balance Input */}
          <div className="space-y-2">
            <Label htmlFor="opening-balance">Opening Balance (KES)</Label>
            <Input
              id="opening-balance"
              type="number"
              placeholder="0.00"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              disabled={isLoading}
              min="0"
              max="1000000"
              step="0.01"
              className="text-lg"
            />
            <p className="text-sm text-gray-500">
              Enter the amount of cash you are starting with
            </p>
          </div>

          {/* Notes Input */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Starting with petty cash, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Opening...' : 'Open Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
