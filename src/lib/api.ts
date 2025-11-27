// lib/api.ts
let token: string | null = null;

export function setToken(t: string) {
  token = t;
}

export async function api(path: string, options: RequestInit = {}) {
  const headers: any = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const res = await fetch(`http://localhost:4000/api${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}
