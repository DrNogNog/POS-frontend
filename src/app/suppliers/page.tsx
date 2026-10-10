"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApi } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { money, n, termsLabel } from "@/lib/format";
import type { Supplier } from "@/lib/types";
import { Search } from "lucide-react";
import { Badge, Button, Checkbox, Empty, ErrorNote, Input, Loading, PageHeader, Pagination, Panel, Table, Td, Th } from "@/components/ui";
import { SupplierForm } from "@/components/forms";

export default function SuppliersPage() {
  const router = useRouter();
  const { can } = useSession();
  const { data, error, loading, reload } = useApi<Supplier[]>("/suppliers");
  const [adding, setAdding] = useState(false);
  // Search box: name, contact, phone, email, address or account number. Every word must match.
  const [q, setQ] = useState("");
  const [owing, setOwing] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const digits = (v: string) => v.replace(/\D/g, "");
  const shown = (data ?? [])
    .filter((s) => {
      if (owing && !(n(s.balance) > 0)) return false;
      const hay = [s.name, s.contactName, s.phone, s.email, s.address, s.accountNumber, s.notes].join(" ").toLowerCase();
      return words.every((w) => hay.includes(w) || (digits(w).length >= 3 && digits(s.phone ?? "").includes(digits(w))));
    })
    .sort((a, b) => a.name.trim().localeCompare(b.name.trim(), "en", { sensitivity: "base", numeric: true }));
  const pageRows = shown.slice((page - 1) * limit, page * limit);
  return (
    <>
      <PageHeader
        title="Suppliers"
        back={{ label: "Back", onClick: () => (window.history.length > 1 ? router.back() : router.push("/")) }}
        subtitle="Who we buy from, our contract terms with them, and what we owe."
        actions={can("MANAGER", "ACCOUNTANT") && <Button onClick={() => setAdding(true)}>New supplier</Button>}
      />
      <Panel padded={false}>
        <div className="flex flex-wrap items-center gap-4 border-b border-hairline p-4">
          <div className="relative min-w-64 flex-1">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-oak" />
            <Input
              autoFocus
              className="pl-10"
              placeholder="Search suppliers by name, contact, phone, email, account #…"
              aria-label="Search suppliers"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          <Checkbox label="Only ones we owe" checked={owing} onChange={(v) => { setOwing(v); setPage(1); }} />
          {data && <span className="text-sm text-oak">{shown.length === data.length ? `${data.length} suppliers` : `${shown.length} of ${data.length} suppliers`}</span>}
        </div>
        <ErrorNote>{error}</ErrorNote>
        {loading && !data ? (
          <Loading />
        ) : !data?.length ? (
          <Empty>No suppliers yet.</Empty>
        ) : !shown.length ? (
          <Empty>No suppliers match &ldquo;{q.trim()}&rdquo;{owing && " that we owe"}.</Empty>
        ) : (
          <>
          <Table>
            <thead>
              <tr><Th>Supplier</Th><Th>Contact</Th><Th>Terms</Th><Th className="text-right">Discount off list</Th><Th>Early pay</Th><Th>Late fee</Th><Th className="text-right">Items</Th><Th className="text-right">We owe</Th></tr>
            </thead>
            <tbody>
              {pageRows.map((s) => (
                <tr key={s.id}>
                  <Td>
                    <Link href={`/suppliers/${s.id}`} className="font-semibold text-walnut underline">{s.name}</Link>
                    {!s.active && <Badge>Inactive</Badge>}
                  </Td>
                  <Td>{s.contactName}<div className="text-xs text-oak">{s.phone}</div></Td>
                  <Td>{termsLabel(s.paymentTermsDays)}</Td>
                  <Td className="num">{n(s.tradeDiscountPct)}%</Td>
                  <Td>{n(s.earlyPayDiscountPct) > 0 ? `${n(s.earlyPayDiscountPct)}% in ${s.earlyPayDiscountDays} days` : "—"}</Td>
                  <Td>{n(s.lateFeePct) > 0 || n(s.lateFeeFlat) > 0 ? [n(s.lateFeePct) && `${n(s.lateFeePct)}%`, n(s.lateFeeFlat) && money(s.lateFeeFlat)].filter(Boolean).join(" + ") : "—"}</Td>
                  <Td className="num">{s.productCount}</Td>
                  <Td className={`num font-medium ${(s.overdue ?? 0) > 0 ? "text-late" : ""}`}>{money(s.balance)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} limit={limit} total={shown.length} onPage={setPage} onLimit={(x) => { setLimit(x); setPage(1); }} noun="suppliers" />
          </>
        )}
      </Panel>
      <SupplierForm open={adding} onClose={() => setAdding(false)} onSaved={() => reload()} />
    </>
  );
}
