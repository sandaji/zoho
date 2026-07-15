# ROLE

You are a Senior ERP Software Architect and Senior Full Stack Engineer.

Your task is to redesign the Sales Receipt / Invoice PDF generation logic inside this ERP so that it matches the professional invoice layout demonstrated in the provided sample PDFs.

This is NOT a redesign from scratch.

It is an enhancement of the existing receipt generation.

The existing architecture, document flow, database relationships, and business rules MUST remain intact.

Do not hallucinate.

Do not invent APIs.

Do not duplicate code.

Reuse existing models, services, utilities, PDF generators, repositories and helper functions whenever possible.

---

# PHASE 1 — UNDERSTAND THE PROJECT FIRST (MANDATORY)

DO NOT WRITE CODE.

First inspect the project.

Understand:

* Sales module
* POS module
* Sales Documents
* Invoice generation
* Receipt generation
* PDF utilities
* Customer model
* Branch model
* Company model
* User model
* Sales model
* Sales Items
* Payment model
* Tax calculations
* Quote generation
* Existing PDF templates
* Existing numbering logic
* Existing print functionality

Locate every file responsible for:

* receipt generation
* invoice PDF
* quote PDF
* document printing
* sales closing
* completed sale workflow
* download receipt button

Understand exactly where the PDF is generated.

Do not duplicate it.

Enhance it.

---

# PHASE 2 — STUDY THE SAMPLE PDFs

The uploaded sample PDFs are the visual source of truth.

Study:

spacing

alignment

table layout

typography

header

footer

totals

signature section

VAT presentation

customer section

prepared by section

company details

amount in words

Do not approximate.

Replicate the structure as closely as possible while preserving existing branding.

---

# PHASE 3 — IMPLEMENT THE FOLLOWING BUSINESS LOGIC

The PDF must become a professional invoice document.

Every field below must be dynamic.

No hardcoded values.

---

COMPANY DETAILS

Display:

Company Name

Branch Name (if applicable)

Physical Address

Phone Number

Email

KRA PIN

Logo

Use the existing company configuration.

Do not hardcode.

---

DOCUMENT TYPE

Automatically determine:

Sales Invoice

Tax Invoice

Cash Sale

Receipt

Credit Note

Quotation

Draft

Depending on the document type already supported by the ERP.

Do not hardcode "Sales Invoice".

---

DOCUMENT NUMBER

Use the ERP document sequence.

Never generate a new number inside the PDF.

Use the number generated when the document was finalized.

---

CUSTOMER DETAILS

Display dynamically:

Customer Name

Customer Address

Customer Contact

Customer KRA PIN

Customer Account Code (if available)

Only display values that exist.

Do not print undefined.

Do not print null.

If optional fields are empty, gracefully omit them.

---

DATE

The displayed date MUST NOT be the current system time.

It MUST be the timestamp when the invoice was officially completed/closed/finalized.

Use the existing sale completion timestamp.

Not:

createdAt

updatedAt

download time

browser time

Use the invoice closing timestamp.

Display both:

Date

Time

Example:

15-07-2026 15:14:14

---

PREPARED BY

Prepared By must always be the authenticated ERP user who finalized the invoice.

NOT the currently logged in user during download.

If User A created the invoice yesterday,

and User B downloads it today,

Prepared By must still show User A.

Use the stored sales user relationship.

Display:

Prepared By

Employee Name

Employee Code (if available)

Date Prepared

---

ITEM TABLE

Display:

S/N

Product Code

Description

Quantity

Unit

Unit Price

Discount

VAT

Line Total

Use existing pricing logic.

Never recalculate totals differently from the sales module.

---

TOTALS

Use existing ERP calculations.

Display:

Sub Total

Discount

Taxable Amount

VAT Amount

Grand Total

Paid Amount

Balance

Amount in Words

Amount in words must always match the Grand Total.

Never compute a different total.

---

PAYMENT DETAILS

If available display:

Payment Method

Cash

Bank

Card

Mobile Money

Reference Number

Transaction Code

Receipt Number

Cashier Session

Only show values that exist.

---

FOOTER

Replicate the professional footer from the sample.

Include:

Prepared By

Received By

Name

Contact

Signature

Document Verification fields (if supported)

Thank You message

Return policy

If verification codes already exist in the ERP,

display them.

Otherwise do not invent them.

---

TERMS & CONDITIONS

Support configurable terms.

Do not hardcode.

Read from existing configuration.

If configuration does not exist,

create a reusable configuration source.

Example:

Goods once sold are non-refundable.

Invoices are processed after payment confirmation.

Quotation validity.

etc.

---

LOGO

Use the configured company logo.

Do not hardcode image paths.

Fallback gracefully if no logo exists.

---

BRANCH SUPPORT

The receipt must automatically display the branch information belonging to the sale.

Never display the currently selected branch if it differs from the sale's originating branch.

Always use the branch attached to the completed transaction.

---

TAX SUPPORT

Use existing tax engine.

Do not manually calculate VAT.

Respect:

Inclusive VAT

Exclusive VAT

Zero Rated

Exempt

Future tax configurations

---

MULTI COMPANY SUPPORT

If multiple companies are supported,

display the company attached to the sale.

Never assume a single company.

---

PDF LAYOUT REQUIREMENTS

Match the uploaded sample documents.

Professional spacing.

Consistent typography.

Proper alignment.

Clean borders.

Automatic page sizing.

Long descriptions should wrap.

Tables should never overflow.

Totals should always remain aligned.

Company information should remain fixed.

Footer should stay at the bottom.

---

PRINT SUPPORT

The PDF must print correctly on:

A4

Letter

Thermal printers (if supported)

Margins should be consistent.

No clipped content.

---

DATA SOURCE RULES

The PDF is a rendering layer only.

It must NEVER perform business calculations.

It must consume finalized data from the ERP.

The PDF must never become a second calculation engine.

---

CODE QUALITY

Do not duplicate:

PDF helpers

Currency formatters

Date formatters

Amount-in-words logic

Tax logic

Company helpers

Customer helpers

Product helpers

Branch helpers

Create reusable utilities only if they do not already exist.

---

TESTING

Verify:

Customer name loads correctly.

Customer address loads correctly.

Customer PIN loads correctly.

Prepared By always shows the invoice creator.

Date always shows invoice completion timestamp.

Invoice number matches ERP.

Totals match database.

VAT matches database.

Amount in words matches Grand Total.

Long product names wrap correctly.

Empty optional fields do not render.

Logo loads.

Branch details are correct.

Print preview matches sample.

No broken layouts.

No overlapping text.

No clipped tables.

No duplicated calculations.

---

FINAL VALIDATION

Before finishing confirm:

✓ No duplicated code

✓ Existing architecture preserved

✓ Existing document flow preserved

✓ Existing numbering preserved

✓ Existing permissions preserved

✓ Existing calculations preserved

✓ Existing APIs reused

✓ Existing models reused

✓ Customer information fully dynamic

✓ Customer address fully dynamic

✓ Customer PIN fully dynamic

✓ Prepared By uses the invoice owner

✓ Date uses invoice closing timestamp

✓ Layout closely matches the supplied PDF samples

✓ PDF is production-ready

If any item fails, continue refining until every requirement passes.
