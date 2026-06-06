"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/api";

type LoginResponse = {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("change-this-password");
  const [error, setError] = useState("");

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const response = await apiFetch<LoginResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      window.localStorage.setItem("chatleadiq_token", response.token);
      document.cookie = `chatleadiq_token=${encodeURIComponent(response.token)}; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      router.push(searchParams.get("next") || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <main className="authPage">
      <form className="authCard" onSubmit={login}>
        <strong>ChatLeadIQ</strong>
        <h1>Admin Login</h1>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error ? <p className="formError">{error}</p> : null}
        <button className="primary" type="submit">
          Login
        </button>
        <p className="muted">Change the seeded password before production use.</p>
      </form>
    </main>
  );
}
