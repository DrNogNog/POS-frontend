"use client";
// Clickable item code. Click it to see what the code means
// (e.g. W0930 = Wall Cabinet, 9" wide x 30" high, single door, 2 shelves).
import { useState } from "react";
import Link from "next/link";
import { decodeItemCode } from "@/lib/itemCodes";
import { Modal } from "./ui";

export function CodeExplanation({ code }: { code: string }) {
  const d = decodeItemCode(code);
  if (!d.recognized) {
    return <p className="text-oak">This code isn&apos;t in the cabinet code guide. Use the item&apos;s description instead.</p>;
  }
  const rows: [string, string | number | null][] = [
    ["Type", d.typeName],
    ["Collection / door style", d.collection],
    ["Width", d.widthIn ? `${d.widthIn}"` : null],
    ["Height", d.heightIn ? `${d.heightIn}"` : null],
    ["Depth", d.depthIn ? `${d.depthIn}"` : null],
    ["Doors", d.doors],
    ["Shelves", d.shelves],
    ["Drawers", d.drawers],
  ];
  return (
    <div>
      <p className="mb-4 text-lg font-medium text-walnut">{d.summary}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        {rows
          .filter(([, v]) => v !== null && v !== "")
          .map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-oak">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
      </dl>
      {d.notes.length > 0 && (
        <ul className="mt-4 list-disc pl-5 text-sm text-oak">
          {d.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ItemCode({ code, productId }: { code: string; productId?: number | null }) {
  const [open, setOpen] = useState(false);
  if (!code) return <span className="text-oak">—</span>;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="What does this code mean?"
        className="whitespace-nowrap rounded border border-hairline bg-linen px-1.5 py-0.5 font-semibold tracking-wide text-walnut hover:border-oak hover:bg-white"
      >
        {code}
      </button>
      <Modal open={open} title={code} onClose={() => setOpen(false)}>
        <CodeExplanation code={code} />
        {productId ? (
          <Link href={`/products/${productId}`} className="mt-5 inline-block text-sm font-medium text-walnut underline">
            Open this item&apos;s stock and prices
          </Link>
        ) : null}
      </Modal>
    </>
  );
}
