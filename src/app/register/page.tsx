"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!success) return;

    const timer = window.setTimeout(() => setSuccess(false), 4000);
    return () => window.clearTimeout(timer);
  }, [success]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setSuccess(false);
      setMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setSuccess(false);
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "Unable to create the account. Please try again.");
        return;
      }

      setSuccess(true);
      setMessage(
        "Your account has been created successfully. Sign in with the same email and password."
      );
      setEmail("");
      setPassword("");
    } catch {
      setMessage("Unable to create the account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      {success && (
        <div
          className="fixed right-5 top-5 z-50 rounded-lg border border-emerald-200 bg-white px-5 py-4 shadow-lg"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-semibold text-emerald-700">Account created successfully</p>
          <p className="mt-1 text-xs text-slate-600">Use the same email and password to sign in.</p>
        </div>
      )}

      <form
        className="w-full max-w-md border border-slate-200 bg-white p-8 shadow-sm"
        onSubmit={handleSubmit}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">IIITH Prep</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">Create an account</h1>
        <p className="mt-2 text-sm text-slate-600">Set up your preparation workspace.</p>

        <label className="mt-8 block text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          className="mt-2 w-full border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-700"
          id="email"
          name="email"
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />

        <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="password">
          Password
        </label>
        <input
          className="mt-2 w-full border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-700"
          id="password"
          name="password"
          autoComplete="new-password"
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />

        <button
          className="mt-7 w-full bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>

        {message && (
          <p className={`mt-4 text-sm ${success ? "text-emerald-700" : "text-red-600"}`} role="alert">
            {message}
          </p>
        )}

        <p className="mt-7 text-sm text-slate-600">
          Already registered?{" "}
          <Link className="font-semibold text-teal-800" href="/login">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
