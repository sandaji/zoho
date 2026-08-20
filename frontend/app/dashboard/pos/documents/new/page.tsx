
//frontend/src/app/dashboard/pos/documents/new/page.tsx
//
// Document creation (Draft / Quote / Invoice) now lives in the POS screen's
// "New Document" menu (see components/pos/POSMenuBar.tsx), which shares the
// same product search, customer picker, and real /v1/sales-documents/documents
// endpoint as the rest of POS. This route is kept only so old links/bookmarks
// still land somewhere useful.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewDocumentPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/pos");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
    </div>
  );
}
