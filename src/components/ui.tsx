"use client";
// -----------------------------------------------------------------------------
// The small set of building blocks every screen uses, so the whole app looks
// and behaves the same: buttons, inputs, panels, tables, badges, dialogs.
// -----------------------------------------------------------------------------
import {
  Children,
  Fragment,
  createContext,
  isValidElement,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

// ---- Buttons ------------------------------------------------------------------
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-walnut text-ivory shadow-[0_1px_0_rgba(255,255,255,0.08)_inset] hover:bg-walnut-deep",
  secondary: "bg-white text-walnut border border-hairline hover:border-brass",
  ghost: "text-walnut hover:bg-linen",
  danger: "bg-white text-late border border-late/40 hover:bg-late hover:text-white",
  success: "bg-paid text-white hover:brightness-110",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md"; busy?: boolean }
>(function Button({ variant = "primary", size = "md", busy, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || busy}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lux font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-9 px-3.5 text-sm" : "h-11 px-5",
        buttonStyles[variant],
        className
      )}
      {...rest}
    >
      {busy ? "Working…" : children}
    </button>
  );
});

// ---- Form fields ------------------------------------------------------------------
const fieldBase =
  "w-full rounded-lux border border-hairline bg-white px-3.5 text-ink placeholder:text-oak/60 focus:border-brass focus:outline-none focus:ring-2 focus:ring-brass/25 disabled:bg-linen";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref
) {
  return <input ref={ref} className={cn(fieldBase, "h-11", className)} {...rest} />;
});

// ---- Select ---------------------------------------------------------------------
// Looks and is used like a normal <select> with <option>s, but opens a list
// that scrolls (about 8 rows tall) and, when there are many choices, has a
// search box at the top — so long lists like suppliers stay easy to use.
type Choice = { value: string; label: string; disabled?: boolean };

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

function choicesOf(children: ReactNode): Choice[] {
  const out: Choice[] = [];
  Children.toArray(children).forEach((child) => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(child)) return;
    if (child.type === Fragment) return void out.push(...choicesOf(child.props.children));
    const label = textOf(child.props.children);
    out.push({ value: child.props.value === undefined ? label : String(child.props.value), label, disabled: child.props.disabled });
  });
  return out;
}

const SEARCH_FROM = 8; // show a search box when there are more choices than this

export function Select({
  className,
  children,
  value,
  onChange,
  id,
  disabled,
  "aria-label": ariaLabel,
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const choices = choicesOf(children);
  const current = value === undefined || value === null ? "" : String(value);
  const selected = choices.find((c) => c.value === current) ?? choices[0];
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchable = choices.length > SEARCH_FROM;
  const term = q.trim().toLowerCase();
  const shown = term ? choices.filter((c) => c.label.toLowerCase().includes(term)) : choices;

  const place = useCallback(() => {
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 8;
    const above = r.top - 8;
    const want = 320;
    const width = Math.max(r.width, 220);
    const left = Math.min(r.left, window.innerWidth - width - 8);
    if (below >= Math.min(want, 200) || below >= above) setPos({ left, width, top: r.bottom + 4, maxHeight: Math.min(want, below) });
    else setPos({ left, width, bottom: window.innerHeight - r.top + 4, maxHeight: Math.min(want, above) });
  }, []);

  const close = useCallback((focusButton = true) => {
    setOpen(false);
    setQ("");
    if (focusButton) buttonRef.current?.focus();
  }, []);

  const openList = (startTyping = "") => {
    if (disabled) return;
    place();
    setQ(startTyping);
    const i = choices.findIndex((c) => c.value === current);
    setActive(startTyping ? 0 : Math.max(0, i));
    setOpen(true);
  };

  const pick = (c: Choice) => {
    if (c.disabled) return;
    close();
    if (c.value !== current) onChange?.({ target: { value: c.value }, currentTarget: { value: c.value } } as unknown as ChangeEvent<HTMLSelectElement>);
  };

  // Close on a click elsewhere; keep the list attached while the page scrolls or resizes
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !listRef.current?.contains(t)) close(false);
    };
    const onMove = (e: Event) => {
      if (listRef.current?.contains(e.target as Node)) return;
      place();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", place);
    if (searchable) searchRef.current?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", place);
    };
  }, [open, close, place, searchable]);

  // Keep the highlighted row in view
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onKeys = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      } else if (searchable && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        openList(e.key);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // don't also close a dialog the list is in
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Home" || e.key === "PageUp") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" || e.key === "PageDown") {
      e.preventDefault();
      setActive(shown.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[active]) pick(shown[active]);
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeys}
        className={cn(fieldBase, "relative flex h-11 items-center pr-10 text-left", className)}
      >
        <span className={cn("block truncate", !selected?.value && "text-oak")}>{selected?.label ?? ""}</span>
        <ChevronDown size={16} className={cn("pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-oak transition-transform", open && "rotate-180")} />
      </button>
      {open && pos &&
        createPortal(
          <div
            ref={listRef}
            className="fixed z-[65] flex flex-col overflow-hidden rounded-lux border border-hairline bg-white shadow-xl"
            style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {searchable && (
              <div className="border-b border-hairline p-2">
                <input
                  ref={searchRef}
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setActive(0); }}
                  onKeyDown={onKeys}
                  placeholder={`Search ${choices.length} choices…`}
                  aria-label="Search the list"
                  className={cn(fieldBase, "h-9 text-sm")}
                />
              </div>
            )}
            <div role="listbox" className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
              {shown.length === 0 ? (
                <p className="px-3.5 py-2 text-sm text-oak">Nothing matches &ldquo;{q.trim()}&rdquo;.</p>
              ) : (
                shown.map((c, i) => (
                  <button
                    key={`${c.value}-${i}`}
                    type="button"
                    role="option"
                    aria-selected={c.value === current}
                    data-index={i}
                    disabled={c.disabled}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(c)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-sm",
                      i === active ? "bg-linen" : "",
                      c.value === current ? "font-semibold text-walnut" : "text-ink",
                      c.disabled && "opacity-50"
                    )}
                  >
                    <span className="truncate">{c.label}</span>
                    {c.value === current && <Check size={15} className="shrink-0 text-brass" />}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "min-h-24 py-2.5", className)} {...rest} />;
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-semibold text-walnut">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-oak">{hint}</span>}
    </label>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="h-4 w-4 accent-walnut"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

// ---- Layout -------------------------------------------------------------------------
export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Shows a "← Back" link above the title (e.g. back to the list). */
  back?: { label: string; onClick: () => void };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && (
          <button
            type="button"
            onClick={back.onClick}
            className="no-print mb-2 inline-flex items-center gap-1.5 rounded-lux px-2 py-1 -ml-2 text-sm font-semibold text-oak hover:bg-hairline/60 hover:text-walnut"
          >
            <span aria-hidden>←</span> {back.label}
          </button>
        )}
        <h1 className="font-display text-4xl font-semibold leading-tight text-walnut">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-oak">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  actions,
  children,
  className,
  padded = true,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn("rounded-lux border border-hairline bg-white shadow-[0_1px_2px_rgba(59,42,32,0.04),0_12px_32px_-18px_rgba(59,42,32,0.18)]", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-6 py-4">
          <h2 className="font-display text-2xl font-semibold text-walnut">{title}</h2>
          {actions}
        </div>
      )}
      <div className={padded ? "p-6" : ""}>{children}</div>
    </section>
  );
}

/** A key figure. `tone` colors the number. */
export function Stat({
  label,
  value,
  note,
  tone = "ink",
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: "ink" | "paid" | "due" | "late";
}) {
  const color = { ink: "text-walnut", paid: "text-paid", due: "text-due", late: "text-late" }[tone];
  return (
    <div className="rounded-lux border border-hairline bg-white px-6 py-5 shadow-[0_12px_32px_-20px_rgba(59,42,32,0.2)]">
      <div className="text-sm text-oak">{label}</div>
      <div className={cn("num mt-1 text-left font-display text-4xl font-semibold", color)}>{value}</div>
      {note && <div className="mt-1 text-xs text-oak">{note}</div>}
    </div>
  );
}

export function Badge({
  tone = "neutral",
  title,
  children,
}: {
  tone?: "neutral" | "paid" | "due" | "late" | "info";
  title?: string;
  children: ReactNode;
}) {
  const styles = {
    neutral: "bg-linen text-walnut border-hairline",
    paid: "bg-paid/10 text-paid border-paid/30",
    due: "bg-due/10 text-due border-due/30",
    late: "bg-late/10 text-late border-late/30",
    info: "bg-walnut text-white border-walnut",
  }[tone];
  return (
    <span title={title} className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", styles)}>
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-6 py-12 text-center text-oak">{children}</div>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <div className="rounded-lux border border-late/30 bg-late/5 px-4 py-3 text-sm text-late">{children}</div>;
}

export function Loading() {
  return <div className="px-5 py-10 text-center text-oak">Loading…</div>;
}

// ---- Tables ---------------------------------------------------------------------------
/**
 * Every list (invoices, estimates, approvals, items…) uses this. Rows are
 * separated by a clear rule line and every other row is lightly shaded, so
 * each item stands apart.
 */
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn(
          "w-full border-collapse text-sm",
          "[&_tbody_tr:nth-child(even)]:bg-linen/50 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-maple/15",
          className
        )}
      >
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  className,
  sortKey,
  sort,
}: {
  children?: ReactNode;
  className?: string;
  sortKey?: string;
  sort?: { sort: string; dir: "asc" | "desc"; toggle: (k: never) => void };
}) {
  const active = sort && sortKey && sort.sort === sortKey;
  return (
    <th className={cn("border-b-2 border-r border-oak/25 border-b-oak/40 bg-linen px-4 py-3 text-left text-sm font-semibold text-walnut first:pl-6 last:border-r-0 last:pr-6", className)}>
      {sortKey && sort ? (
        <button
          type="button"
          className="inline-flex items-center gap-1 hover:underline"
          onClick={() => sort.toggle(sortKey as never)}
        >
          {children}
          {active ? sort.dir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} /> : null}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

/**
 * Page controls under every list: "Showing 26–50 of 312", rows per page,
 * and First / Previous / page numbers / Next / Last.
 */
export const PAGE_SIZES = [25, 50, 100] as const;
export function Pagination({
  page,
  limit,
  total,
  onPage,
  onLimit,
  noun = "items",
}: {
  page: number;
  limit: number;
  total: number;
  onPage: (p: number) => void;
  onLimit?: (n: number) => void;
  /** What the rows are, e.g. "invoices" */
  noun?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(page, pages);
  const from = total ? (current - 1) * limit + 1 : 0;
  const to = Math.min(total, current * limit);
  // Page numbers around the current one, with … gaps
  const nums: (number | "gap")[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - current) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== "gap") nums.push("gap");
  }
  const btn = "inline-flex h-9 min-w-9 items-center justify-center rounded-lux px-2.5 text-sm font-semibold";
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3 border-t border-oak/20 px-6 py-3 text-sm text-oak">
      <div className="flex items-center gap-3">
        <span>
          {total ? (
            <>Showing <b className="num text-walnut">{from.toLocaleString()}–{to.toLocaleString()}</b> of <b className="num text-walnut">{total.toLocaleString()}</b> {noun}</>
          ) : (
            <>No {noun}</>
          )}
        </span>
        {onLimit && (
          <label className="flex items-center gap-2">
            <span className="hidden sm:inline">Rows per page</span>
            <select
              aria-label="Rows per page"
              className="h-9 rounded-lux border border-hairline bg-white px-2 pr-7 text-sm text-walnut"
              value={limit}
              onChange={(e) => { onLimit(Number(e.target.value)); onPage(1); }}
            >
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
      </div>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" className={cn(btn, "text-walnut hover:bg-linen disabled:opacity-40")} disabled={current === 1} onClick={() => onPage(current - 1)} aria-label="Previous page">
            <ChevronLeft size={16} />
          </button>
          {nums.map((p, i) =>
            p === "gap" ? (
              <span key={`g${i}`} className="px-1">…</span>
            ) : (
              <button
                key={p}
                type="button"
                aria-current={p === current ? "page" : undefined}
                className={cn(btn, p === current ? "bg-walnut text-ivory" : "text-walnut hover:bg-linen")}
                onClick={() => onPage(p)}
              >
                {p}
              </button>
            )
          )}
          <button type="button" className={cn(btn, "text-walnut hover:bg-linen disabled:opacity-40")} disabled={current === pages} onClick={() => onPage(current + 1)} aria-label="Next page">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </nav>
  );
}

export function Td({ children, className, ...rest }: { children?: ReactNode; className?: string; colSpan?: number }) {
  return (
    <td className={cn("border-b border-r border-oak/25 px-4 py-3 align-top first:pl-6 last:border-r-0 last:pr-6", className)} {...rest}>
      {children}
    </td>
  );
}

// ---- Dialog ------------------------------------------------------------------------------
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Keep the latest onClose without re-running the effect on every keystroke
  // (re-running it used to move the cursor out of the field being typed in).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    // Put the cursor in the first field once, when the dialog opens
    const body = ref.current?.querySelector("[data-modal-body]");
    (body?.querySelector<HTMLElement>("input:not([type=hidden]),select,textarea") ??
      ref.current?.querySelector<HTMLElement>("[data-modal-body] button, [data-modal-footer] button"))?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-walnut-deep/55 p-4 backdrop-blur-sm sm:p-10" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn("w-full rounded-lux border border-hairline bg-white shadow-2xl", wide ? "max-w-5xl" : "max-w-xl")}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2 className="font-display text-3xl font-semibold text-walnut">{title}</h2>
          <button aria-label="Close" className="rounded-full p-2 text-oak hover:bg-linen" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="p-6" data-modal-body>{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-hairline px-6 py-4" data-modal-footer>{footer}</div>}
      </div>
    </div>
  );
}

// ---- Toasts (short confirmations) --------------------------------------------------------
const ToastContext = createContext<(msg: string, tone?: "ok" | "error") => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; msg: string; tone: "ok" | "error" }[]>([]);
  const push = useCallback((msg: string, tone: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 7000 : 3500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-lux px-4 py-3 text-sm shadow-lg",
              t.tone === "ok" ? "bg-walnut text-white" : "bg-late text-white"
            )}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Run an async action with a busy flag and toast the result. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async <T,>(fn: () => Promise<T>, success?: string): Promise<T | undefined> => {
      setBusy(true);
      try {
        const result = await fn();
        if (success) toast(success);
        return result;
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e), "error");
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [toast]
  );
  return { busy, run };
}

// ---- Tabs -----------------------------------------------------------------------------------
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mb-5 inline-flex flex-wrap gap-1 rounded-lux border border-hairline bg-white p-1" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "rounded-[0.375rem] px-4 py-2 text-sm font-semibold",
            value === t.value ? "bg-walnut text-ivory" : "text-oak hover:text-walnut"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
