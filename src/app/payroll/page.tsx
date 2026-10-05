"use client";
// Payroll: employees and pay runs. Gross pay is calculated from hours or
// salary; enter withholdings from your payroll provider, then post to the books.
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { date, isoDay, money, n } from "@/lib/format";
import { Badge, Button, Checkbox, Empty, ErrorNote, Field, Input, Loading, Modal, PageHeader, Panel, Select, Table, Tabs, Td, Textarea, Th, useAction } from "@/components/ui";

interface Employee {
  id: number;
  name: string;
  title: string;
  email: string;
  phone: string;
  payType: "HOURLY" | "SALARY";
  payRate: string;
  payFrequency: string;
  hireDate: string | null;
  active: boolean;
  notes: string;
}
interface Check {
  employeeId: number;
  name?: string;
  employee?: { name: string };
  regularHours: number | string;
  overtimeHours: number | string;
  grossPay: number | string;
  federalTax: number | string;
  stateTax: number | string;
  socialSecurity: number | string;
  medicare: number | string;
  otherDeductions: number | string;
  employerTaxes: number | string;
  netPay?: number | string;
}
interface Run { id: number; periodStart: string; periodEnd: string; payDate: string; status: "DRAFT" | "POSTED"; totalGross: string; totalNet: string; totalEmployerTax: string; paychecks: Check[] }

const FREQ: Record<string, string> = { WEEKLY: "Weekly", BIWEEKLY: "Every 2 weeks", SEMIMONTHLY: "Twice a month", MONTHLY: "Monthly" };

export default function PayrollPage() {
  const [tab, setTab] = useState<"runs" | "employees">("runs");
  const employees = useApi<Employee[]>("/payroll/employees");
  const runs = useApi<Run[]>("/payroll/runs");
  const [editing, setEditing] = useState<Employee | "new" | null>(null);
  const [newRun, setNewRun] = useState(false);
  const { busy, run } = useAction();

  return (
    <>
      <PageHeader
        title="Payroll"
        subtitle="Keep track of employees and every pay run. Posting a run records wages, withholdings and employer taxes in the books."
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing("new")}>New employee</Button>
            <Button onClick={() => setNewRun(true)}>Run payroll</Button>
          </>
        }
      />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: "runs", label: "Pay runs" }, { value: "employees", label: "Employees" }]} />
      <ErrorNote>{employees.error || runs.error}</ErrorNote>
      {tab === "employees" ? (
        <Panel padded={false}>
          {!employees.data ? <Loading /> : employees.data.length === 0 ? <Empty>No employees yet.</Empty> : (
            <Table>
              <thead><tr><Th>Name</Th><Th>Title</Th><Th>Pay</Th><Th>Paid</Th><Th>Hired</Th><Th /></tr></thead>
              <tbody>
                {employees.data.map((e) => (
                  <tr key={e.id}>
                    <Td className="font-medium">{e.name} {!e.active && <Badge>Inactive</Badge>}</Td>
                    <Td>{e.title}</Td>
                    <Td>{e.payType === "HOURLY" ? `${money(e.payRate)} / hour` : `${money(e.payRate)} / year`}</Td>
                    <Td>{FREQ[e.payFrequency]}</Td>
                    <Td>{date(e.hireDate)}</Td>
                    <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => setEditing(e)}>Edit</Button></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      ) : (
        <Panel padded={false}>
          {!runs.data ? <Loading /> : runs.data.length === 0 ? <Empty>No pay runs yet.</Empty> : (
            <Table>
              <thead><tr><Th>Pay date</Th><Th>Period</Th><Th className="text-right">People</Th><Th className="text-right">Gross</Th><Th className="text-right">Net paid</Th><Th className="text-right">Employer taxes</Th><Th>Status</Th><Th /></tr></thead>
              <tbody>
                {runs.data.map((r) => (
                  <tr key={r.id}>
                    <Td className="font-medium">{date(r.payDate)}</Td>
                    <Td>{date(r.periodStart)} – {date(r.periodEnd)}</Td>
                    <Td className="num">{r.paychecks.length}</Td>
                    <Td className="num">{money(r.totalGross)}</Td>
                    <Td className="num">{money(r.totalNet)}</Td>
                    <Td className="num">{money(r.totalEmployerTax)}</Td>
                    <Td>{r.status === "POSTED" ? <Badge tone="paid">Posted</Badge> : <Badge tone="due">Draft</Badge>}</Td>
                    <Td className="text-right">
                      {r.status === "DRAFT" && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" busy={busy} onClick={async () => { if (await run(() => api(`/payroll/runs/${r.id}`, { method: "DELETE" }), "Draft deleted")) runs.reload(); }}>Delete</Button>
                          <Button size="sm" busy={busy} onClick={async () => { if (await run(() => api(`/payroll/runs/${r.id}/post`, { body: {} }), "Payroll posted")) runs.reload(); }}>Post to books</Button>
                        </div>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      )}
      <EmployeeDialog employee={editing} onClose={() => setEditing(null)} onSaved={employees.reload} />
      <RunDialog open={newRun} onClose={() => setNewRun(false)} onSaved={runs.reload} />
    </>
  );
}

function EmployeeDialog({ employee, onClose, onSaved }: { employee: Employee | "new" | null; onClose: () => void; onSaved: () => void }) {
  const existing = employee && employee !== "new" ? employee : null;
  const [f, setF] = useState<Record<string, string | boolean>>({});
  const { busy, run } = useAction();
  useEffect(() => {
    if (!employee) return;
    setF({
      name: existing?.name ?? "",
      title: existing?.title ?? "",
      email: existing?.email ?? "",
      phone: existing?.phone ?? "",
      payType: existing?.payType ?? "HOURLY",
      payRate: existing ? String(n(existing.payRate)) : "",
      payFrequency: existing?.payFrequency ?? "BIWEEKLY",
      hireDate: existing?.hireDate ? isoDay(existing.hireDate) : "",
      active: existing?.active ?? true,
      notes: existing?.notes ?? "",
    });
  }, [employee, existing]);
  const set = (k: string, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  async function save() {
    const body = { ...f, payRate: Number(f.payRate), hireDate: f.hireDate || null };
    const ok = await run(() => (existing ? api(`/payroll/employees/${existing.id}`, { method: "PUT", body }) : api("/payroll/employees", { body })), "Employee saved");
    if (ok) {
      onSaved();
      onClose();
    }
  }
  return (
    <Modal open={!!employee} onClose={onClose} title={existing ? `Edit ${existing.name}` : "New employee"} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} busy={busy} disabled={!String(f.name ?? "").trim()}>Save</Button></>}>
      <p className="mb-4 text-xs text-oak">For privacy, Social Security numbers and bank details stay with your payroll provider — they are not stored here.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name"><Input value={String(f.name ?? "")} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Job title"><Input value={String(f.title ?? "")} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Email"><Input value={String(f.email ?? "")} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Phone"><Input value={String(f.phone ?? "")} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Paid by">
          <Select value={String(f.payType)} onChange={(e) => set("payType", e.target.value)}>
            <option value="HOURLY">The hour</option>
            <option value="SALARY">Yearly salary</option>
          </Select>
        </Field>
        <Field label={f.payType === "SALARY" ? "Salary per year" : "Rate per hour"}><Input type="number" step="0.01" min={0} value={String(f.payRate ?? "")} onChange={(e) => set("payRate", e.target.value)} /></Field>
        <Field label="How often">
          <Select value={String(f.payFrequency)} onChange={(e) => set("payFrequency", e.target.value)}>
            {Object.entries(FREQ).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Hire date"><Input type="date" value={String(f.hireDate ?? "")} onChange={(e) => set("hireDate", e.target.value)} /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea value={String(f.notes ?? "")} onChange={(e) => set("notes", e.target.value)} /></Field>
        <Checkbox label="Currently employed" checked={Boolean(f.active)} onChange={(v) => set("active", v)} />
      </div>
    </Modal>
  );
}

function RunDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [period, setPeriod] = useState({ periodStart: isoDay(new Date(Date.now() - 13 * 86400000)), periodEnd: isoDay(), payDate: isoDay() });
  const [checks, setChecks] = useState<Check[]>([]);
  const [post, setPost] = useState(true);
  const { busy, run } = useAction();

  useEffect(() => {
    if (!open) return;
    api<Check[]>("/payroll/runs/preview", { body: {} }).then(setChecks).catch(() => setChecks([]));
  }, [open]);

  const net = (c: Check) => n(c.grossPay) - n(c.federalTax) - n(c.stateTax) - n(c.socialSecurity) - n(c.medicare) - n(c.otherDeductions);
  const update = (i: number, k: keyof Check, v: string) => setChecks((cs) => cs.map((c, j) => (j === i ? { ...c, [k]: v } : c)));

  async function save() {
    const ok = await run(() => api("/payroll/runs", { body: { ...period, post, paychecks: checks.map((c) => ({ ...c, name: undefined })) } }), post ? "Payroll posted" : "Payroll saved as draft");
    if (ok) {
      onSaved();
      onClose();
    }
  }
  const cols: [keyof Check, string][] = [
    ["regularHours", "Hours"],
    ["overtimeHours", "Overtime"],
    ["grossPay", "Gross"],
    ["federalTax", "Federal"],
    ["stateTax", "State"],
    ["socialSecurity", "Soc. Sec."],
    ["medicare", "Medicare"],
    ["otherDeductions", "Other"],
    ["employerTaxes", "Employer tax"],
  ];
  return (
    <Modal open={open} onClose={onClose} wide title="Run payroll" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} busy={busy} disabled={!checks.length}>{post ? "Save and post" : "Save draft"}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Period start"><Input type="date" value={period.periodStart} onChange={(e) => setPeriod({ ...period, periodStart: e.target.value })} /></Field>
        <Field label="Period end"><Input type="date" value={period.periodEnd} onChange={(e) => setPeriod({ ...period, periodEnd: e.target.value })} /></Field>
        <Field label="Pay date"><Input type="date" value={period.payDate} onChange={(e) => setPeriod({ ...period, payDate: e.target.value })} /></Field>
      </div>
      <p className="my-3 text-xs text-oak">
        Gross is calculated from hours (overtime at 1.5×) or salary. Social Security (6.2%) and Medicare (1.45%) are pre-filled — enter
        federal and state withholding from your payroll provider or tax tables.
      </p>
      {checks.length === 0 ? <Empty>Add active employees first.</Empty> : (
        <Table>
          <thead><tr><Th>Employee</Th>{cols.map(([k, l]) => <Th key={k} className="text-right">{l}</Th>)}<Th className="text-right">Net</Th></tr></thead>
          <tbody>
            {checks.map((c, i) => (
              <tr key={c.employeeId}>
                <Td className="font-medium">{c.name}</Td>
                {cols.map(([k]) => (
                  <Td key={k}><Input className="num h-8 w-20 px-1 text-sm" type="number" step="0.01" min={0} value={String(c[k] ?? "")} onChange={(e) => update(i, k, e.target.value)} /></Td>
                ))}
                <Td className="num pt-3 font-semibold">{money(net(c))}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <div className="mt-4"><Checkbox label="Post to the books now (otherwise saved as a draft)" checked={post} onChange={setPost} /></div>
    </Modal>
  );
}
