// frontend/components/sales/PrintableDocument.tsx
import React from 'react';

// Define types for props - replace with actual types from your project
type DocumentItem = {
  quantity: number;
  description: string;
  unitPrice: number;
  total: number;
};

type PrintableDocumentProps = {
  document: {
    documentId: string;
    type: string;
    customer?: { name: string; email?: string };
    items: DocumentItem[];
    subtotal: number;
    tax: number;
    total: number;
    notes?: string;
  };
};

export const PrintableDocument: React.FC<PrintableDocumentProps> = ({ document }) => {
  const company = {
    name: 'Zoho Inc.',
    address: '123 Business Rd, Suite 100, Business City',
    phone: '123-456-7890',
  };

  return (
    <div className="printable-document">
      <header className="text-center">
        <h1 className="text-2xl font-bold">{company.name}</h1>
        <p>{company.address}</p>
        <p>{company.phone}</p>
        <hr className="my-2" />
        <h2 className="text-xl font-bold">{document.type.replace('_', ' ')}</h2>
        <p>ID: {document.documentId}</p>
      </header>

      <section className="my-4">
        <h3 className="font-bold">Customer:</h3>
        <p>{document.customer?.name || 'N/A'}</p>
        <p>{document.customer?.email || ''}</p>
      </section>

      <section>
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">Item</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Price</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {document.items.map((item, index) => (
              <tr key={index}>
                <td>{item.description}</td>
                <td className="text-right">{item.quantity}</td>
                <td className="text-right">{item.unitPrice.toFixed(2)}</td>
                <td className="text-right">{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={4}><hr className="my-1"/></td></tr>
            <tr className="font-bold">
              <td colSpan={3} className="text-right">Subtotal</td>
              <td className="text-right">{document.subtotal.toFixed(2)}</td>
            </tr>
            <tr className="font-bold">
              <td colSpan={3} className="text-right">Tax</td>
              <td className="text-right">{document.tax.toFixed(2)}</td>
            </tr>
            <tr><td colSpan={4}><hr className="my-1"/></td></tr>
            <tr className="font-bold text-lg">
              <td colSpan={3} className="text-right">Total</td>
              <td className="text-right">{document.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {document.notes && (
        <section className="my-4">
          <h3 className="font-bold">Notes:</h3>
          <p>{document.notes}</p>
        </section>
      )}

      <footer className="text-center mt-4">
        <p>Thank you for your business!</p>
      </footer>
    </div>
  );
};
