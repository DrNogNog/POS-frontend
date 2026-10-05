"use client";
// Archived (removed) items, kept for the record.
import { useApi } from "@/lib/hooks";
import { dateTime } from "@/lib/format";
import { Empty, ErrorNote, Loading, PageHeader, Panel, Table, Td, Th } from "@/components/ui";

interface Archive { id: number; entity: string; entityId: number; data: { itemCode?: string; name?: string }; createdAt: string }

export default function ArchivesPage() {
  const { data, error, loading } = useApi<Archive[]>("/archives");
  return (
    <>
      <PageHeader title="Archives" subtitle="Items removed from the catalog. Their history and past invoices are kept." />
      <Panel padded={false}>
        <ErrorNote>{error}</ErrorNote>
        {loading && !data ? <Loading /> : !data?.length ? <Empty>Nothing archived.</Empty> : (
          <Table>
            <thead><tr><Th>Archived</Th><Th>Type</Th><Th>Item</Th></tr></thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id}><Td>{dateTime(a.createdAt)}</Td><Td>{a.entity}</Td><Td>{a.data.itemCode} {a.data.name}</Td></tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
