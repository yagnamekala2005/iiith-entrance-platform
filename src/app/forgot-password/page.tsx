"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "If an account exists for this email, a password reset link has been sent to that email address."
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <form className="w-full max-w-md border border-slate-200 bg-white p-8 shadow-sm" onSubmit={handleSubmit}>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">IIITH Prep</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">Forgot password?</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Enter the email you used to create your account. We will send the reset link to that email.
        </p>

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

        <button
          className="mt-7 w-full bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Sending reset link..." : "Send reset link"}
        </button>

        {message && (
          <p className="mt-4 text-sm text-slate-600" role="status">
            {message}
          </p>
        )}

        <p className="mt-7 text-sm text-slate-600">
          Remember your password?{" "}
          <Link className="font-semibold text-teal-800" href="/login">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
