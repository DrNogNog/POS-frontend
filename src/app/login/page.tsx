"use client";

import { useState } from "react";
import { api, setToken } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  async function login() {
    const res = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: pw }),
    });

    setToken(res.token);
    window.location.href = "/products";
  }

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-100">
      <div className="bg-white p-8 rounded-xl shadow w-96">
        <h1 className="text-xl font-semibold mb-4">Login</h1>

        <input
          className="border p-2 w-full mb-3"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border p-2 w-full mb-3"
          placeholder="Password"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />

        <button
          onClick={login}
          className="w-full bg-black text-white p-2 rounded"
        >
          Login
        </button>
      </div>
    </div>
  );
}
