"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_ENDPOINTS, getAuthHeaders, getApiUrl } from "@/lib/api-config";
import { Loader2, ArrowLeftRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface BankLine {
  id: string;
  date: string;
  description: string;
  amount: number;
}

interface JournalEntry {
  id: string;
  entry_date: string;
  description: string;
  debit: number;
  credit: number;
}

export default function ReconciliationMatchingPage() {
  const params = useParams();
  const accountId = params.accountId as string;

  const [loading, setLoading] = useState(true);
  const [bankLines, setBankLines] = useState<BankLine[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<JournalEntry[]>([]);
  
  const [selectedBankLine, setSelectedBankLine] = useState<string | null>(null);
  const [selectedLedgerEntry, setSelectedLedgerEntry] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    if (accountId) fetchData();
  }, [accountId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(getApiUrl(API_ENDPOINTS.BANK_RECONCILIATION_DATA(accountId)), {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      setBankLines(json.data.bankLines);
      setLedgerEntries(json.data.ledgerEntries);
    } catch (error) {
      toast.error("Error loading reconciliation data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMatch = async () => {
      if (!selectedBankLine || !selectedLedgerEntry) return;

      try {
          setReconciling(true);
          const res = await fetch(getApiUrl(API_ENDPOINTS.BANK_RECONCILE_ITEM(selectedBankLine)), {
              method: "POST",
              headers: {
                  ...getAuthHeaders(),
                  "Content-Type": "application/json"
              },
              body: JSON.stringify({
                  bankLineId: selectedBankLine,
                  journalEntryId: selectedLedgerEntry
              })
          });
          
          if (!res.ok) throw new Error("Match failed (Amount Mismatch?)");
          
          toast.success("Transaction Matched!");
          
          // Remove from local state
          setBankLines(prev => prev.filter(l => l.id !== selectedBankLine));
          setLedgerEntries(prev => prev.filter(e => e.id !== selectedLedgerEntry));
          
          setSelectedBankLine(null);
          setSelectedLedgerEntry(null);
          
      } catch (error) {
          toast.error("Match Failed. Ensure amounts match exactly.");
      } finally {
          setReconciling(false);
      }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount);
  };

  // Helper to calculate Net Amount for Ledger Entry (Debit - Credit for Asset)
  // Assuming Asset Account: Debit is Increase (+), Credit is Decrease (-)
  const getLedgerAmount = (entry: JournalEntry) => entry.debit - entry.credit;

  return (
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reconcile Transactions</h1>
          <p className="text-muted-foreground">Match bank statement lines with system records</p>
        </div>
        <div className="flex gap-2 items-center">
            <div className="text-sm font-medium mr-4">
                Selected: {selectedBankLine ? 1 : 0} Bank | {selectedLedgerEntry ? 1 : 0} Ledger
            </div>
            <Button 
                onClick={handleMatch} 
                disabled={!selectedBankLine || !selectedLedgerEntry || reconciling}
            >
                {reconciling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowLeftRight className="mr-2 h-4 w-4" />}
                Match
            </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
            {/* Bank Statement Side */}
            <Card className="flex flex-col overflow-hidden border-blue-200">
                <CardHeader className="bg-blue-50 py-3">
                    <CardTitle className="text-lg text-blue-800">Bank Statement Lines</CardTitle>
                </CardHeader>
                <div className="flex-1 overflow-y-auto p-0">
                    {bankLines.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">All caught up! No unreconciled lines.</div>
                    ) : (
                        <div className="divide-y">
                            {bankLines.map(line => (
                                <div 
                                    key={line.id} 
                                    className={cn(
                                        "p-3 cursor-pointer hover:bg-blue-50 transition-colors flex justify-between items-center",
                                        selectedBankLine === line.id && "bg-blue-100 border-l-4 border-blue-500"
                                    )}
                                    onClick={() => setSelectedBankLine(line.id === selectedBankLine ? null : line.id)}
                                >
                                    <div className="flex-1">
                                        <div className="font-medium text-sm">{format(new Date(line.date), "MMM d, yyyy")}</div>
                                        <div className="text-xs text-muted-foreground">{line.description}</div>
                                    </div>
                                    <div className="font-bold">
                                        {formatCurrency(line.amount)}
                                    </div>
                                    {selectedBankLine === line.id && <CheckCircle2 className="h-4 w-4 text-blue-600 ml-2" />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>

            {/* System Ledger Side */}
            <Card className="flex flex-col overflow-hidden border-green-200">
                <CardHeader className="bg-green-50 py-3">
                    <CardTitle className="text-lg text-green-800">System Records (Ledger)</CardTitle>
                </CardHeader>
                <div className="flex-1 overflow-y-auto p-0">
                    {ledgerEntries.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">No unreconciled system entries found.</div>
                    ) : (
                        <div className="divide-y">
                             {ledgerEntries.map(entry => {
                                 const amount = getLedgerAmount(entry);
                                 return (
                                    <div 
                                        key={entry.id} 
                                        className={cn(
                                            "p-3 cursor-pointer hover:bg-green-50 transition-colors flex justify-between items-center",
                                            selectedLedgerEntry === entry.id && "bg-green-100 border-l-4 border-green-500"
                                        )}
                                        onClick={() => setSelectedLedgerEntry(entry.id === selectedLedgerEntry ? null : entry.id)}
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{format(new Date(entry.entry_date), "MMM d, yyyy")}</div>
                                            <div className="text-xs text-muted-foreground">{entry.description}</div>
                                        </div>
                                        <div className="font-bold">
                                            {formatCurrency(amount)}
                                        </div>
                                        {selectedLedgerEntry === entry.id && <CheckCircle2 className="h-4 w-4 text-green-600 ml-2" />}
                                    </div>
                                 );
                             })}
                        </div>
                    )}
                </div>
            </Card>
        </div>
      )}
    </div>
  );
}
