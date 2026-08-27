Below is a general, practical guide to how invoicing usually works in a POS system. Menu names differ between systems — e.g. Odoo, Loyverse, Square, Erply, HDPOS, Retail POS, etc. — but the core concepts are very similar.

# 1. Logging in and navigating to the POS

Typical flow:

Open the POS app on your computer/tablet/browser.

Log in with your username and password, or PIN.

Select your store/outlet if you have multiple locations.

Select the register/cash drawer if required.

If the system uses cash management, you may need to enter an opening float (starting cash amount).

You land on the POS dashboard or Sales screen.

From the main menu you can usually access:

POS / Sell / New Sale

Quotations / Quotes

Drafts / Suspended Sales

Invoices / Sales History

Credit Notes / Returns

Customers

Products / Inventory

Reports

# 2. Creating a draft or quotation

Draft / Suspended Sale
A draft is an incomplete sale that you can save and finish later.

To create a draft:

Click POS / New Sale.

Add a customer if needed — optional for a quick sale.

Scan or search for products.

Set quantities, prices, discounts.

Instead of taking payment, click Save Draft / Hold / Suspend Sale.

The sale is saved as a draft. Stock is not affected yet.

Quotation
A quotation is a formal offer to a customer. It shows prices and totals but does not post an invoice or reduce stock.

To create a quotation:

Go to Sales > Quotations or from the POS screen choose New Quotation.

Select the customer — usually required.

Add products/services.

Adjust quantities, prices, discounts.

Set a validity/expiry date if the system supports it.

Save the quotation.

You can then:

Print it as a PDF

Email it to the customer

Save it for later conversion

Stock is not reduced by a quotation or draft. It only becomes an invoice when you actually post/confirm the sale.

# 3. Previewing and editing saved quotations/drafts

To find saved quotations or drafts:

Go to Sales > Quotations or Sales > Drafts / Suspended Sales from the main menu.

You will see a list with columns like:

Document number

Date

Customer

Status (Draft, Quotation, Converted, Expired)

Total amount

Use the search/filter options to find a specific quote by:

Customer name

Quote number

Date range

Status

To preview:
Click on the quotation/draft row or the eye/preview icon.

The system shows the document exactly as it will look when printed.

To edit:
Open the quotation/draft.

Click Edit.

You can usually change:

Customer

Products and quantities

Prices

Discounts per line or on the whole order

Notes, terms, expiry date

Save the changes.

Some systems allow duplicate or copy if you want to create a new quote based on an old one.

# 4. Generating an invoice from a quotation or draft

This is one of the most important workflows.

Steps:

Open the quotation or draft from the list.

Review the items, quantities, prices, discounts, and customer details.

Make any final changes if needed.

Click Convert to Invoice / Create Invoice / Confirm Sale.

The system will:

Create a new invoice number

Link the invoice to the original quotation/draft number

Mark the quotation/draft as Converted or Closed

Choose the payment method:

Cash

Card

Mobile money / M-Pesa etc.

Bank transfer

Split payment

Credit/on account

Enter the amount received if it is a cash sale.

Click Post / Save / Complete.

Once posted:

Stock levels are reduced.

The invoice is saved in sales history.

The customer account is updated if it was a credit sale.

You can now print or email the invoice.

# 5. Generating a credit note from an invoice

A credit note is used when:

A customer returns goods.

You need to refund money.

You need to correct an overcharged invoice.

Procedure
Go to Sales > Invoices / Sales History.

Find and open the original invoice.

Click Credit Note / Return / Refund — the wording depends on the POS.

Select the items being returned.

Enter the quantity to be returned.

Choose a return reason if the system asks for it:

Damaged

Wrong item

Customer changed mind

Expired

Indicate whether the returned items should go back into stock.

If yes, stock quantity will increase.

If no, stock is not changed — only the financial side is credited.

The system calculates the refund total automatically.

Choose the refund method:

Cash

Card reversal

Store credit / customer account

Voucher

Post/save the credit note.

The credit note will:

Be linked to the original invoice.

Create a negative sales document.

Update the customer balance.

Optionally return items to inventory.

You can print or email it as a PDF or thermal receipt.

Some systems also allow standalone credit notes, but the recommended way is to create them from the original invoice so the link is preserved.

# 6. How invoicing and credit notes affect stock levels

Document type Stock effect Notes
Draft / Suspended sale No effect Nothing posted yet.
Quotation No effect It is only an offer.
Invoice / Completed sale Decreases stock Posted after payment or confirmation.
Credit note with return to inventory Increases stock Items are put back into stock.
Credit note without return No effect Only financial correction/refund.
Important:

Stock is reduced when the invoice is posted, not when it is saved as draft.

If you later create a credit note and choose “return to stock”, the quantity is added back.

Some POS systems track stock by warehouse/location. In that case, you must select the correct location for returns.

Cost of goods sold is usually recorded when the invoice is posted.

If you use serial numbers or batches, returns may require selecting the exact serial/batch being returned.

# 7. Offering discounts per item or on the whole order

POS systems usually support both.

A. Item-level discount
This discount applies to a single line/item.

How to do it:

Add the item to the sale.

Click on the line item or open its details.

Enter a discount:

Percentage: e.g. 10%

Fixed amount: e.g. $5.00 off

The line total is recalculated:

Original price: $100

Discount 10%: −$10

New line total: $90

Tax is recalculated on the discounted price.

Some systems also allow you to set a unit price override, but a discount is better for reporting.

B. Order-level discount
This discount applies to the whole sale after all line items are added.

How to do it:

Add all items to the sale.

Look for a field like:

Order discount

Total discount

Cart discount

Enter a percentage or fixed amount.

Example: Subtotal is $500, order discount 10% = $50 off, new subtotal $450.

The discount is usually applied before tax, but some systems allow after-tax discounts.

Combining both
You can often combine item-level and order-level discounts:

Item 1: 5% discount

Item 2: $10 discount

Whole order: additional 5% discount

The system calculates line discounts first, then the order discount on the remaining subtotal.

Many POS systems also allow:

Discount reasons

Manager approval for discounts above a certain limit

Customer-specific discounts

Automatic promotions

# 8. Document printing: PDF and thermal printer

There are usually two types of printing in a POS:

A. PDF / A4 invoice or quotation
This is a formal document for email or regular paper.

How to print/save as PDF:

Open the invoice, quotation, or credit note.

Click Print / PDF / Preview.

The system opens a print preview.

Choose Save as PDF or select a normal A4/Letter printer.

Save or print.

Use this for:

Quotations sent by email

Tax invoices

Credit notes

Formal documents with customer address, terms, tax breakdown, bank details

## B. Thermal receipt printing

This is the small receipt printed at the counter.

Typical thermal printer sizes:

80mm wide — most common

58mm wide — smaller portable printers

How to print:

Open the invoice/receipt screen.

Click Print Receipt or press the print shortcut.

Select the thermal printer.

Make sure the paper size is set to 80mm or 58mm.

Print.

### Thermal receipts usually include:

Shop name and logo

Address, phone

Receipt number

Date and time

Cashier name

Items with quantities and prices

Discounts

Tax summary

Total, amount paid, change

Payment method

Return policy or footer message

Barcode or QR code if configured

Many POS systems have a separate button for:

Print A4 invoice — for full-page invoice

Print thermal receipt — for small counter receipt

In browser-based POS systems, thermal printing is usually done through the browser’s print dialog. You must select the thermal printer and set the correct paper width. Native Windows/Android POS apps often print directly to the thermal printer using ESC/POS commands.

Printing: PDF & Thermal
A. PDF / A4 Document
Use a server-side HTML-to-PDF library:

Python: WeasyPrint, ReportLab, wkhtmltopdf

Node.js: Puppeteer, pdfkit

PHP: Dompdf, TCPDF

Java: iText, JasperReports

Create an HTML template for invoice/quote/credit note, inject data, then convert to PDF. You can also allow downloading or emailing.

Template includes:

Company logo, address, tax ID

Customer details

Document number and dates

Line items table

Discounts, taxes, totals

Payment terms, notes

QR code (optional)

B. Thermal Receipt (80mm/58mm)
Thermal printers use ESC/POS commands. Options:

Direct ESC/POS: Send raw bytes to printer via network/Bluetooth/USB.

Libraries: python-escpos, node-escpos, escpos-php.

Browser printing: If your POS is web-based, use JavaScript to open a print window with CSS formatted for 80mm width. The browser then sends to the thermal printer (which must be installed as a system printer). Set CSS:

css
@media print {
body { width: 72mm; font-family: monospace; font-size: 12px; }
}
PDF to thermal: Some systems generate a small PDF and print via PDF viewer.

Receipt content:

Shop name, logo (if supported)

Date, time, receipt number, cashier

Items (name, qty, price, total)

Discounts

Tax summary

Total, amount paid, change

Payment method

Footer message / return policy

# 9. Other important things you may have missed

Here are additional areas that are part of invoicing in a POS:

Payments and cash management
Cash, card, mobile money, bank transfer, split payments

Partial payments and credit sales

Cash register opening/closing

Cash float and expected cash in drawer

Cashier shift reports

Customers
Selecting an existing customer or creating a new one

Customer balance / accounts receivable

Customer price levels

Loyalty points

Taxes
VAT / GST / sales tax

Tax-exempt customers

Inclusive vs exclusive tax

Tax breakdown on invoice

Inventory details
Multi-warehouse/location

Serial numbers / IMEI

Batches and expiry dates

Product variants like size/colour

Stock reservations

Barcode scanning
Scan product barcodes to add items quickly

Search by name, SKU, or barcode

Price levels
Wholesale vs retail price

Customer-specific pricing

Minimum and maximum prices

Permissions
Only certain users can:

Give discounts above a limit

Edit prices

Void invoices

Create credit notes

Open cash drawer

Audit trail
The system records who created, edited, or voided documents.

Useful for fraud prevention.

Offline mode
Some POS systems work offline and sync later.

Important if you have network issues.

Email/SMS
Sending invoices/quotes by email

Sending SMS receipts

Returns and exchanges
Credit note vs exchange

Some systems allow an exchange without a credit note

Gift cards and store credit
Selling gift cards

Redeeming gift cards/store credit as payment

Credit notes can be used as store credit

Multi-currency
If you sell in more than one currency

Exchange rates and rounding

Rounding
Rounding totals to the nearest 5 cents/1 shilling etc.

Important for cash transactions

Layaway / deposits
Taking a deposit and holding goods

Invoicing the balance later

Summary workflow
Here is a typical end-to-end flow:
Login
↓
Navigate to POS / New Sale
↓
Select customer
↓
Add products
↓
Apply item discounts and/or order discount
↓
Save as Draft OR Save as Quotation
↓
Later: open quotation/draft
↓
Convert to Invoice
↓
Post invoice → stock decreases
↓
Print thermal receipt / save PDF invoice
↓
(If needed) Open invoice → Create Credit Note
↓
Select returned items and return-to-stock option
↓
Post credit note → stock increases if returned
↓
Print credit note
