"use client";
// "Delete item" with a confirm step. The item leaves Items & stock and can't be
// picked for new sales, but past estimates, invoices and history keep it.
import { api } from "@/lib/api";
import { n, units } from "@/lib/format";
import type { Product } from "@/lib/types";
import { Button, Modal, useAction } from "./ui";

export function DeleteItemDialog({
  product,
  onClose,
  onDeleted,
}: {
  product: Pick<Product, "id" | "itemCode" | "name" | "qtyOnHand"> | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { busy, run } = useAction();
  const close = onClose;
  if (!product) return null;
  const onHand = n(product.qtyOnHand);

  return (
    <Modal
      open
      title="Delete item?"
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button
            variant="danger"
            busy={busy}
            onClick={async () => {
              const ok = await run(() => api(`/products/${product.id}`, { method: "DELETE" }), `${product.itemCode} deleted`);
              if (ok) onDeleted();
            }}
          >
            Yes, delete item
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink">
        <b className="text-walnut">{product.itemCode}</b> — {product.name}
      </p>
      {onHand !== 0 && (
        <p className="mt-3 rounded-lux bg-late/10 px-3 py-2 text-sm text-late">
          There {Math.abs(onHand) === 1 ? "is" : "are"} still {units(onHand)} in stock. Deleting the item takes it out of inventory.
        </p>
      )}
      <p className="mt-3 text-sm text-oak">
        It will no longer show in Items &amp; stock or when selling. Past estimates, invoices and history still show it.
      </p>
    </Modal>
  );
}
