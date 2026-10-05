"use client";
// Store settings: details printed on documents, costing method, customer
// terms / late fees / A/R thresholds, price levels, tax rates, users.
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { n } from "@/lib/format";
import type { PriceTier, StoreSettings, TaxRate, User } from "@/lib/types";
import { Badge, Button, Checkbox, Field, Input, Loading, Modal, PageHeader, Panel, Select, Table, Tabs, Td, Th, useAction } from "@/components/ui";

type Tab = "store" | "money" | "tiers" | "tax" | "users";

export default function SettingsPage() {
  const { settings, reloadSettings, store, can } = useSession();
  const [tab, setTab] = useState<Tab>("store");
  if (!settings) return <Loading />;
  return (
    <>
      <PageHeader title="Settings" subtitle={`These settings apply to ${store?.name ?? "this store"} only. Each store has its own.`} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "store", label: "Store details" },
          { value: "money", label: "Terms, fees & costing" },
          { value: "tiers", label: "Price levels" },
          { value: "tax", label: "Sales tax" },
          ...(can() ? [{ value: "users" as Tab, label: "Users" }] : []),
        ]}
      />
      {tab === "store" && <StoreForm settings={settings.settings} onSaved={reloadSettings} />}
      {tab === "money" && <MoneyForm settings={settings.settings} onSaved={reloadSettings} />}
      {tab === "tiers" && <TiersForm tiers={settings.priceTiers} onSaved={reloadSettings} />}
      {tab === "tax" && <TaxForm rates={settings.taxRates} onSaved={reloadSettings} />}
      {tab === "users" && <Users />}
    </>
  );
}

function useSettingsForm(settings: StoreSettings, onSaved: () => Promise<void>) {
  const [f, setF] = useState<Record<string, string | number>>({ ...settings } as never);
  useEffect(() => setF({ ...settings } as never), [settings]);
  const { busy, run } = useAction();
  const save = async (keys: string[]) => {
    const body = Object.fromEntries(keys.map((k) => [k, f[k]]));
    if (await run(() => api("/settings", { method: "PUT", body }), "Settings saved")) await onSaved();
  };
  const input = (k: string, label: string, props: Record<string, unknown> = {}) => (
    <Field label={label}>
      <Input value={String(f[k] ?? "")} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} />
    </Field>
  );
  return { f, setF, busy, save, input };
}

const STORE_KEYS = ["name", "address", "city", "state", "zip", "phone", "fax", "email", "website", "invoicePrefix", "estimatePrefix", "poPrefix"];
function StoreForm({ settings, onSaved }: { settings: StoreSettings; onSaved: () => Promise<void> }) {
  const { busy, save, input } = useSettingsForm(settings, onSaved);
  return (
    <Panel title="Printed on estimates, invoices and purchase orders" className="max-w-3xl">
      <div className="grid gap-4 sm:grid-cols-2">
        {input("name", "Store name")}
        {input("phone", "Phone")}
        {input("address", "Street address")}
        {input("fax", "Fax")}
        {input("city", "City")}
        {input("email", "Email")}
        {input("state", "State")}
        {input("website", "Website")}
        {input("zip", "ZIP")}
        <div />
        {input("invoicePrefix", "Invoice number prefix")}
        {input("estimatePrefix", "Estimate number prefix")}
        {input("poPrefix", "Purchase order prefix")}
      </div>
      <Button className="mt-5" busy={busy} onClick={() => save(STORE_KEYS)}>Save store details</Button>
    </Panel>
  );
}

const MONEY_KEYS = ["costingMethod", "defaultCustomerTermsDays", "earlyPayDiscountPct", "earlyPayDiscountDays", "lateFeePct", "lateFeeFlat", "collectionsAfterDays", "arHighDso", "arLowDso"];
function MoneyForm({ settings, onSaved }: { settings: StoreSettings; onSaved: () => Promise<void> }) {
  const { f, setF, busy, save, input } = useSettingsForm(settings, onSaved);
  const num = { type: "number", min: 0, step: "any" };
  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
      <Panel title="Inventory costing">
        <Field label="Cost of goods sold uses" hint="Pick one and keep it. Ask your accountant before changing.">
          <Select value={String(f.costingMethod)} onChange={(e) => setF({ ...f, costingMethod: e.target.value })}>
            <option value="FIFO">FIFO — oldest stock sells first</option>
            <option value="LIFO">LIFO — newest stock sells first</option>
            <option value="WAC">Weighted average cost</option>
          </Select>
        </Field>
      </Panel>
      <Panel title="Customer terms (accounts receivable)">
        <div className="grid gap-4 sm:grid-cols-2">
          {input("earlyPayDiscountPct", "Early-payment discount (%)", num)}
          {input("earlyPayDiscountDays", "…if paid within (days)", num)}
          {input("lateFeePct", "Late fee (% of balance)", num)}
          {input("lateFeeFlat", "Late fee (flat $)", num)}
          {input("collectionsAfterDays", "Suggest collections after (days late)", num)}
        </div>
        <p className="mt-3 text-xs text-oak">The early-payment discount is offered on invoices with 30/60/90-day terms (e.g. 2/10 net 30).</p>
      </Panel>
      <Panel title="A/R health board">
        <div className="grid gap-4 sm:grid-cols-2">
          {input("arHighDso", "Too high above (days to get paid)", num)}
          {input("arLowDso", "Too low below (days to get paid)", num)}
        </div>
      </Panel>
      <div className="lg:col-span-2"><Button busy={busy} onClick={() => save(MONEY_KEYS)}>Save</Button></div>
    </div>
  );
}

function TiersForm({ tiers, onSaved }: { tiers: PriceTier[]; onSaved: () => Promise<void> }) {
  const [rows, setRows] = useState(tiers.map((t) => ({ ...t, markupPct: String(n(t.markupPct)) })));
  useEffect(() => setRows(tiers.map((t) => ({ ...t, markupPct: String(n(t.markupPct)) }))), [tiers]);
  const { busy, run } = useAction();
  const set = (i: number, k: string, v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <Panel title="Price levels" className="max-w-3xl" padded={false}>
      <p className="p-5 pb-0 text-sm text-oak">Price out = our cost × (1 + markup). Each customer is assigned a level.</p>
      <Table>
        <thead><tr><Th>Level</Th><Th>Name</Th><Th className="text-right">Markup on cost %</Th><Th>Example: $100 cost</Th><Th>Description</Th></tr></thead>
        <tbody>
          {rows.map((t, i) => (
            <tr key={t.code}>
              <Td className="font-semibold text-walnut">{t.code}</Td>
              <Td><Input className="h-9" value={t.name} onChange={(e) => set(i, "name", e.target.value)} /></Td>
              <Td><Input className="num h-9 w-28" type="number" min={0} step="0.1" value={t.markupPct} onChange={(e) => set(i, "markupPct", e.target.value)} /></Td>
              <Td className="num">${(100 * (1 + n(t.markupPct) / 100)).toFixed(2)}</Td>
              <Td><Input className="h-9" value={t.description} onChange={(e) => set(i, "description", e.target.value)} /></Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="p-5">
        <Button busy={busy} onClick={async () => { if (await run(() => api("/settings/price-tiers", { method: "PUT", body: rows }), "Price levels saved")) await onSaved(); }}>Save price levels</Button>
      </div>
    </Panel>
  );
}

function TaxForm({ rates, onSaved }: { rates: TaxRate[]; onSaved: () => Promise<void> }) {
  const [edit, setEdit] = useState<Partial<TaxRate> | null>(null);
  const { busy, run } = useAction();
  async function save() {
    const body = { name: edit!.name, ratePct: Number(edit!.ratePct), isDefault: !!edit!.isDefault, active: edit!.active ?? true };
    const ok = await run(() => (edit!.id ? api(`/settings/tax-rates/${edit!.id}`, { method: "PUT", body }) : api("/settings/tax-rates", { body })), "Tax rate saved");
    if (ok) {
      setEdit(null);
      await onSaved();
    }
  }
  return (
    <Panel title="Sales tax rates for this store" className="max-w-3xl" padded={false} actions={<Button size="sm" onClick={() => setEdit({ name: "", ratePct: "", isDefault: false, active: true })}>Add rate</Button>}>
      <Table>
        <thead><tr><Th>Name</Th><Th className="text-right">Rate</Th><Th /><Th /></tr></thead>
        <tbody>
          {rates.map((r) => (
            <tr key={r.id}>
              <Td>{r.name}</Td>
              <Td className="num">{n(r.ratePct)}%</Td>
              <Td>{r.isDefault && <Badge tone="info">Default</Badge>} {!r.active && <Badge>Off</Badge>}</Td>
              <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => setEdit({ ...r, ratePct: String(n(r.ratePct)) })}>Edit</Button></Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit tax rate" : "New tax rate"} footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button busy={busy} onClick={save}>Save</Button></>}>
        {edit && (
          <div className="space-y-4">
            <Field label="Name"><Input value={String(edit.name ?? "")} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Rate (%)"><Input type="number" step="0.001" min={0} value={String(edit.ratePct ?? "")} onChange={(e) => setEdit({ ...edit, ratePct: e.target.value })} /></Field>
            <Checkbox label="Default for new sales" checked={!!edit.isDefault} onChange={(v) => setEdit({ ...edit, isDefault: v })} />
            <Checkbox label="Active" checked={edit.active ?? true} onChange={(v) => setEdit({ ...edit, active: v })} />
          </div>
        )}
      </Modal>
    </Panel>
  );
}

function Users() {
  const { data, reload } = useApi<User[]>("/auth/users");
  const [edit, setEdit] = useState<(Partial<User> & { password?: string }) | null>(null);
  const { busy, run } = useAction();
  async function save() {
    const body = { email: edit!.email, name: edit!.name, role: edit!.role, active: edit!.active ?? true, ...(edit!.password ? { password: edit!.password } : {}) };
    const ok = await run(() => (edit!.id ? api(`/auth/users/${edit!.id}`, { method: "PUT", body }) : api("/auth/users", { body })), "User saved");
    if (ok) {
      setEdit(null);
      await reload();
    }
  }
  return (
    <Panel title="People who can log in to this store" className="max-w-3xl" padded={false} actions={<Button size="sm" onClick={() => setEdit({ role: "CASHIER", active: true })}>Add user</Button>}>
      <p className="px-5 pt-4 text-sm text-oak">
        Owner: everything. Manager: everything except users. Accountant: books, receivables, payables, payroll. Cashier: sales and customers.
        To use the other store, add the same email there too.
      </p>
      <Table>
        <thead><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th /></tr></thead>
        <tbody>
          {data?.map((u) => (
            <tr key={u.id}>
              <Td>{u.name} {!u.active && <Badge>Disabled</Badge>}</Td>
              <Td>{u.email}</Td>
              <Td>{u.role.toLowerCase()}</Td>
              <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => setEdit(u)}>Edit</Button></Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit user" : "New user"} footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button busy={busy} onClick={save}>Save</Button></>}>
        {edit && (
          <div className="space-y-4">
            <Field label="Name"><Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={edit.email ?? ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
            <Field label="Role">
              <Select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as User["role"] })}>
                <option value="CASHIER">Cashier</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="MANAGER">Manager</option>
                <option value="OWNER">Owner</option>
              </Select>
            </Field>
            <Field label={edit.id ? "New password (leave empty to keep)" : "Password"} hint="At least 8 characters">
              <Input type="password" autoComplete="new-password" value={edit.password ?? ""} onChange={(e) => setEdit({ ...edit, password: e.target.value })} />
            </Field>
            <Checkbox label="Can log in" checked={edit.active ?? true} onChange={(v) => setEdit({ ...edit, active: v })} />
          </div>
        )}
      </Modal>
    </Panel>
  );
}
