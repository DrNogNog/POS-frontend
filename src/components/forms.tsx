"use client";
// Create / edit dialogs for customers, suppliers and items, plus the
// "record payment" dialog used for both customer invoices and supplier bills.
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { usePriceLevels } from "@/lib/privacy";
import { isoDay, money, n } from "@/lib/format";
import type { Customer, Product, Supplier } from "@/lib/types";
import { Button, Checkbox, Field, Input, Modal, Select, Textarea, useAction } from "./ui";

// ---- Customer ------------------------------------------------------------------------
const emptyCustomer = {
  name: "",
  company: "",
  phone: "",
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
        <Field label="Phone"><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
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
  paymentTermsDays: 30,
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [f, setF] = useState({
    itemCode: "",
    name: "",
    description: "",
    categoryId: "" as string | number,
    supplierId: "" as string | number,
    collection: "",
    unit: "each",
    listPrice: "" as string | number,
    supplierDiscountPct: "" as string | number,
    unitCost: "" as string | number,
    sellPriceOverride: "" as string | number,
    taxable: true,
    reorderPoint: "" as string | number,
    reorderQty: "" as string | number,
    openingQty: "" as string | number,
  });
  const [files, setFiles] = useState<FileList | null>(null);
  const { busy, run } = useAction();

  useEffect(() => {
    if (!open) return;
    api<Supplier[]>("/suppliers").then(setSuppliers).catch(() => {});
    setFiles(null);
    setF({
      itemCode: product?.itemCode ?? "",
      name: product?.name ?? "",
      description: product?.description ?? "",
      categoryId: product?.categoryId ?? "",
      supplierId: product?.supplierId ?? "",
      collection: product?.collection ?? "",
      unit: product?.unit ?? "each",
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

  async function save() {
    const form = new FormData();
    for (const [k, v] of Object.entries(f)) {
      if (k === "openingQty" && product) continue;
      if (k === "unitCost" && v === "") continue;
      form.append(k, String(v));
    }
    // Empty optional fields are sent as "null" so they can be cleared
    for (const k of ["sellPriceOverride", "categoryId", "supplierId"] as const) if (f[k] === "") form.set(k, "null");
    if (files) Array.from(files).forEach((file) => form.append("images", file));
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
        {settings && (
          <p className="mt-3 text-sm text-oak">
            Price out by level:{" "}
            {settings.priceTiers.map((t) => {
              const cost = f.unitCost === "" ? computedCost : n(f.unitCost);
              const price = f.sellPriceOverride !== "" ? n(f.sellPriceOverride) : cost * (1 + n(t.markupPct) / 100);
              return (
                <span key={t.code} className="mr-3 whitespace-nowrap">
                  <b className="text-walnut">{t.code}</b> {money(price)}
                </span>
              );
            })}
          </p>
        )}
      </fieldset>
      <div className="mt-5 grid gap-4 sm:grid-cols-4">
        <Field label="Unit"><Input value={f.unit} onChange={(e) => set("unit", e.target.value)} /></Field>
        <Field label="Reorder when at or below"><Input type="number" min={0} value={f.reorderPoint} onChange={(e) => set("reorderPoint", e.target.value)} /></Field>
        <Field label="Usual order quantity"><Input type="number" min={0} value={f.reorderQty} onChange={(e) => set("reorderQty", e.target.value)} /></Field>
        {!product && (
          <Field label="Opening stock" hint="Counted on hand now"><Input type="number" min={0} value={f.openingQty} onChange={(e) => set("openingQty", e.target.value)} /></Field>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <Checkbox label="Charge sales tax" checked={f.taxable} onChange={(v) => set("taxable", v)} />
        <label className="text-sm">
          <span className="mr-2 text-walnut">Photos</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(e) => setFiles(e.target.files)} />
        </label>
      </div>
    </Modal>
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
