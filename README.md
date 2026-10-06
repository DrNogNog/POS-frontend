# POS frontend (web app)

The screens for the Champion POS, in a brown & white theme. Built with Next.js.

## Run it

1. Start the backend first (see `POS-backend/README.md`).
2. Install the packages and start the app:
   ```powershell
   npm install
   npm run dev
   ```
3. Open http://localhost:3000 and log in. The store you're in is whichever drive the
   backend's database is running from; its name shows at the top of every screen.

If the API isn't at `http://localhost:4000`, copy `.env.example` to `.env.local` and set
`NEXT_PUBLIC_API_URL`.

## Screens

| Menu | What it's for |
|---|---|
| Dashboard | Today's sales, who owes us, what we owe, low stock, latest activity |
| New sale or estimate | Pick a remembered customer, add items by code, then save an estimate or invoice now and take payment |
| Estimates / Approvals | Approve an estimate, then turn it into an invoice (stock comes out, A/R goes up) |
| Invoices | All invoices, sortable by date; open one to record payments, late fees, collections, write-off or void |
| Customers | Saved details (pickup/delivery, addresses, card on file, price level, terms) and invoice history sorted by date |
| Accounts receivable | Aging (current / 30 / 60 / 90+), days to get paid, and whether A/R is too high or too low |
| Purchase orders | Order from suppliers, then receive the goods with the supplier's invoice |
| Billing orders | Supplier bills (stock and other expenses) with PDFs |
| Suppliers | Contract terms (15/30/45 days), discount off list, early-pay discount, late fees, history |
| Accounts payable | What we owe, what's due soon, discounts to grab, current liabilities |
| Items & stock | Price in, price out by level, quantity on hand; import price lists |
| Cabinet code guide | What codes like W0930, WDC2430 or AL-DB18-3 mean |
| Costing & averages | Weighted average cost per item, and FIFO vs LIFO vs average |
| Reports | Profit & loss, balance sheet, trial balance, journal |
| Payroll | Employees and pay runs |
| History | Every change, who made it, when |
| Settings | Store details, costing method, terms and late fees, price levels, tax rates, users |

## Code layout

```
src/app/<screen>/page.tsx   one folder per screen
src/components/ui.tsx       buttons, inputs, tables, dialogs: the shared look
src/components/forms.tsx    customer, supplier, item and payment dialogs
src/lib/api.ts              talks to the backend (login token + store on every call)
src/lib/session.tsx         who's logged in, which store, store settings
src/lib/itemCodes.ts        cabinet code decoder (same file as the backend's)
src/app/globals.css         the brown & white color palette
```
