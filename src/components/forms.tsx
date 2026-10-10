"use client";
// Create / edit dialogs for customers, suppliers and items, plus the
// "record payment" dialog used for both customer invoices and supplier bills.
import { useEffect, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { api, imageUrl } from "@/lib/api";
import { useSession } from "@/lib/session";
import { usePriceLevels } from "@/lib/privacy";
import { isoDay, money, n, units } from "@/lib/format";
import type { Customer, Product, Supplier } from "@/lib/types";
import { Button, Checkbox, Field, Input, Modal, Select, Textarea, useAction } from "./ui";
import { DateInPicker, dateInOf, type DateInValue } from "./DateIn";

// ---- Customer ------------------------------------------------------------------------
const emptyCustomer = {
  name: "",
  company: "",
  phone: "",
  fax: "",
  email: "",
  billingAddress: "",
  shippingAddress: "",
  fulfillment: "PICKUP" as "PICKUP" | "DELIVERY",
  deliveryNotes: "",
  priceTierCode: "AA",
  termsDays: 0,
  creditLimit: 0 as number | string,
  taxExempt: false,
  taxExemptId: "",
  cardBrand: "",
  cardLast4: "",
  cardExp: "",
  cardToken: "",
  notes: "",
};

export function CustomerForm({
  open,
  onClose,
  customer,
  initialName,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
  initialName?: string;
  onSaved: (c: Customer) => void;
}) {
  const { settings } = useSession();
  const { show: showLevels } = usePriceLevels();
  const [f, setF] = useState(emptyCustomer);
  const { busy, run } = useAction();

  useEffect(() => {
    if (!open) return;
    if (customer) {
      setF({ ...emptyCustomer, ...customer, creditLimit: n(customer.creditLimit) });
    } else {
      setF({ ...emptyCustomer, name: initialName || "", termsDays: 0 });
    }
  }, [open, customer, initialName]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  async function save() {
    const body = { ...f, creditLimit: n(f.creditLimit) };
    const saved = await run(
      () =>
        customer
          ? api<Customer>(`/customers/${customer.id}`, { method: "PUT", body })
          : api<Customer>("/customers", { body }),
      customer ? "Customer saved" : "Customer added"
    );
    if (saved) {
      onSaved(saved);
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? `Edit ${customer.name}` : "New customer"}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} busy={busy} disabled={!f.name.trim()}>Save customer</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name"><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Company"><Input value={f.company} onChange={(e) => set("company", e.target.value)} /></Field>
        <Field label="Phone"><Input type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Fax"><Input type="tel" value={f.fax} onChange={(e) => set("fax", e.target.value)} /></Field>
        <Field label="Email" className="sm:col-span-2"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Billing address"><Textarea value={f.billingAddress} onChange={(e) => set("billingAddress", e.target.value)} /></Field>
        <Field label="Delivery address" hint="Leave empty if the same as billing">
          <Textarea value={f.shippingAddress} onChange={(e) => set("shippingAddress", e.target.value)} />
        </Field>
        <Field label="Usually">
          <Select value={f.fulfillment} onChange={(e) => set("fulfillment", e.target.value as "PICKUP" | "DELIVERY")}>
            <option value="PICKUP">Picks up</option>
            <option value="DELIVERY">Gets delivery</option>
          </Select>
        </Field>
        <Field label="Delivery notes"><Input value={f.deliveryNotes} onChange={(e) => set("deliveryNotes", e.target.value)} placeholder="Gate code, call ahead…" /></Field>
        {showLevels ? (
          <Field label="Price level">
            <Select value={f.priceTierCode} onChange={(e) => set("priceTierCode", e.target.value)}>
              {settings?.priceTiers.map((t) => (
                <option key={t.code} value={t.code}>{t.code} — {t.name} (+{n(t.markupPct)}%)</option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Price level" hint="Hidden — click Price levels at the top to change it">
            <Input value="••••" disabled />
          </Field>
        )}
        <Field label="Payment terms" hint="On account: the invoice is due after this many days">
          <Select value={f.termsDays} onChange={(e) => set("termsDays", Number(e.target.value))}>
            <option value={0}>Pay at time of sale</option>
            <option value={30}>Net 30</option>
            <option value={60}>Net 60</option>
            <option value={90}>Net 90</option>
          </Select>
        </Field>
        <Field label="Credit limit" hint="0 = no limit"><Input type="number" min={0} step="0.01" value={f.creditLimit} onChange={(e) => set("creditLimit", e.target.value)} /></Field>
        <div className="flex flex-col justify-end gap-2">
          <Checkbox label="Tax exempt" checked={f.taxExempt} onChange={(v) => set("taxExempt", v)} />
          {f.taxExempt && <Input placeholder="Exemption certificate #" value={f.taxExemptId} onChange={(e) => set("taxExemptId", e.target.value)} />}
        </div>
      </div>
      <fieldset className="mt-6 rounded-lux border border-hairline px-5 py-5">
        <legend className="px-2 font-display text-lg font-semibold text-walnut">Card on file</legend>
        <p className="mb-3 text-xs text-oak">
          For safety we only keep the brand, last 4 digits, expiry, and your card processor&apos;s token — never the full card number.
        </p>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Brand"><Input value={f.cardBrand} onChange={(e) => set("cardBrand", e.target.value)} placeholder="Visa" /></Field>
          <Field label="Last 4"><Input value={f.cardLast4} inputMode="numeric" maxLength={4} onChange={(e) => set("cardLast4", e.target.value.replace(/\D/g, ""))} /></Field>
          <Field label="Expires (MM/YY)"><Input value={f.cardExp} maxLength={5} onChange={(e) => set("cardExp", e.target.value)} /></Field>
          <Field label="Processor token"><Input value={f.cardToken} onChange={(e) => set("cardToken", e.target.value)} /></Field>
        </div>
      </fieldset>
      <Field label="Notes" className="mt-4"><Textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
    </Modal>
  );
}

// ---- Supplier ------------------------------------------------------------------------
const emptySupplier = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  accountNumber: "",
  paymentTermsDays: 0, // new suppliers default to "Due on receipt"
  tradeDiscountPct: 0 as number | string,
  earlyPayDiscountPct: 0 as number | string,
  earlyPayDiscountDays: 0 as number | string,
  lateFeePct: 0 as number | string,
  lateFeeFlat: 0 as number | string,
  contractStart: "",
  contractEnd: "",
  contractNotes: "",
  rating: "" as number | string,
  notes: "",
  active: true,
};

export function SupplierForm({
  open,
  onClose,
  supplier,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  supplier?: Supplier | null;
  onSaved: (s: Supplier) => void;
}) {
  const [f, setF] = useState(emptySupplier);
  const { busy, run } = useAction();
  useEffect(() => {
    if (!open) return;
    if (supplier) {
      setF({
        ...emptySupplier,
        ...supplier,
        tradeDiscountPct: n(supplier.tradeDiscountPct),
        earlyPayDiscountPct: n(supplier.earlyPayDiscountPct),
        lateFeePct: n(supplier.lateFeePct),
        lateFeeFlat: n(supplier.lateFeeFlat),
        contractStart: supplier.contractStart ? isoDay(supplier.contractStart) : "",
        contractEnd: supplier.contractEnd ? isoDay(supplier.contractEnd) : "",
        rating: supplier.rating ?? "",
      });
    } else setF(emptySupplier);
  }, [open, supplier]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  async function save() {
    const body = {
      ...f,
      contractStart: f.contractStart || null,
      contractEnd: f.contractEnd || null,
      rating: f.rating === "" ? null : Number(f.rating),
    };
    const saved = await run(
      () => (supplier ? api<Supplier>(`/suppliers/${supplier.id}`, { method: "PUT", body }) : api<Supplier>("/suppliers", { body })),
      "Supplier saved"
    );
    if (saved) {
      onSaved(saved);
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={supplier ? `Edit ${supplier.name}` : "New supplier"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} busy={busy} disabled={!f.name.trim()}>Save supplier</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name"><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Contact person"><Input value={f.contactName} onChange={(e) => set("contactName", e.target.value)} /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Email"><Input value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Address"><Textarea value={f.address} onChange={(e) => set("address", e.target.value)} /></Field>
        <Field label="Our account number with them"><Input value={f.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} /></Field>
      </div>
      <fieldset className="mt-6 rounded-lux border border-hairline px-5 py-5">
        <legend className="px-2 font-display text-lg font-semibold text-walnut">Contract terms</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Pay within">
            <Select value={f.paymentTermsDays} onChange={(e) => set("paymentTermsDays", Number(e.target.value))}>
              <option value={0}>Due on receipt</option>
              <option value={15}>15 days</option>
              <option value={30}>30 days</option>
              <option value={45}>45 days</option>
              <option value={60}>60 days</option>
            </Select>
          </Field>
          <Field label="Discount off list price (%)" hint="Applied to every purchase">
            <Input type="number" step="0.01" min={0} max={100} value={f.tradeDiscountPct} onChange={(e) => set("tradeDiscountPct", e.target.value)} />
          </Field>
          <Field label="Rating (1–5)">
            <Input type="number" min={1} max={5} value={f.rating} onChange={(e) => set("rating", e.target.value)} />
          </Field>
          <Field label="Early-payment discount (%)"><Input type="number" step="0.01" min={0} value={f.earlyPayDiscountPct} onChange={(e) => set("earlyPayDiscountPct", e.target.value)} /></Field>
          <Field label="…if paid within (days)"><Input type="number" min={0} value={f.earlyPayDiscountDays} onChange={(e) => set("earlyPayDiscountDays", e.target.value)} /></Field>
          <div />
          <Field label="Late fee (% of balance)"><Input type="number" step="0.01" min={0} value={f.lateFeePct} onChange={(e) => set("lateFeePct", e.target.value)} /></Field>
          <Field label="Late fee (flat $)"><Input type="number" step="0.01" min={0} value={f.lateFeeFlat} onChange={(e) => set("lateFeeFlat", e.target.value)} /></Field>
          <div />
          <Field label="Contract start"><Input type="date" value={f.contractStart} onChange={(e) => set("contractStart", e.target.value)} /></Field>
          <Field label="Contract end"><Input type="date" value={f.contractEnd} onChange={(e) => set("contractEnd", e.target.value)} /></Field>
        </div>
        <Field label="Contract notes" className="mt-4"><Textarea value={f.contractNotes} onChange={(e) => set("contractNotes", e.target.value)} /></Field>
      </fieldset>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
        <Field label="Notes"><Textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        <div className="flex items-end"><Checkbox label="Active supplier" checked={f.active} onChange={(v) => set("active", v)} /></div>
      </div>
    </Modal>
  );
}

// ---- Item / product ---------------------------------------------------------------------
export function ProductForm({
  open,
  onClose,
  product,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  onSaved: (p: Product) => void;
}) {
  const { settings } = useSession();
  const { show: showLevels } = usePriceLevels();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [f, setF] = useState({
    itemCode: "",
    name: "",
    description: "",
    categoryId: "" as string | number,
    supplierId: "" as string | number,
    collection: "",
    unit: "unit",
    listPrice: "" as string | number,
    supplierDiscountPct: "" as string | number,
    unitCost: "" as string | number,
    sellPriceOverride: "" as string | number,
    taxable: true,
    reorderPoint: "" as string | number,
    reorderQty: "" as string | number,
    openingQty: "" as string | number,
  });
  // Photos: new files waiting to upload, and saved photos marked for removal
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [photoNote, setPhotoNote] = useState("");
  // "Average in" helper for the cost
  const [avg, setAvg] = useState({ qty: "", cost: "" });
  const [dateIn, setDateIn] = useState<DateInValue>(dateInOf(null));
  const { busy, run } = useAction();

  useEffect(() => {
    if (!open) return;
    api<Supplier[]>("/suppliers").then(setSuppliers).catch(() => {});
    setNewPhotos([]);
    setRemoved([]);
    setPhotoNote("");
    setAvg({ qty: "", cost: "" });
    setDateIn(dateInOf(product));
    setF({
      itemCode: product?.itemCode ?? "",
      name: product?.name ?? "",
      description: product?.description ?? "",
      categoryId: product?.categoryId ?? "",
      supplierId: product?.supplierId ?? "",
      collection: product?.collection ?? "",
      unit: product?.unit ?? "unit",
      listPrice: product ? n(product.listPrice) : "",
      supplierDiscountPct: product ? n(product.supplierDiscountPct) : "",
      unitCost: product ? n(product.unitCost) : "",
      sellPriceOverride: product?.sellPriceOverride ? n(product.sellPriceOverride) : "",
      taxable: product?.taxable ?? true,
      reorderPoint: product ? n(product.reorderPoint) : "",
      reorderQty: product ? n(product.reorderQty) : "",
      openingQty: "",
    });
  }, [open, product]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  // Price in = list price less supplier discount (unless typed directly)
  const computedCost = n(f.listPrice) * (1 - n(f.supplierDiscountPct) / 100);
  const currentCost = f.unitCost === "" ? computedCost : n(f.unitCost);

  // Weighted average: (units on hand x current cost + units bought x new cost) / all units
  const onHand = Math.max(0, n(product?.qtyOnHand));
  const avgQty = n(avg.qty);
  const averaged =
    avgQty > 0 && avg.cost !== "" ? Math.round(((onHand * currentCost + avgQty * n(avg.cost)) / (onHand + avgQty)) * 10000) / 10000 : null;

  const keptPhotos = (product?.images ?? []).filter((i) => !removed.includes(i));
  const MAX_PHOTOS = 12;
  function addPhotos(list: FileList | null) {
    if (!list) return;
    const ok = Array.from(list).filter((file) => ["image/png", "image/jpeg", "image/webp"].includes(file.type));
    const skipped = list.length - ok.length;
    const room = MAX_PHOTOS - keptPhotos.length - newPhotos.length;
    setNewPhotos((x) => [...x, ...ok.slice(0, Math.max(0, room))]);
    setPhotoNote(
      [
        skipped > 0 && `${skipped} file${skipped === 1 ? " isn't a" : "s aren't"} JPG, PNG or WebP photo${skipped === 1 ? "" : "s"} and ${skipped === 1 ? "was" : "were"} skipped.`,
        ok.length > room && `An item can have up to ${MAX_PHOTOS} photos.`,
      ]
        .filter(Boolean)
        .join(" ")
    );
  }

  async function save() {
    const form = new FormData();
    for (const [k, v] of Object.entries(f)) {
      if (k === "openingQty" && product) continue;
      if (k === "unitCost" && v === "") continue;
      form.append(k, String(v));
    }
    // Empty optional fields are sent as "null" so they can be cleared
    for (const k of ["sellPriceOverride", "categoryId", "supplierId"] as const) if (f[k] === "") form.set(k, "null");
    // Date in: old inventory, or the day it came in
    form.set("oldInventory", dateIn.old ? "true" : "false");
    form.set("dateIn", dateIn.old || !dateIn.day ? "null" : dateIn.day);
    newPhotos.forEach((file) => form.append("images", file));
    if (removed.length) form.append("removeImages", removed.join(","));
    const saved = await run(
      () =>
        product
          ? api<Product>(`/products/${product.id}`, { method: "PUT", form })
          : api<Product>("/products", { method: "POST", form }),
      "Item saved"
    );
    if (saved) {
      onSaved(saved);
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={product ? `Edit ${product.itemCode}` : "New item"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} busy={busy} disabled={!f.itemCode.trim() || !f.name.trim()}>Save item</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Item code" hint="e.g. W0930, WDC2430, AL-B09">
          <Input value={f.itemCode} onChange={(e) => set("itemCode", e.target.value.toUpperCase())} />
        </Field>
        <Field label="Name" className="sm:col-span-2"><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Category">
          <Select value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            <option value="">—</option>
            {settings?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Supplier">
          <Select value={f.supplierId} onChange={(e) => set("supplierId", e.target.value)}>
            <option value="">—</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Collection / door style"><Input value={f.collection} onChange={(e) => set("collection", e.target.value)} /></Field>
        <Field label="Description" className="sm:col-span-3"><Textarea value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
      </div>

      <fieldset className="mt-5 rounded-lux border border-hairline px-5 py-5">
        <legend className="px-2 font-display text-lg font-semibold text-walnut">Price in and price out</legend>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Supplier list price"><Input type="number" step="0.01" min={0} value={f.listPrice} onChange={(e) => set("listPrice", e.target.value)} /></Field>
          <Field label="Supplier discount (%)"><Input type="number" step="0.01" min={0} max={100} value={f.supplierDiscountPct} onChange={(e) => set("supplierDiscountPct", e.target.value)} /></Field>
          <Field label="Our cost (price in)" hint={`From list: ${money(computedCost)}`}>
            <Input type="number" step="0.01" min={0} value={f.unitCost} placeholder={computedCost.toFixed(2)} onChange={(e) => set("unitCost", e.target.value)} />
          </Field>
          <Field label="Fixed selling price" hint="Optional. Overrides price levels.">
            <Input type="number" step="0.01" min={0} value={f.sellPriceOverride} onChange={(e) => set("sellPriceOverride", e.target.value)} />
          </Field>
        </div>

        {product && (
          <div className="mt-4 rounded-lux bg-linen/70 px-4 py-4">
            <div className="text-sm font-semibold text-walnut">Average a new cost in</div>
            <p className="mt-0.5 text-sm text-oak">
              Bought more at a different price? Enter it and the cost becomes the weighted average of the{" "}
              {onHand} on hand at {money(currentCost)} and the new units.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <Field label="Units bought" className="w-32"><Input type="number" min={0} step="any" value={avg.qty} onChange={(e) => setAvg({ ...avg, qty: e.target.value })} /></Field>
              <Field label="Cost each" className="w-36"><Input type="number" min={0} step="0.01" value={avg.cost} onChange={(e) => setAvg({ ...avg, cost: e.target.value })} /></Field>
              <div className="pb-2 text-sm">
                {averaged !== null ? <>New average: <b className="num text-walnut">{money(averaged)}</b></> : <span className="text-oak">New average: —</span>}
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={averaged === null}
                onClick={() => { set("unitCost", String(averaged)); setAvg({ qty: "", cost: "" }); }}
              >
                Use this average
              </Button>
            </div>
            <p className="mt-2 text-xs text-oak">This only changes the cost. To add the units to stock, use &ldquo;Adjust stock&rdquo; or receive a purchase order — both average the cost in for you.</p>
          </div>
        )}

        {settings && showLevels && (
          <p className="mt-3 text-sm text-oak">
            Price out by level:{" "}
            {settings.priceTiers.map((t) => {
              const price = f.sellPriceOverride !== "" ? n(f.sellPriceOverride) : currentCost * (1 + n(t.markupPct) / 100);
              return (
                <span key={t.code} className="mr-3 whitespace-nowrap">
                  <b className="text-walnut">{t.code}</b> {money(price)}
                </span>
              );
            })}
          </p>
        )}
      </fieldset>

      <fieldset className="mt-5 rounded-lux border border-hairline px-5 py-5">
        <legend className="px-2 font-display text-lg font-semibold text-walnut">Stock</legend>
        <div className="grid gap-4 sm:grid-cols-4">
          {product ? (
            <div>
              <span className="mb-1.5 block text-sm font-semibold text-walnut">Units in stock</span>
              <div className="flex h-11 items-center rounded-lux border border-hairline bg-linen/60 px-3.5 font-semibold text-walnut">{units(product.qtyOnHand)}</div>
              <span className="mt-1 block text-xs text-oak">Change it with &ldquo;Adjust stock&rdquo;.</span>
            </div>
          ) : (
            <Field label="Units in stock now" hint="How many you have on hand">
              <Input type="number" min={0} step="any" placeholder="0" value={f.openingQty} onChange={(e) => set("openingQty", e.target.value)} />
            </Field>
          )}
          <DateInPicker value={dateIn} onChange={setDateIn} id="product-date-in" />
          <Field label="Reorder when at or below" hint="Units"><Input type="number" min={0} value={f.reorderPoint} onChange={(e) => set("reorderPoint", e.target.value)} /></Field>
          <Field label="Usual order quantity" hint="Units"><Input type="number" min={0} value={f.reorderQty} onChange={(e) => set("reorderQty", e.target.value)} /></Field>
        </div>
      </fieldset>
      <div className="mt-4"><Checkbox label="Charge sales tax" checked={f.taxable} onChange={(v) => set("taxable", v)} /></div>

      <fieldset className="mt-5 rounded-lux border border-hairline px-5 py-5">
        <legend className="px-2 font-display text-lg font-semibold text-walnut">Photos</legend>
        <div className="flex flex-wrap gap-3">
          {keptPhotos.map((img) => (
            <PhotoThumb key={img} src={imageUrl(img)} onRemove={() => setRemoved((r) => [...r, img])} />
          ))}
          {newPhotos.map((file, i) => (
            <PhotoThumb key={`${file.name}-${i}`} file={file} isNew onRemove={() => setNewPhotos((x) => x.filter((_, j) => j !== i))} />
          ))}
          {keptPhotos.length + newPhotos.length < MAX_PHOTOS && (
            <label className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lux border-2 border-dashed border-hairline text-sm font-semibold text-oak hover:border-brass hover:text-walnut">
              <ImagePlus size={22} aria-hidden />
              Add photos
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }}
              />
            </label>
          )}
        </div>
        <p className="mt-2 text-xs text-oak">
          Up to {MAX_PHOTOS} photos (JPG, PNG or WebP, 5 MB each). You can pick several at once, or add more one after another.
          {removed.length > 0 && ` ${removed.length} photo${removed.length === 1 ? "" : "s"} will be removed when you save.`}
        </p>
        {photoNote && <p className="mt-1 text-sm text-due">{photoNote}</p>}
      </fieldset>
    </Modal>
  );
}

function PhotoThumb({ src, file, isNew, onRemove }: { src?: string; file?: File; isNew?: boolean; onRemove: () => void }) {
  const [url, setUrl] = useState(src ?? "");
  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div className="relative h-28 w-28 overflow-hidden rounded-lux border border-hairline bg-linen">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      {isNew && <span className="absolute bottom-1 left-1 rounded-full bg-walnut px-2 py-0.5 text-[11px] font-semibold text-ivory">New</span>}
      <button
        type="button"
        aria-label="Remove photo"
        onClick={onRemove}
        className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-walnut shadow hover:bg-white hover:text-late"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ---- Payment --------------------------------------------------------------------------------
export function PaymentDialog({
  open,
  onClose,
  title,
  balance,
  discount,
  discountDeadline,
  endpoint,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  balance: number;
  /** Early-payment discount available right now (0 if none). */
  discount: number;
  discountDeadline?: string | null;
  endpoint: string;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(isoDay());
  const [takeDiscount, setTakeDiscount] = useState(true);
  const { busy, run } = useAction();

  useEffect(() => {
    if (open) {
      setAmount((balance - (discount > 0 ? discount : 0)).toFixed(2));
      setReference("");
      setTakeDiscount(true);
      setDate(isoDay());
    }
  }, [open, balance, discount]);

  async function save() {
    const ok = await run(
      () => api(endpoint, { body: { amount: Number(amount), method, reference, date, takeDiscount } }),
      "Payment recorded"
    );
    if (ok) {
      onDone();
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="success" onClick={save} busy={busy} disabled={!(Number(amount) > 0)}>Record payment</Button>
        </>
      }
    >
      <div className="mb-4 rounded-lux bg-linen px-4 py-3 text-sm">
        Balance due <b className="num">{money(balance)}</b>
        {discount > 0 && (
          <div className="mt-1 text-paid">
            Early-payment discount available: {money(discount)}
            {discountDeadline ? ` (until ${new Date(discountDeadline).toLocaleDateString()})` : ""} — pay {money(balance - discount)} to settle in full.
          </div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount"><Input type="number" step="0.01" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Paid by">
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="CASH">Cash</option>
            <option value="CREDIT">Credit card</option>
            <option value="DEBIT">Debit card</option>
            <option value="CHECK">Check</option>
            <option value="OTHER">Other</option>
          </Select>
        </Field>
        <Field label="Reference" hint="Check #, card approval code…"><Input value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      </div>
      {discount > 0 && (
        <div className="mt-4"><Checkbox label="Apply the early-payment discount" checked={takeDiscount} onChange={setTakeDiscount} /></div>
      )}
    </Modal>
  );
}
