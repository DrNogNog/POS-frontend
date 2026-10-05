"use client";
// -----------------------------------------------------------------------------
// New sale or estimate.
//   1. Pick (or add) the customer — their price level, terms, delivery
//      preference and card on file fill in automatically.
//   2. Add items by code or name. Prices come from the price level.
//   3. Save as an estimate (goes to Approvals) or invoice it now and take a
//      full or partial payment at the counter.
// Open with ?estimate=ID to edit an existing estimate.
// A new sale in progress is kept (per store, on this computer) when you leave
// the screen, and cleared once it's saved as an estimate or invoiced.
// -----------------------------------------------------------------------------
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useQueryParam } from "@/lib/hooks";
import { Private, usePriceLevels } from "@/lib/privacy";
import { useSession } from "@/lib/session";
import { money, n, qty, termsLabel } from "@/lib/format";
import type { Customer, Estimate, Invoice, Product } from "@/lib/types";
import { Badge, Button, Checkbox, Field, Input, PageHeader, Panel, Select, Table, Td, Textarea, Th, useAction } from "@/components/ui";
import { cn } from "@/lib/utils";
import { CustomerSearch, ProductSearch } from "@/components/pickers";
import { CustomerForm } from "@/components/forms";
import { ItemCode } from "@/components/ItemCode";

interface Line {
  key: number;
  productId: number | null;
  itemCode: string;
  description: string;
  qty: string;
  unitPrice: string;
  unitCost: number;
  sellPriceOverride: number | null;
  onHand: number | null;
  manualPrice: boolean;
  taxable: boolean;
}

let keySeq = 1;
const round2 = (x: number) => Math.round(x * 100 + Number.EPSILON) / 100;

/** Everything on the screen that makes up a sale in progress. */
interface Draft {
  customer: Customer | null;
  lines: Line[];
  tier: string;
  discountMode: "$" | "%";
  discountInput: string;
  taxRateId: string;
  billTo: string;
  shipTo: string;
  fulfillment: "PICKUP" | "DELIVERY";
  notes: string;
  termsDays: number;
  payNow: boolean;
  payAmount: string;
  payMethod: string;
  payRef: string;
  allowBackorder: boolean;
}
const draftKey = (storeId: string) => `pos.saleDraft.${storeId}`;
function readDraft(storeId: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(storeId));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}
function clearDraft(storeId: string) {
  try {
    window.localStorage.removeItem(draftKey(storeId));
  } catch {
    /* ignore */
  }
}

export default function SellPage() {
  const router = useRouter();
  const { settings, store } = useSession();
  const { show: showLevels } = usePriceLevels();
  const estimateParam = useQueryParam("estimate");
  const customerParam = useQueryParam("customer");
  const { busy, run } = useAction();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [editingCustomer, setEditingCustomer] = useState(false);

  const [lines, setLines] = useState<Line[]>([]);
  const [tier, setTier] = useState("AA");
  const [discountMode, setDiscountMode] = useState<"$" | "%">("$");
  const [discountInput, setDiscountInput] = useState("");
  const [taxRateId, setTaxRateId] = useState<string>("");
  const [billTo, setBillTo] = useState("");
  const [shipTo, setShipTo] = useState("");
  const [fulfillment, setFulfillment] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [notes, setNotes] = useState("");
  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);

  // Invoice options
  const [termsDays, setTermsDays] = useState(0);
  const [payNow, setPayNow] = useState(true);
  const [payAmount, setPayAmount] = useState(""); // empty = the full total
  const [payMethod, setPayMethod] = useState("CASH");
  const [payRef, setPayRef] = useState("");
  const [allowBackorder, setAllowBackorder] = useState(false);

  // ---- Keep the sale in progress when leaving the screen ----
  const [draftStore, setDraftStore] = useState<string | null>(null); // store whose draft is loaded
  const discarded = useRef(false);
  function applyDraft(d: Draft | null) {
    setCustomer(d?.customer ?? null);
    const ls = d?.lines ?? [];
    keySeq = Math.max(keySeq, ...ls.map((l) => l.key + 1));
    setLines(ls);
    setTier(d?.tier ?? "AA");
    setDiscountMode(d?.discountMode ?? "$");
    setDiscountInput(d?.discountInput ?? "");
    setTaxRateId(d?.taxRateId ?? "");
    setBillTo(d?.billTo ?? "");
    setShipTo(d?.shipTo ?? "");
    setFulfillment(d?.fulfillment ?? "PICKUP");
    setNotes(d?.notes ?? "");
    setTermsDays(d?.termsDays ?? 0);
    setPayNow(d?.payNow ?? true);
    setPayAmount(d?.payAmount ?? "");
    setPayMethod(d?.payMethod ?? "CASH");
    setPayRef(d?.payRef ?? "");
    setAllowBackorder(d?.allowBackorder ?? false);
  }
  useEffect(() => {
    if (!store) return;
    if (new URLSearchParams(window.location.search).get("estimate")) return; // editing an estimate, not a new sale
    discarded.current = false;
    applyDraft(readDraft(store.id));
    setDraftStore(store.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id]);
  const draft: Draft = {
    customer, lines, tier, discountMode, discountInput, taxRateId, billTo, shipTo, fulfillment, notes,
    termsDays, payNow, payAmount, payMethod, payRef, allowBackorder,
  };
  const draftJson = JSON.stringify(draft);
  useEffect(() => {
    if (!draftStore || draftStore !== store?.id || discarded.current) return;
    try {
      window.localStorage.setItem(draftKey(draftStore), draftJson);
    } catch {
      /* storage full or blocked — the sale just won't be kept */
    }
  }, [draftJson, draftStore, store?.id]);
  function startOver() {
    if (store) clearDraft(store.id);
    applyDraft(null);
    const def = settings?.taxRates.find((t) => t.isDefault) ?? settings?.taxRates[0];
    if (def) setTaxRateId(String(def.id));
  }

  const markupFor = (code: string) => n(settings?.priceTiers.find((t) => t.code === code)?.markupPct);
  const priceFor = (cost: number, override: number | null, code = tier) =>
    override && override > 0 ? override : round2(cost * (1 + markupFor(code) / 100));

  // Default tax rate
  useEffect(() => {
    if (settings && !taxRateId) {
      const def = settings.taxRates.find((t) => t.isDefault) ?? settings.taxRates[0];
      if (def) setTaxRateId(String(def.id));
    }
  }, [settings, taxRateId]);

  // Start a sale for a customer (from their page)
  useEffect(() => {
    if (!customerParam || !settings || !draftStore) return;
    api<Customer>(`/customers/${customerParam}`).then(chooseCustomer).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerParam, settings, draftStore]);

  // Load an estimate to edit
  useEffect(() => {
    if (!estimateParam) return;
    api<Estimate & { customer: Customer | null }>(`/estimates/${estimateParam}`).then((est) => {
      setEditingEstimate(est);
      if (est.customer) setCustomer(est.customer);
      setTier(est.priceTierCode);
      setBillTo(est.billTo);
      setShipTo(est.shipTo);
      setFulfillment(est.fulfillment);
      setNotes(est.notes);
      setDiscountMode("$");
      setDiscountInput(n(est.discountAmount) ? String(n(est.discountAmount)) : "");
      const rate = settings?.taxRates.find((t) => n(t.ratePct) === n(est.taxRatePct));
      if (rate) setTaxRateId(String(rate.id));
      const estLines: Line[] = (est.lines ?? []).map((l) => ({
        key: keySeq++,
        productId: l.productId,
        itemCode: l.itemCode,
        description: l.description,
        qty: String(n(l.qty)),
        unitPrice: n(l.unitPrice).toFixed(2),
        unitCost: 0,
        sellPriceOverride: null,
        onHand: null,
        manualPrice: true, // keep the quoted prices until the level is changed
        taxable: true,
      }));
      setLines(estLines);
      // Fill in cost, stock and taxable from the items so a level change can reprice them
      estLines.forEach((l) => {
        if (!l.productId) return;
        api<Product>(`/products/${l.productId}`)
          .then((p) =>
            update(l.key, {
              unitCost: n(p.unitCost),
              sellPriceOverride: p.sellPriceOverride === null ? null : n(p.sellPriceOverride),
              onHand: n(p.qtyOnHand),
              taxable: p.taxable,
            })
          )
          .catch(() => {});
      });
    });
  }, [estimateParam, settings]);

  function chooseCustomer(c: Customer) {
    setCustomer(c);
    setTier(c.priceTierCode || "AA");
    setTermsDays(c.termsDays);
    setPayNow(c.termsDays === 0);
    setFulfillment(c.fulfillment);
    setBillTo([c.company || c.name, c.company ? c.name : "", c.billingAddress, c.phone].filter(Boolean).join("\n"));
    setShipTo(c.shippingAddress || "");
    if (c.taxExempt) {
      const exempt = settings?.taxRates.find((t) => n(t.ratePct) === 0);
      if (exempt) setTaxRateId(String(exempt.id));
    }
    reprice(c.priceTierCode || "AA");
  }

  /** Price every catalog item at a level. Custom lines keep the price typed in. */
  function reprice(code: string) {
    setLines((ls) =>
      ls.map((l) =>
        l.productId && (l.unitCost > 0 || l.sellPriceOverride)
          ? { ...l, unitPrice: priceFor(l.unitCost, l.sellPriceOverride, code).toFixed(2), manualPrice: false }
          : l
      )
    );
  }

  function changeTier(code: string) {
    setTier(code);
    reprice(code);
  }

  function addProduct(p: Product) {
    setLines((ls) => {
      const existing = ls.find((l) => l.productId === p.id);
      if (existing) return ls.map((l) => (l === existing ? { ...l, qty: String(n(l.qty) + 1) } : l));
      const cost = n(p.unitCost);
      const override = p.sellPriceOverride === null ? null : n(p.sellPriceOverride);
      return [
        ...ls,
        {
          key: keySeq++,
          productId: p.id,
          itemCode: p.itemCode,
          description: p.name,
          qty: "1",
          unitPrice: priceFor(cost, override).toFixed(2),
          unitCost: cost,
          sellPriceOverride: override,
          onHand: n(p.qtyOnHand),
          manualPrice: false,
          taxable: p.taxable,
        },
      ];
    });
  }

  function addCustomLine() {
    setLines((ls) => [
      ...ls,
      { key: keySeq++, productId: null, itemCode: "", description: "", qty: "1", unitPrice: "", unitCost: 0, sellPriceOverride: null, onHand: null, manualPrice: true, taxable: true },
    ]);
  }

  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  // ---- Totals (same rules as the server) ----
  const taxRate = n(settings?.taxRates.find((t) => String(t.id) === taxRateId)?.ratePct);
  const totals = useMemo(() => {
    const subtotal = round2(lines.reduce((s, l) => s + round2(n(l.qty) * n(l.unitPrice)), 0));
    const discountPct = Math.min(100, Math.max(0, n(discountInput)));
    const discount = Math.min(subtotal, Math.max(0, discountMode === "%" ? round2((subtotal * discountPct) / 100) : n(discountInput)));
    // Same rule as the server: tax only taxable lines, after their share of the discount
    const taxable = round2(lines.reduce((s, l) => (l.taxable ? s + round2(n(l.qty) * n(l.unitPrice)) : s), 0));
    const taxableBase = subtotal > 0 ? round2(taxable - (discount * taxable) / subtotal) : 0;
    const tax = round2((taxableBase * taxRate) / 100);
    const cost = round2(lines.reduce((s, l) => s + n(l.qty) * l.unitCost, 0));
    return { subtotal, discount, discountPct, tax, total: round2(subtotal - discount + tax), cost };
  }, [lines, discountMode, discountInput, taxRate]);
  const paying = payNow ? (payAmount.trim() === "" ? totals.total : round2(n(payAmount))) : 0;
  const payTooMuch = payNow && paying > totals.total + 0.004;
  const short = lines.filter((l) => l.productId && l.onHand !== null && n(l.qty) > l.onHand);

  function body() {
    return {
      customerId: customer?.id,
      billTo,
      shipTo,
      fulfillment,
      priceTierCode: tier,
      discountAmount: totals.discount,
      taxRatePct: taxRate,
      notes,
      lines: lines
        .filter((l) => n(l.qty) > 0 && (l.productId || l.description))
        .map((l) => ({ productId: l.productId, itemCode: l.itemCode, description: l.description, qty: n(l.qty), unitPrice: n(l.unitPrice) })),
    };
  }

  async function saveEstimate() {
    const est = await run(
      () =>
        editingEstimate
          ? api<Estimate>(`/estimates/${editingEstimate.id}`, { method: "PUT", body: body() })
          : api<Estimate>("/estimates", { body: body() }),
      "Estimate saved"
    );
    if (est) {
      if (!editingEstimate && store) {
        discarded.current = true;
        clearDraft(store.id);
      }
      router.push(`/estimates?open=${est.id}`);
    }
  }

  async function invoiceNow() {
    const inv = await run(
      () =>
        api<Invoice>("/invoices", {
          body: {
            ...body(),
            termsDays,
            allowBackorder,
            payment: payNow && paying > 0 ? { amount: paying, method: payMethod, reference: payRef } : null,
          },
        }),
      "Invoice created"
    );
    if (inv) {
      if (store) {
        discarded.current = true;
        clearDraft(store.id);
      }
      router.push(`/invoices/${inv.id}`);
    }
  }

  const hasLines = lines.some((l) => n(l.qty) > 0 && (l.productId || l.description.trim()));
  const canSave = !!customer && hasLines;
  const whyNot = !customer ? "Pick or add a customer first." : !hasLines ? "Add at least one item." : "";

  return (
    <>
      <PageHeader
        title={editingEstimate ? `Edit estimate ${editingEstimate.estimateNo}` : "New sale or estimate"}
        subtitle="Pick the customer, add items, then save an estimate or invoice now."
        actions={
          !editingEstimate && (customer || lines.length > 0) && (
            <Button variant="ghost" onClick={startOver}><RotateCcw size={16} /> Start over</Button>
          )
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel title="Customer" className={!customer ? "ring-2 ring-brass/40" : undefined}>
            {customer ? (
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-walnut">{customer.name}</div>
                  <div className="text-sm text-oak">{[customer.company, customer.phone, customer.email].filter(Boolean).join(" · ")}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Private><Badge>Price level {customer.priceTierCode}</Badge></Private>
                    <Badge>{termsLabel(customer.termsDays)}</Badge>
                    <Badge>{customer.fulfillment === "DELIVERY" ? "Delivery" : "Pickup"}</Badge>
                    {customer.taxExempt && <Badge tone="due">Tax exempt</Badge>}
                    {customer.cardLast4 && <Badge tone="paid">{customer.cardBrand || "Card"} ••{customer.cardLast4} on file</Badge>}
                    {n(customer.balance) > 0 && <Badge tone="late">Owes {money(customer.balance)}</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setEditingCustomer(true)}>Edit details</Button>
                  <Button size="sm" variant="ghost" onClick={() => setCustomer(null)}>Change customer</Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <CustomerSearch
                  onPick={chooseCustomer}
                  onCreate={(name) => {
                    setNewCustomerName(name);
                    setCustomerFormOpen(true);
                  }}
                />
                <Button variant="secondary" onClick={() => { setNewCustomerName(""); setCustomerFormOpen(true); }}>New customer</Button>
                <p className="text-sm text-oak sm:col-span-2">Every sale needs a customer. For a walk-in, click &ldquo;New customer&rdquo; — a name and phone number is enough.</p>
              </div>
            )}
          </Panel>

          <Panel title="Items" padded={false} actions={<Button size="sm" variant="ghost" onClick={addCustomLine}><Plus size={16} /> Custom line</Button>}>
            <div className="p-4"><ProductSearch onPick={addProduct} autoFocus /></div>
            <Table>
              <thead>
                <tr>
                  <Th>Code</Th>
                  <Th>Description</Th>
                  <Th className="w-24 text-right">Qty</Th>
                  <Th className="w-32 text-right">Price each</Th>
                  <Th className="text-right">Amount</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 && (
                  <tr><Td colSpan={6} className="py-8 text-center text-oak">Search above to add the first item.</Td></tr>
                )}
                {lines.map((l) => {
                  const margin = n(l.unitPrice) > 0 && l.unitCost > 0 ? ((n(l.unitPrice) - l.unitCost) / n(l.unitPrice)) * 100 : null;
                  return (
                    <tr key={l.key}>
                      <Td>
                        {l.productId ? (
                          <ItemCode code={l.itemCode} productId={l.productId} />
                        ) : (
                          <Input className="h-9 w-28" placeholder="Code" value={l.itemCode} onChange={(e) => update(l.key, { itemCode: e.target.value.toUpperCase() })} />
                        )}
                      </Td>
                      <Td>
                        <Input className="h-9" value={l.description} onChange={(e) => update(l.key, { description: e.target.value })} />
                        {l.productId && l.onHand !== null && (
                          <div className={`mt-1 text-xs ${n(l.qty) > l.onHand ? "text-late" : "text-oak"}`}>
                            {qty(l.onHand)} on hand
                            {showLevels && l.unitCost > 0 && ` · cost ${money(l.unitCost)}`}
                            {showLevels && margin !== null && ` · margin ${margin.toFixed(0)}%`}
                          </div>
                        )}
                      </Td>
                      <Td><Input className="num h-9" type="number" min={0} step="any" value={l.qty} onChange={(e) => update(l.key, { qty: e.target.value })} /></Td>
                      <Td><Input className="num h-9" type="number" min={0} step="0.01" value={l.unitPrice} onChange={(e) => update(l.key, { unitPrice: e.target.value, manualPrice: true })} /></Td>
                      <Td className="num pt-4 font-medium">{money(n(l.qty) * n(l.unitPrice))}</Td>
                      <Td>
                        <button aria-label="Remove line" className="rounded-full p-2 text-oak hover:bg-linen hover:text-late" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                          <Trash2 size={16} />
                        </button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Panel>

          <Panel title="Addresses and notes">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bill to"><Textarea value={billTo} onChange={(e) => setBillTo(e.target.value)} /></Field>
              <Field label={fulfillment === "DELIVERY" ? "Deliver to" : "Ship to (optional)"}><Textarea value={shipTo} onChange={(e) => setShipTo(e.target.value)} /></Field>
              <Field label="Notes on the document" className="sm:col-span-2"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Pricing">
            <div className="space-y-4">
              <Private fallback={<p className="text-sm text-oak">Price level is hidden. Click &ldquo;Price levels&rdquo; at the top to see or change it.</p>}>
                <Field label="Price level">
                  <Select value={tier} onChange={(e) => changeTier(e.target.value)}>
                    {settings?.priceTiers.map((t) => (
                      <option key={t.code} value={t.code}>{t.code} — {t.name} (cost +{n(t.markupPct)}%)</option>
                    ))}
                  </Select>
                </Field>
              </Private>
              <div>
                <span className="mb-1.5 block text-sm font-semibold text-walnut">Discount on this order</span>
                <div className="flex gap-2">
                  <div role="radiogroup" aria-label="Discount type" className="inline-flex h-11 shrink-0 overflow-hidden rounded-lux border border-hairline bg-white">
                    {(["$", "%"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={discountMode === m}
                        aria-label={m === "$" ? "Dollar amount" : "Percent"}
                        onClick={() => setDiscountMode(m)}
                        className={cn(
                          "w-12 text-base font-semibold",
                          discountMode === m ? "bg-walnut text-ivory" : "text-walnut hover:bg-linen"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <Input
                    aria-label={discountMode === "%" ? "Discount percent" : "Discount amount"}
                    type="number"
                    min={0}
                    max={discountMode === "%" ? 100 : undefined}
                    step={discountMode === "%" ? "any" : "0.01"}
                    placeholder={discountMode === "%" ? "e.g. 10" : "0.00"}
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                  />
                </div>
              </div>
              <Field label="Sales tax">
                <Select value={taxRateId} onChange={(e) => setTaxRateId(e.target.value)}>
                  {settings?.taxRates.filter((t) => t.active).map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({n(t.ratePct)}%)</option>
                  ))}
                </Select>
              </Field>
              <Field label="Fulfillment">
                <Select value={fulfillment} onChange={(e) => setFulfillment(e.target.value as "PICKUP" | "DELIVERY")}>
                  <option value="PICKUP">Customer pickup</option>
                  <option value="DELIVERY">Delivery</option>
                </Select>
              </Field>
            </div>
            <dl className="mt-6 space-y-1 border-t border-hairline pt-4 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="num">{money(totals.subtotal)}</dd></div>
              {totals.discount > 0 && (
                <div className="flex justify-between">
                  <dt>Discount{discountMode === "%" && ` (${totals.discountPct}%)`}</dt>
                  <dd className="num">−{money(totals.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between"><dt>Tax ({taxRate}%)</dt><dd className="num">{money(totals.tax)}</dd></div>
              <div className="flex justify-between pt-2 text-xl font-semibold text-walnut"><dt>Total</dt><dd className="num">{money(totals.total)}</dd></div>
              {showLevels && totals.cost > 0 && (
                <div className="flex justify-between pt-1 text-xs text-oak">
                  <dt>Our cost / profit</dt>
                  <dd className="num">{money(totals.cost)} / {money(totals.subtotal - totals.discount - totals.cost)}</dd>
                </div>
              )}
            </dl>
          </Panel>

          <Panel title="Save as estimate">
            <p className="mb-3 text-sm text-oak">Send the customer a quote. Approve it later on the Approvals screen to turn it into an invoice.</p>
            <Button variant="secondary" className="w-full" onClick={saveEstimate} busy={busy} disabled={!canSave}>
              {editingEstimate ? "Save changes to estimate" : "Save estimate"}
            </Button>
            {whyNot && <p className="mt-2 text-sm text-oak">{whyNot}</p>}
          </Panel>

          {!editingEstimate && (
            <Panel title="Invoice now">
              <div className="space-y-4">
                <Field label="Payment terms">
                  <Select value={termsDays} onChange={(e) => { const d = Number(e.target.value); setTermsDays(d); setPayNow(d === 0); setPayAmount(""); }}>
                    <option value={0}>Pay now</option>
                    <option value={30}>Net 30 (on account)</option>
                    <option value={60}>Net 60 (on account)</option>
                    <option value={90}>Net 90 (on account)</option>
                  </Select>
                </Field>
                <Checkbox label="Partial payment now" checked={payNow} onChange={setPayNow} />
                {payNow && (
                  <div className="space-y-3">
                    <Field label="Amount paid now" hint={`Leave empty for the full ${money(totals.total)}. Anything less stays on the customer's account.`}>
                      <Input
                        className="num text-left"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder={totals.total.toFixed(2)}
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                      />
                    </Field>
                    {payTooMuch && <p className="text-sm text-late">That&apos;s more than the total of {money(totals.total)}.</p>}
                    {!payTooMuch && paying < totals.total && (
                      <p className="text-sm text-oak">
                        Paying <span className="num">{money(paying)}</span> now · <span className="num">{money(totals.total - paying)}</span> left to pay
                      </p>
                    )}
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} aria-label="Payment method">
                      <option value="CASH">Cash</option>
                      <option value="CREDIT">Credit card</option>
                      <option value="DEBIT">Debit card</option>
                      <option value="CHECK">Check</option>
                    </Select>
                    <Input placeholder="Reference" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
                  </div>
                  </div>
                )}
                {short.length > 0 && (
                  <div className="rounded-lux bg-late/5 px-4 py-3 text-sm text-late">
                    Not enough stock for {short.map((l) => l.itemCode).join(", ")}.
                    <div className="mt-2"><Checkbox label="Special order — sell anyway" checked={allowBackorder} onChange={setAllowBackorder} /></div>
                  </div>
                )}
                <Button className="w-full" onClick={invoiceNow} busy={busy} disabled={!canSave || payTooMuch || (short.length > 0 && !allowBackorder)}>
                  Create invoice
                </Button>
                {whyNot && <p className="text-sm text-oak">{whyNot}</p>}
              </div>
            </Panel>
          )}
        </div>
      </div>

      <CustomerForm
        open={customerFormOpen}
        onClose={() => setCustomerFormOpen(false)}
        initialName={newCustomerName}
        onSaved={(c) => chooseCustomer(c)}
      />
      <CustomerForm
        open={editingCustomer}
        onClose={() => setEditingCustomer(false)}
        customer={customer}
        onSaved={(c) => setCustomer({ ...customer!, ...c })}
      />
    </>
  );
}
