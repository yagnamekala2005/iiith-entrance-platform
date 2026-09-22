"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    setMessage(error ? error.message : "Signed in. You can open the dashboard now.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <form className="w-full max-w-md border border-slate-200 bg-white p-8 shadow-sm" onSubmit={handleSubmit}>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">IIITH Prep</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">Continue your preparation workspace.</p>
        <label className="mt-8 block text-sm font-medium text-slate-700" htmlFor="email">Email</label>
        <input className="mt-2 w-full border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-700" id="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="password">Password</label>
        <input className="mt-2 w-full border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-700" id="password" minLength={6} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
        <button className="mt-7 w-full bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60" disabled={loading} type="submit">
          {loading ? "Signing in..." : "Sign in"}
        </button>
        {message && <p className="mt-4 text-sm text-slate-600" role="status">{message}</p>}
        <p className="mt-7 text-sm text-slate-600">New here? <Link className="font-semibold text-teal-800" href="/register">Create an account</Link></p>
      </form>
    </main>
  );
}
