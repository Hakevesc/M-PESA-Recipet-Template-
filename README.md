# M-PESA Receipt Template — Pay Utility EEU, School Payment, Airtime C2B

Two standalone, editable Pay Utility EEU receipts in one page — the **merchant**
copy and the **customer** copy — picked from the dropdown at the top left of the
toolbar. Open `index.html` in a browser — no server, no build step, no internet
needed.

```
PDF Receipt Template/
├─ index.html                 both receipts + toolbar
├─ styles.css                 all receipt styling (was inline in the source file)
├─ template.js                edit / update / print / download behaviour
├─ assets/
│  ├─ M-PESA-red-logo.svg            merchant header logo
│  ├─ M-PESA-wordmark-white.svg      merchant footer-bar logo (white, for the green bar)
│  ├─ M-PESA & Safaricom-logo.png       customer header lockup
│  ├─ M-PESA & Safaricom-logo-white.png customer footer-bar lockup (white)
│  ├─ M-PESA-official_stamp.png      stamp watermark (both sheets)
│  └─ assets-inline.js        generated base64 copies of the five files above
├─ vendor/html2pdf.bundle.min.js   html2canvas + jsPDF, vendored for offline use
└─ build-inline-assets.ps1    regenerates assets-inline.js
```

## The two receipts

| Dropdown | Source | Field set |
| --- | --- | --- |
| **Merchant** | `Pay Utility EEU_Customer - UHS7FDXDDX.html` | payer name / short code, customer name, reference, payer TIN, bill month, amount, transaction ID; `RECEIPT NO · PAYMENT DATE · TOTAL BILL AMOUNT` table with a green TOTAL row |
| **Customer** | `UI72LS7Y48.pdf` | payer name / phone / TIN, receiver organization name + number, payment reference, bill month, transaction ID; `RECIEPT NO · PAYMENT DATE · SETTLED AMOUNT` table with SERVICE FEE, + 15% VAT and TOTAL rows |

### School Payment and Airtime C2B

Three more sheets, ported from the `Merchant PDF RECEIPT/` collection in the
EEU merchant sheet's style (green brand, no QR block, locked labels, yellow
`data-required` placeholders):

| Dropdown | Source | Field set |
| --- | --- | --- |
| **School Payment - Merchant** | `Pay_Utility_School_Receipt_Business_Merchant.html` | payer name / short code / TIN, receiver school name, customer phone, school code, student ID, fee type, outstanding amount, transaction ID; SERVICE FEE, COMMISSION FEE, 15% VAT and TOTAL rows; debit account + payment channel |
| **School Payment - Customer** | `Pay_Utility_School_Receipt_Customer_Merchant.html` | same info rows; SERVICE FEE, 15% VAT and TOTAL rows; payment channel (added, as on the EEU sheets) |
| **Airtime C2B - Merchant** | `Sell_Airtime_Receipt_Business_Merchant.html` | merchant name / short code / TIN, receiver name + phone, amount, transaction ID; `RECEIPT NO · TRANSACTION DATE & TIME · AIRTIME AMOUNT` table with COMMISSION FEE, 15% VAT and TOTAL rows; debit account + used channel |

Locked constants on these sheets: `TRANSACTION TYPE` (`Pay Utility - School` /
`Sell Airtime`) and `PAYMENT REASON` / `TRANSACTION REASON`. The School Payment
merchant sheet carries the most rows, so it uses `.compact-page` (tighter row
padding) to stay one A4 page without being scaled down.

They also differ in branding: the merchant sheet uses the plain M-PESA logo, the
customer sheet the combined M-PESA / Safaricom lockup, top and bottom — exactly
as each one is printed.

The choice is remembered (`mpesa-receipt-variant-v1`), and each sheet keeps its
own saved edits, so filling one in never disturbs the other. Only the selected
sheet exists as far as **Print** and **Download A4 PDF** are concerned.

## Buttons

| Button | What it does |
| --- | --- |
| **Receipt** | Switches between the merchant and the customer sheet. Leaves edit mode first. |
| **Edit** | Turns the selected sheet's value blocks into editable fields (dashed green outline). Labels, headings and the top company details stay locked. |
| **Update** | Ends edit mode, applies the changes and saves them in the browser. Shows "Updated", or warns if fields still hold sample data. |
| **Print** | Browser print dialog, fitted to one A4 page. |
| **Download A4 PDF** | Saves `M-PESA-Receipt-<variant>-<TRANSACTION ID>.pdf` — one page, exactly 210 × 297 mm. |
| **Reset** | Restores the original placeholder values **for the selected sheet only**. |

## What is editable

Both sheets lock the same furniture: the title, every label, the section and
table headers, the company block at the top, the thank-you line and the diagonal
"M-PESA" watermark. To change any of that, edit `index.html` directly.

What is unlocked differs, and is driven by two attributes in the markup:

* `data-value` — an unlocked transaction value.
* `data-required` — unlocked **and** warns while it still holds sample data.

| Sheet | Unlocked | Warns |
| --- | --- | --- |
| Merchant | 15 fields (the yellow-highlighted `data-required` blocks) | the same 15 |
| School Payment - Merchant | 20 | 20 |
| School Payment - Customer | 18 | 18 |
| Airtime C2B - Merchant | 16 | 16 |
| Customer | all 19 transaction values | 14 of them |

The customer sheet is fully editable end to end, including the values that are
constant in practice — `RECEIVER ORGANIZATION NAME`, `RECEIVER ORGANIZATION
NUMBER`, `PAYMENT METHOD`, `TRANSACTION TYPE` and the blank `PAYMENT REASON`.
Those five carry `data-value` without `data-required`, so they are typeable but
never nag.

## Sample data and the "needs real data" warning

Both templates ship with placeholder values (`Payer Full Name`, `2517XXXXXXXX`,
`0.00 BIRR`, `XXXXXXXXXX`, `RCP0000SAMPLE`, `DD-MM-YYYY 00:00:00`, …) — no real
customer data.

A required field counts as **not updated** while it is empty or still equal to
the value the template shipped with. Those fields carry an amber underline, and
a warning appears when you press **Update** and again when you press **Download
A4 PDF**, so a receipt full of placeholders can't go out unnoticed. Nothing is
blocked: the update is still applied and the PDF still downloads.

The amber marks are screen-only — they never appear in the printed page or the PDF.

Edge case: a field whose real value happens to match its placeholder (a service
fee genuinely of `0.00 BIRR`) will keep warning. Retype it or ignore the mark.

Edits are kept in the browser's local storage — `mpesa-receipt-eeu-customer-v1`
for the merchant sheet (the original key, so earlier edits survive) and
`mpesa-receipt-eeu-payer-v1` for the customer sheet, and `mpesa-receipt-school-merchant-v1`,
`mpesa-receipt-school-customer-v1`, `mpesa-receipt-airtime-merchant-v1` for the new ones. **Reset** clears the
selected one.

## Swapping the logo or stamp

Replace the file in `assets/`, then regenerate the inlined copies:

```bash
powershell -ExecutionPolicy Bypass -File ./build-inline-assets.ps1
```

The inlined copies exist because a browser refuses to read a local image into a
canvas when the page is opened from disk (`file://`), which would otherwise
produce a blank PDF.

## Notes on the A4 output

* Each receipt body is 793.7 × 1122.5 px = exactly A4 at 96 dpi, and the vertical
  rhythm is slightly tighter than the original receipts so each fits one sheet
  without being shrunk.
* If edits make the content taller than a page, it is scaled down uniformly (never
  stretched) so the result stays a single A4 page.
* The green footer bar sits in normal flow and the footer logo is a real white
  asset — an absolutely positioned bar and a CSS `filter: invert()` both render
  wrong through html2canvas.
* On the customer sheet the stamp is placed with `.customer-page .stamp-inline`
  and the gap it drops into comes from `.customer-page .additional-info`'s
  `margin-top`, which spends slack the sheet already had (the footer carries
  `margin-top: auto`). Move the stamp and you may want to adjust that gap too.
