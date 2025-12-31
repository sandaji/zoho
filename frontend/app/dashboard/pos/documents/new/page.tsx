"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { SalesDocumentBuilder } from "@/components/sales/SalesDocumentBuilder";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NewDocumentPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [mode, setMode] = useState<"draft" | "quote" | "invoice" | "credit_note">("draft");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.back()}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                New {mode === "credit_note" ? "Credit Note" : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </h1>
              <p className="text-sm text-slate-600">
                Create a new sales document
              </p>
            </div>
          </div>
          
          {/* Mode Selector */}
          <div className="flex gap-2">
            {(["draft", "quote", "invoice"] as const).map((m) => (
              <Button
                key={m}
                variant={mode === m ? "default" : "outline"}
                size="sm"
                onClick={() => setMode(m)}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Document Builder */}
        <SalesDocumentBuilder mode={mode} />
      </div>
    </div>
  );
}
