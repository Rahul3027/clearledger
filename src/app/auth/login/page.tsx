"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        {/* Logo / brand */}
        <div className="space-y-1 text-center">
          <div className="text-2xl font-bold tracking-tight text-white">
            ClearLedger
          </div>
          <div className="text-sm text-slate-400">
            Enterprise Reconciliation Platform
          </div>
        </div>

        {sent ? (
          <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/40 px-4 py-5 text-center space-y-2">
            <p className="text-sm font-medium text-emerald-300">
              Check your inbox
            </p>
            <p className="text-sm text-slate-400">
              We sent a magic link to{" "}
              <span className="font-medium text-white">{email}</span>.<br />
              Click it to sign in. The link expires in 1 hour.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-300"
              >
                Work email
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none ring-offset-slate-900 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-800/40 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-slate-500">
          No password required. We&apos;ll email you a secure sign-in link.
        </p>
      </div>
    </div>
  );
}
