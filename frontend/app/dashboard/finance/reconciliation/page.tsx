"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_ENDPOINTS, getAuthHeaders, getApiUrl } from "@/lib/api-config";
import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface BankAccount {
  id: string;
  account_name: string;
  account_code: string;
  current_balance: number;
}

export default function ReconciliationDashboard() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch(getApiUrl(API_ENDPOINTS.BANK_ACCOUNTS), {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const json = await res.json();
      setAccounts(json.data);
    } catch (error) {
      toast.error("Error loading bank accounts");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedAccountId) return;

    try {
      setUploading(true);
      const content = await file.text();
      
      const res = await fetch(getApiUrl(API_ENDPOINTS.BANK_UPLOAD), {
        method: "POST",
        headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            accountId: selectedAccountId,
            fileContent: content,
            filename: file.name
        })
      });

      if (!res.ok) throw new Error("Upload failed");
      
      toast.success("Statement uploaded successfully");
      router.push(`/dashboard/finance/reconciliation/${selectedAccountId}`);
    } catch (error) {
      toast.error("Failed to upload statement");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bank Reconciliation</h1>
        <p className="text-muted-foreground">
          Upload bank statements and match transactions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Statement</CardTitle>
            <CardDescription>Import CSV from your bank (Format: Date, Description, Amount)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Select Account</label>
                <Select onValueChange={setSelectedAccountId} value={selectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Bank Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_name} ({acc.account_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                 <label className="text-sm font-medium">CSV File</label>
                 <Input 
                    type="file" 
                    accept=".csv"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                 />
            </div>

            <Button 
                className="w-full" 
                onClick={handleUpload} 
                disabled={uploading || !file || !selectedAccountId}
            >
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload & Reconcile
            </Button>
          </CardContent>
        </Card>

        <Card>
           <CardHeader>
               <CardTitle>Recent Activity</CardTitle>
           </CardHeader>
           <CardContent>
               <div className="text-sm text-muted-foreground text-center py-8">
                   No recent reconciliations found.
               </div>
           </CardContent>
        </Card>
      </div>
      
      {/* Existing Accounts List */}
      <h2 className="text-xl font-semibold mt-8">Accounts</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading ? (
             <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            accounts.map(acc => (
                <Card key={acc.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => router.push(`/dashboard/finance/reconciliation/${acc.id}`)}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{acc.account_name}</CardTitle>
                        <CardDescription>{acc.account_code}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(acc.current_balance)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Current Book Balance</div>
                    </CardContent>
                </Card>
            ))
          )}
      </div>
    </div>
  );
}
