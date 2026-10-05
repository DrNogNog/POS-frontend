"use client";
import { PageHeader, Panel } from "@/components/ui";
import EstimatesBoard from "@/components/EstimatesBoard";

export default function ApprovalsPage() {
  return (
    <>
      <PageHeader title="Approvals" subtitle="Estimates waiting for the customer's yes, and approved ones ready to invoice." />
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 font-semibold text-walnut">Waiting for approval</h2>
          <EstimatesBoard statuses={["PENDING"]} />
        </section>
        <section>
          <h2 className="mb-3 font-semibold text-walnut">Approved — ready to invoice</h2>
          <EstimatesBoard statuses={["APPROVED"]} />
        </section>
        <Panel>
          <p className="text-sm text-oak">
            Making an invoice takes the items out of stock (at the store&apos;s costing method), records the sale and sales tax, and adds
            the amount to accounts receivable. Everything is written to History.
          </p>
        </Panel>
      </div>
    </>
  );
}
