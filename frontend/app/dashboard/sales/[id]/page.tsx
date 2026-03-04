// c:/Projects/zoho/frontend/app/dashboard/sales/[id]/page.tsx
import { SalesDocumentBuilder } from "@/components/sales/SalesDocumentBuilder";
import { notFound } from "next/navigation";

type SalesDocumentType = "DRAFT" | "QUOTATION" | "INVOICE" | "CREDIT_NOTE";

interface SalesDocument {
  id: string;
  type: SalesDocumentType;
  body: {
    customerId?: string;
    issueDate: string; // Dates will be strings from JSON
    dueDate?: string;
    items: {
      productId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      total: number;
    }[];
    notes?: string;
    status?: string;
  };
  // other top-level fields for the document
  createdAt: string;
  updatedAt: string;
}

async function getDocument(id: string): Promise<SalesDocument | null> {
  // This is a mock fetch. Replace with your actual API call.
  // For example:
  // const res = await fetch(`http://localhost:5000/v1/sales-documents/${id}`);
  // if (!res.ok) return null;
  // return res.json();
  console.log(`Fetching document with id: ${id}`);
  return null; // Returning null to simulate not found for now
}

function getModeFromType(type: SalesDocumentType) {
  const modeMap = {
    DRAFT: "draft",
    QUOTATION: "quote",
    INVOICE: "invoice",
    CREDIT_NOTE: "credit_note",
  };
  return modeMap[type] as "draft" | "quote" | "invoice" | "credit_note";
}

export default async function EditSalesDocumentPage({ params }: { params: { id: string } }) {
  const document = await getDocument(params.id);

  if (!document) {
    return notFound();
  }

  const initialData = {
    ...document.body,
    issueDate: new Date(document.body.issueDate),
    dueDate: document.body.dueDate ? new Date(document.body.dueDate) : undefined,
    items: document.body.items.map((item) => ({
      ...item,
      productName: item.name,
      discount: 0,
    })),
  };

  return <SalesDocumentBuilder mode={getModeFromType(document.type)} initialData={initialData} />;
}
