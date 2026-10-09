// Formatting helpers used on every screen.

/** API money values arrive as strings (exact decimals). */
export function n(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const x = Number(value);
  return Number.isFinite(x) ? x : 0;
}

export function money(value: unknown): string {
  return n(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function qty(value: unknown): string {
  const x = n(value);
  return Number.isInteger(x) ? String(x) : x.toFixed(3).replace(/0+$/, "");
}

/** Stock counts read as units: "1 unit", "3 units". */
export function units(value: unknown): string {
  const x = n(value);
  return `${qty(x)} ${Math.abs(x) === 1 ? "unit" : "units"}`;
}

export function pct(value: unknown, digits = 1): string {
  return `${n(value).toFixed(digits)}%`;
}

export function date(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function dateTime(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/** yyyy-mm-dd for <input type="date"> */
export function isoDay(value: unknown = new Date()): string {
  const d = new Date(String(value instanceof Date ? value.toISOString() : value));
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function firstLine(text: string | null | undefined): string {
  return (text || "").split("\n")[0].trim();
}

export function termsLabel(days: number): string {
  return days > 0 ? `Net ${days}` : "Due on receipt";
}

/** Badge color for the A/R health level. */
export function healthTone(level: string): "late" | "due" | "paid" | "neutral" {
  return level === "HIGH" ? "late" : level === "LOW" ? "due" : level === "HEALTHY" ? "paid" : "neutral";
}
