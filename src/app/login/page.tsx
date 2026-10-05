"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { api, session } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Button, ErrorNote, Field, Input, Select } from "@/components/ui";

export default function LoginPage() {
  const { stores } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [store, setStore] = useState("A");
  useEffect(() => setStore(session.store), []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api<{ token: string }>("/auth/login", { body: { email, password }, store });
      session.save(res.token, store);
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-walnut p-4">
      <form onSubmit={login} className="w-full max-w-md overflow-hidden rounded-lux bg-white shadow-2xl">
        <Image src="/Champion.png" alt="Champion Point of Sale" width={448} height={381} className="h-auto w-full" priority />
        <div className="space-y-4 px-8 pb-8 pt-4">
          <Field label="Store">
            <Select value={store} onChange={(e) => setStore(e.target.value)}>
              {(stores.length ? stores : [{ id: "A", name: "Store A" }]).map((s) => (
                <option key={s.id} value={s.id}>
                  Store {s.id} — {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Email">
            <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <ErrorNote>{error}</ErrorNote>
          <Button type="submit" className="w-full" busy={busy}>
            Log in
          </Button>
        </div>
      </form>
    </div>
  );
}
