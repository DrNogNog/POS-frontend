// -----------------------------------------------------------------------------
// Talking to the POS API.
//
// Every request sends the login token and the current store (A or B).
// Set NEXT_PUBLIC_API_URL in .env.local if the API isn't on localhost:4000.
// -----------------------------------------------------------------------------

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

const TOKEN_KEY = "pos.token";
const STORE_KEY = "pos.store";

function read(key: string): string {
  try {
    return window.sessionStorage.getItem(key) || window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

export const session = {
  get token() {
    return read(TOKEN_KEY);
  },
  get store() {
    return read(STORE_KEY) || "A";
  },
  save(token: string, store: string) {
    try {
      // The login only lasts while the browser tab is open.
      window.sessionStorage.setItem(TOKEN_KEY, token);
      window.localStorage.setItem(STORE_KEY, store);
    } catch {
      /* private mode */
    }
  },
  setStore(store: string) {
    try {
      window.localStorage.setItem(STORE_KEY, store);
    } catch {
      /* ignore */
    }
  },
  clear() {
    try {
      window.sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; form?: FormData; store?: string } = {}
): Promise<T> {
  const headers: Record<string, string> = { "X-Store": options.store || session.store };
  if (session.token) headers.Authorization = `Bearer ${session.token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method: options.method || (options.body !== undefined || options.form ? "POST" : "GET"),
      headers,
      body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    });
  } catch {
    throw new ApiError(0, "Can't reach the POS server. Check that the backend is running.");
  }

  if (res.status === 401 && !path.startsWith("/auth/login")) {
    session.clear();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

/** Opens a PDF (estimate, invoice, PO, bill) in a new tab. */
export function openPdf(path: string) {
  const url = `${API_URL}/api${path}?store=${encodeURIComponent(session.store)}&token=${encodeURIComponent(session.token)}`;
  window.open(url, "_blank", "noopener");
}

export function imageUrl(filename: string) {
  return `${API_URL}/uploads/${encodeURIComponent(filename)}`;
}
