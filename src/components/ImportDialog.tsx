"use client";
// -----------------------------------------------------------------------------
// Import a price list (CSV) into Items & stock, in three steps:
//   1. get the file ready (download a template, see the columns)
//   2. choose the file
//   3. check the preview and import
// Existing item codes get their prices and details updated; new codes are
// added (with opening stock if the file has a quantity).
// -----------------------------------------------------------------------------
import { useRef, useState } from "react";
import { Download, FileUp } from "lucide-react";
import { api } from "@/lib/api";
import { PRICE_LIST_COLUMNS, downloadText, normalizePriceList, parseCsv } from "@/lib/csv";
import { money, n } from "@/lib/format";
import { Badge, Button, Modal, Table, Td, Th } from "./ui";

type Row = Record<string, string>;
const CHUNK = 500;

function templateCsv() {
  const head = PRICE_LIST_COLUMNS.map((c) => c.key).join(",");
  const example = PRICE_LIST_COLUMNS.map((c) => (/[",]/.test(c.example) ? `"${c.example.replace(/"/g, '""')}"` : c.example)).join(",");
  return `${head}\n${example}\n`;
}

function priceIn(r: Row) {
  if (r.unitCost) return n(r.unitCost);
  return n(r.listPrice) * (1 - n(r.supplierDiscountPct) / 100);
}

export function ImportDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [dupes, setDupes] = useState(0);
  const [showColumns, setShowColumns] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ created: number; updated: number } | null>(null);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function reset() {
    setFileName("");
    setRows([]);
    setSkipped(0);
    setDupes(0);
    setProgress(null);
    setResult(null);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  }
  function close() {
    if (progress && !result && !error) return; // don't close half way through
    reset();
    onClose();
  }

  async function chooseFile(file: File | undefined) {
    reset();
    if (!file) return;
    setFileName(file.name);
    if (!/\.csv$/i.test(file.name)) {
      setError("Please choose a .csv file. In Excel use File → Save As → CSV UTF-8 (comma delimited).");
      return;
    }
    const all = normalizePriceList(parseCsv(await file.text()));
    const good = all.filter((r) => r.itemCode && r.name);
    const seen = new Map<string, Row>();
    for (const r of good) seen.set(r.itemCode.toUpperCase(), r); // last one in the file wins
    setRows([...seen.values()]);
    setSkipped(all.length - good.length);
    setDupes(good.length - seen.size);
    if (!all.length) setError("No rows found. The first line must be the column headings (see the template).");
    else if (!good.length) setError("No row has both an item code and a name. Check the column headings against the template.");
  }

  async function importRows() {
    setError("");
    setProgress({ done: 0, total: rows.length });
    let created = 0;
    let updated = 0;
    try {
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK).map((r) => ({
          ...r,
          listPrice: r.listPrice || 0,
          supplierDiscountPct: r.supplierDiscountPct || 0,
          unitCost: r.unitCost ? r.unitCost : undefined,
          qtyOnHand: r.qtyOnHand ? r.qtyOnHand : undefined,
        }));
        const res = await api<{ created: number; updated: number }>("/products/import", { body: { rows: chunk } });
        created += res.created;
        updated += res.updated;
        setProgress({ done: Math.min(i + CHUNK, rows.length), total: rows.length });
      }
      setResult({ created, updated });
      onDone();
    } catch (e) {
      setError(`${e instanceof Error ? e.message : String(e)} — ${created + updated} items were saved before this stopped. Fix the file and import again; saved items will just be updated.`);
    }
  }

  const importing = !!progress && !result && !error;
  const withStock = rows.filter((r) => n(r.qtyOnHand) > 0).length;

  return (
    <Modal
      open={open}
      onClose={close}
      wide
      title="Import a price list"
      footer={
        result ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close} disabled={importing}>Cancel</Button>
            <Button onClick={importRows} busy={importing} disabled={!rows.length || importing}>
              {rows.length ? `Import ${rows.length.toLocaleString()} item${rows.length === 1 ? "" : "s"}` : "Import"}
            </Button>
          </>
        )
      }
    >
      <ol className="space-y-6">
        <li>
          <h3 className="font-semibold text-walnut">1. Get the file ready</h3>
          <p className="mt-1 text-sm text-oak">
            Use a spreadsheet saved as <b>CSV</b> (in Excel: File → Save As → CSV UTF-8). The first row holds the column
            headings. Only <b>Item code</b> and <b>Name</b> are required — everything else is optional.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => downloadText("price-list-template.csv", templateCsv())}>
              <Download size={16} /> Download blank template
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowColumns((s) => !s)}>
              {showColumns ? "Hide the columns" : "What goes in each column?"}
            </Button>
          </div>
          {showColumns && (
            <div className="mt-3 overflow-hidden rounded-lux border border-hairline">
              <Table>
                <thead><tr><Th>Column</Th><Th>Example</Th><Th>Notes</Th></tr></thead>
                <tbody>
                  {PRICE_LIST_COLUMNS.map((c) => (
                    <tr key={c.key}>
                      <Td><b>{c.label}</b>{c.required && <span className="ml-1 text-late">*</span>}</Td>
                      <Td className="text-oak">{c.example || "—"}</Td>
                      <Td className="text-oak">{c.note}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </li>

        <li>
          <h3 className="font-semibold text-walnut">2. Choose the file</h3>
          <label className="mt-2 flex cursor-pointer items-center gap-4 rounded-lux border-2 border-dashed border-hairline bg-linen/50 px-5 py-5 hover:border-brass">
            <FileUp size={28} className="shrink-0 text-oak" aria-hidden />
            <span className="flex-1">
              <span className="block font-semibold text-walnut">{fileName || "Choose a CSV file…"}</span>
              <span className="block text-sm text-oak">{fileName ? "Click to choose a different file" : "Click here to browse your computer"}</span>
            </span>
            <input ref={fileInput} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => chooseFile(e.target.files?.[0])} disabled={importing} />
          </label>
        </li>

        {(rows.length > 0 || error) && (
          <li>
            <h3 className="font-semibold text-walnut">3. Check and import</h3>
            {rows.length > 0 && (
              <>
                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  <Badge tone="paid">{rows.length.toLocaleString()} items ready</Badge>
                  {withStock > 0 && <Badge>{withStock.toLocaleString()} with opening stock</Badge>}
                  {skipped > 0 && <Badge tone="due">{skipped} rows skipped (no code or name)</Badge>}
                  {dupes > 0 && <Badge tone="due">{dupes} repeated codes (last one used)</Badge>}
                </div>
                <div className="mt-3 overflow-hidden rounded-lux border border-hairline">
                  <Table>
                    <thead>
                      <tr><Th>Code</Th><Th>Name</Th><Th>Category</Th><Th>Supplier</Th><Th className="text-right">List</Th><Th className="text-right">Price in</Th><Th className="text-right">Qty</Th></tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((r) => (
                        <tr key={r.itemCode}>
                          <Td className="font-semibold text-walnut">{r.itemCode.toUpperCase()}</Td>
                          <Td>{r.name}</Td>
                          <Td>{r.category || "—"}</Td>
                          <Td>{r.supplier || "—"}</Td>
                          <Td className="num">{r.listPrice ? money(r.listPrice) : "—"}</Td>
                          <Td className="num">{money(priceIn(r))}</Td>
                          <Td className="num">{r.qtyOnHand || "—"}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  {rows.length > 5 && <p className="px-6 py-2 text-xs text-oak">…and {(rows.length - 5).toLocaleString()} more</p>}
                </div>
                <p className="mt-3 text-sm text-oak">
                  Items whose code already exists get their name, prices and supplier updated — their stock isn&apos;t touched.
                  New items are added, and their quantity (if any) is booked in as opening stock.
                </p>
              </>
            )}
            {progress && (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-linen">
                  <div className="h-full bg-walnut transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
                </div>
                <p className="mt-1 text-sm text-oak">
                  {result
                    ? <span className="font-semibold text-paid">Done — {result.created.toLocaleString()} new items added, {result.updated.toLocaleString()} updated.</span>
                    : `Importing ${progress.done.toLocaleString()} of ${progress.total.toLocaleString()}…`}
                </p>
              </div>
            )}
            {error && <p className="mt-3 rounded-lux bg-late/5 px-4 py-3 text-sm text-late">{error}</p>}
          </li>
        )}
      </ol>
    </Modal>
  );
}
