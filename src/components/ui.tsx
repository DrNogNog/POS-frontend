"use client";
// -----------------------------------------------------------------------------
// The small set of building blocks every screen uses, so the whole app looks
// and behaves the same: buttons, inputs, panels, tables, badges, dialogs.
// -----------------------------------------------------------------------------
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ---- Buttons ------------------------------------------------------------------
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-walnut text-white hover:bg-walnut-deep",
  secondary: "bg-white text-walnut border border-hairline hover:border-oak",
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
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4",
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
  "w-full rounded-md border border-hairline bg-white px-3 text-ink placeholder:text-oak/60 focus:border-oak focus:outline-none focus:ring-2 focus:ring-maple/40 disabled:bg-linen";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref
) {
  return <input ref={ref} className={cn(fieldBase, "h-10", className)} {...rest} />;
});

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, "h-10 pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "min-h-20 py-2", className)} {...rest} />;
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
      <span className="mb-1 block text-sm font-medium text-walnut">{label}</span>
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
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-walnut">{title}</h1>
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
    <section className={cn("rounded-lg border border-hairline bg-white", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3">
          <h2 className="font-semibold text-walnut">{title}</h2>
          {actions}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
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
    <div className="rounded-lg border border-hairline bg-white px-5 py-4">
      <div className="text-sm text-oak">{label}</div>
      <div className={cn("num mt-1 text-left text-2xl font-semibold", color)}>{value}</div>
      {note && <div className="mt-1 text-xs text-oak">{note}</div>}
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "paid" | "due" | "late" | "info"; children: ReactNode }) {
  const styles = {
    neutral: "bg-linen text-walnut border-hairline",
    paid: "bg-paid/10 text-paid border-paid/30",
    due: "bg-due/10 text-due border-due/30",
    late: "bg-late/10 text-late border-late/30",
    info: "bg-walnut text-white border-walnut",
  }[tone];
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", styles)}>
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-5 py-10 text-center text-oak">{children}</div>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <div className="rounded-md border border-late/30 bg-late/5 px-4 py-3 text-sm text-late">{children}</div>;
}

export function Loading() {
  return <div className="px-5 py-10 text-center text-oak">Loading…</div>;
}

// ---- Tables ---------------------------------------------------------------------------
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)}>{children}</table>
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
    <th className={cn("border-b border-hairline bg-linen px-3 py-2 text-left font-medium text-walnut", className)}>
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

export function Td({ children, className, ...rest }: { children?: ReactNode; className?: string; colSpan?: number }) {
  return (
    <td className={cn("border-b border-hairline px-3 py-2 align-top", className)} {...rest}>
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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-walnut-deep/50 p-4 sm:p-10" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn("w-full rounded-lg border border-hairline bg-white shadow-xl", wide ? "max-w-4xl" : "max-w-lg")}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
          <h2 className="text-lg font-semibold text-walnut">{title}</h2>
          <button aria-label="Close" className="rounded p-1 text-oak hover:bg-linen" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-hairline px-5 py-3">{footer}</div>}
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
              "rounded-md px-4 py-3 text-sm shadow-lg",
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
    <div className="mb-4 flex flex-wrap gap-1 border-b border-hairline" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
            value === t.value ? "border-walnut text-walnut" : "border-transparent text-oak hover:text-walnut"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
