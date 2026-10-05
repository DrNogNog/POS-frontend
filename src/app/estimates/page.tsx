"use client";
import Link from "next/link";
import { Button, PageHeader } from "@/components/ui";
import EstimatesBoard from "@/components/EstimatesBoard";

export default function EstimatesPage() {
  return (
    <>
      <PageHeader
        title="Estimates"
        subtitle="Quotes for customers. Approved estimates become invoices."
        actions={<Link href="/sell"><Button>New estimate</Button></Link>}
      />
      <EstimatesBoard />
    </>
  );
}
