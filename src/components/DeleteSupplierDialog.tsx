"use client";
// "Delete supplier" with a confirm step. Before asking, it checks what the
// delete would do: items that lose their supplier, past orders and bills that
// are kept for history, or a reason it can't be deleted yet (money owed, an
// order still waiting for delivery).
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { Button, Loading, Modal, useAction } from "./ui";

interface Check {
  name: string;
  items: number;
  orders: number;
  bills: number;
  payments: number;
  owed: number;
  keepsHistory: boolean;
  blockedBy: string | null;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function DeleteSupplierDialog({
  supplier,
  onClose,
  onDeleted,
}: {
  supplier: { id: number; name: string } | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { busy, run } = useAction();
  const [check, setCheck] = useState<Check | null>(null);
  const [failed, setFailed] = useState("");

  useEffect(() => {
    setCheck(null);
    setFailed("");
    if (!supplier) return;
    let cancelled = false;
    api<Check>(`/suppliers/${supplier.id}/delete-check`)
      .then((c) => !cancelled && setCheck(c))
      .catch((e) => !cancelled && setFailed(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [supplier]);

  if (!supplier) return null;
  const blocked = !!check?.blockedBy;
  const history = check
    ? [check.orders && plural(check.orders, "purchase order"), check.bills && plural(check.bills, "bill"), check.payments && plural(check.payments, "payment")].filter(Boolean).join(", ")
    : "";

  return (
    <Modal
      open
      title="Delete supplier?"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{blocked ? "Close" : "Cancel"}</Button>
          {!blocked && (
            <Button
              variant="danger"
              busy={busy}
              disabled={!check}
              onClick={async () => {
                const ok = await run(() => api(`/suppliers/${supplier.id}`, { method: "DELETE" }), `${supplier.name} deleted`);
                if (ok) onDeleted();
              }}
            >
              Yes, delete supplier
            </Button>
          )}
        </>
      }
    >
      <p className="text-lg font-semibold text-walnut">{supplier.name}</p>
      {failed ? (
        <p className="mt-3 text-sm text-late">{failed}</p>
      ) : !check ? (
        <Loading />
      ) : blocked ? (
        <p className="mt-3 rounded-lux bg-late/10 px-3 py-2 text-sm text-late">
          Can&apos;t delete yet. {check.blockedBy}
        </p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm text-ink">
          <li>It will no longer show in Suppliers or in any supplier dropdown.</li>
          {check.items > 0 && (
            <li>
              <b>{plural(check.items, "item")}</b> from them stay in Items &amp; stock but will show no supplier.
            </li>
          )}
          {check.keepsHistory ? (
            <li className="text-oak">Their past {history} are kept, so history and the books still show them.</li>
          ) : (
            <li className="text-oak">We&apos;ve never ordered from them, so nothing else changes.</li>
          )}
          {check.owed > 0 && <li>We owe them {money(check.owed)}.</li>}
        </ul>
      )}
    </Modal>
  );
}
