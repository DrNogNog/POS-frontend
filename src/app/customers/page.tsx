"use client";
import Link from "next/link";
import { useState } from "react";
import { useApi, useDebounced } from "@/lib/hooks";
import { usePriceLevels } from "@/lib/privacy";
import { date, money, termsLabel } from "@/lib/format";
import type { Customer } from "@/lib/types";
import { Badge, Button, Empty, ErrorNote, Input, Loading, PageHeader, Panel, Table, Td, Th } from "@/components/ui";
import { CustomerForm } from "@/components/forms";

export default function CustomersPage() {
  const [q, setQ] = useState("");
  const debounced = useDebounced(q);
  const { data, error, loading, reload } = useApi<Customer[]>(`/customers${debounced ? `?q=${encodeURIComponent(debounced)}` : ""}`);
  const [adding, setAdding] = useState(false);
  const { show: showLevels } = usePriceLevels();

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Everyone who has bought from this store, with their terms, delivery details and balance."
        actions={<Button onClick={() => setAdding(true)}>New customer</Button>}
      />
      <Panel padded={false}>
        <div className="p-4"><Input className="max-w-md" placeholder="Search name, company, phone or email…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <ErrorNote>{error}</ErrorNote>
        {loading && !data ? (
          <Loading />
        ) : !data?.length ? (
          <Empty>No customers yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr><Th>Name</Th><Th>Phone</Th><Th>Terms</Th>{showLevels && <Th>Level</Th>}<Th>Last purchase</Th><Th className="text-right">Lifetime sales</Th><Th className="text-right">Owes</Th></tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="hover:bg-linen/60">
                  <Td>
                    <Link href={`/customers/${c.id}`} className="font-semibold text-walnut underline">{c.name}</Link>
                    {c.company && <div className="text-xs text-oak">{c.company}</div>}
                  </Td>
                  <Td>{c.phone}</Td>
                  <Td>{termsLabel(c.termsDays)}</Td>
                  {showLevels && <Td><Badge>{c.priceTierCode}</Badge></Td>}
                  <Td>{date(c.lastPurchase)}</Td>
                  <Td className="num">{money(c.lifetimeSales)}</Td>
                  <Td className={`num font-medium ${(c.balance ?? 0) > 0 ? "text-late" : ""}`}>{money(c.balance)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
      <CustomerForm open={adding} onClose={() => setAdding(false)} onSaved={() => reload()} />
    </>
  );
}
