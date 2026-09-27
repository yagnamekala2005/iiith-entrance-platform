"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Password updated successfully. You can now sign in with your new password.");
    setPassword("");
    setConfirmPassword("");

    window.setTimeout(() => {
      window.location.href = "/login";
    }, 1500);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <form className="w-full max-w-md border border-slate-200 bg-white p-8 shadow-sm" onSubmit={handleSubmit}>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">IIITH Prep</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">Reset password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Enter your new password below.
        </p>

        <label className="mt-8 block text-sm font-medium text-slate-700" htmlFor="password">
          New password
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

        <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="confirm-password">
          Confirm new password
        </label>
        <input
          className="mt-2 w-full border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-700"
          id="confirm-password"
          name="confirm-password"
          autoComplete="new-password"
          minLength={6}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          type="password"
          value={confirmPassword}
        />

        <button
          className="mt-7 w-full bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          disabled={loading || !ready}
          type="submit"
        >
          {loading ? "Updating password..." : ready ? "Update password" : "Verifying reset link..."}
        </button>

        {message && (
          <p className="mt-4 text-sm text-slate-600" role="status">
            {message}
          </p>
        )}

        <p className="mt-7 text-sm text-slate-600">
          <Link className="font-semibold text-teal-800" href="/login">
            Back to sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
