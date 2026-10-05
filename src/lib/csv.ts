// Tiny CSV reader for the price-list import (handles quotes and commas).
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((f) => f !== "")) rows.push(row);
  }
  const [header = [], ...data] = rows;
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

// ---- Price list columns -------------------------------------------------------------
/** The columns a price list can have, in template order. */
export const PRICE_LIST_COLUMNS = [
  { key: "itemCode", label: "Item code", required: true, example: "W3030", note: "Unique code. Existing codes are updated." },
  { key: "name", label: "Name", required: true, example: "Wall cabinet 30\"W x 30\"H", note: "What shows on estimates and invoices." },
  { key: "description", label: "Description", required: false, example: "Shaker white, 12\" deep", note: "" },
  { key: "category", label: "Category", required: false, example: "Cabinets", note: "New categories are added automatically." },
  { key: "collection", label: "Collection", required: false, example: "Avalon", note: "Door style or product line." },
  { key: "supplier", label: "Supplier", required: false, example: "Northline Cabinetry", note: "New suppliers are added automatically." },
  { key: "listPrice", label: "List price", required: false, example: "245.00", note: "The supplier's price before our discount." },
  { key: "supplierDiscountPct", label: "Supplier discount %", required: false, example: "40", note: "Price in = list price less this %." },
  { key: "unitCost", label: "Unit cost", required: false, example: "", note: "Leave empty to work it out from list price and discount." },
  { key: "unit", label: "Unit", required: false, example: "each", note: "each, box, sq ft, linear ft…" },
  { key: "qtyOnHand", label: "Qty on hand", required: false, example: "4", note: "Opening stock, only for new items." },
] as const;

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const HEADER_ALIASES: Record<string, string> = {
  code: "itemCode", sku: "itemCode", item: "itemCode", itemno: "itemCode",
  discount: "supplierDiscountPct", discountpct: "supplierDiscountPct", supplierdiscount: "supplierDiscountPct",
  list: "listPrice", msrp: "listPrice", cost: "unitCost", qty: "qtyOnHand", quantity: "qtyOnHand", onhand: "qtyOnHand", stock: "qtyOnHand",
};
for (const c of PRICE_LIST_COLUMNS) {
  HEADER_ALIASES[squash(c.key)] = c.key;
  HEADER_ALIASES[squash(c.label)] = c.key;
}

/** Accepts friendly headings ("Item code", "List price", "Discount %"…) and money like "$1,200.50". */
export function normalizePriceList(rows: Record<string, string>[]) {
  return rows.map((r) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      const key = HEADER_ALIASES[squash(k)];
      if (!key) continue;
      out[key] = ["listPrice", "supplierDiscountPct", "unitCost", "qtyOnHand"].includes(key) ? v.replace(/[$,%\s]/g, "") : v;
    }
    return out;
  });
}

/** Lets the browser save a text file (CSV template, exports). */
export function downloadText(filename: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
