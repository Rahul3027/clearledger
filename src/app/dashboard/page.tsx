import { createSupabaseServerClient } from "@/infrastructure/auth/supabase-server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top nav */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">ClearLedger</span>
          <span className="text-sm text-slate-400">{user.email}</span>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-6 py-12 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-slate-400">
            Welcome back. Your workspace will appear here once set up.
          </p>
        </div>

        {/* Placeholder cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {["Entities", "Active Periods", "Open Exceptions"].map((label) => (
            <div
              key={label}
              className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-2"
            >
              <p className="text-sm text-slate-400">{label}</p>
              <p className="text-3xl font-bold text-white">—</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-slate-500 text-sm">
          Phase 0 complete. Ingestion pipeline coming in Phase 1.
        </div>
      </main>
    </div>
  );
}
