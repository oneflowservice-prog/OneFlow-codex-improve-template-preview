"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type AuthMode = "login" | "signup";

const ADMIN_NOTES = [
  "Manage platform access and activity from one workspace.",
  "Review account growth and usage totals at a glance.",
  "Keep operations separate from the main product interface.",
];

export function AdminAuthForm({
  adminSignupEnabled,
}: {
  adminSignupEnabled: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: mode === "signup" ? name.trim() || undefined : undefined,
          email,
          password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error || `Admin ${mode} failed`);
        return;
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-[100dvh] overflow-hidden bg-[#09111f] text-[hsl(var(--foreground))]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(41,153,255,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(0,216,161,0.16),transparent_30%),linear-gradient(135deg,#09111f_0%,#0f1f35_55%,#102846_100%)]" />
      <section className="relative z-10 mx-auto grid min-h-[100dvh] w-full max-w-7xl lg:grid-cols-[1.1fr_0.9fr]">
        <aside className="flex flex-col justify-between border-b border-white/10 px-6 py-10 sm:px-10 lg:border-b-0 lg:border-r lg:px-14 lg:py-14">
          <div>
            <p className="inline-flex rounded-full border border-white/15 bg-[hsl(var(--surface))]/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#9bd5ff]">
              Admin Portal
            </p>
            <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-[#f2f8ff] sm:text-5xl">
              Run OneFlow from a dedicated control surface.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-[#a8bfd8]">
              {adminSignupEnabled
                ? "Sign in with an admin account or create one, then continue to the operational dashboard."
                : "Sign in with an existing admin account to continue to the operational dashboard."}
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3 lg:mt-0 lg:grid-cols-1">
            {ADMIN_NOTES.map((note, index) => (
              <div
                key={note}
                className="rounded-[26px] border border-white/10 bg-[hsl(var(--surface))]/6 p-5 backdrop-blur"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-[#57c6a1]">
                  0{index + 1}
                </p>
                <p className="mt-3 text-sm leading-6 text-[#d7e5f4]">{note}</p>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex items-center px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
          <div className="w-full rounded-[30px] border border-white/10 bg-[rgba(8,16,28,0.72)] p-6 shadow-[0_30px_100px_-55px_rgba(0,0,0,0.85)] backdrop-blur sm:p-8">
            <div className="flex rounded-2xl border border-white/10 bg-[hsl(var(--surface))]/5 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  mode === "login"
                    ? "bg-[#d8f3ff] text-[#09111f]"
                    : "text-[#9fb6d0]"
                }`}
              >
                Admin login
              </button>
              {adminSignupEnabled ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                    mode === "signup"
                      ? "bg-[#57c6a1] text-[#08131d]"
                      : "text-[#9fb6d0]"
                  }`}
                >
                  Admin signup
                </button>
              ) : null}
            </div>

            <div className="mt-8">
              <p className="text-sm uppercase tracking-[0.18em] text-[#57c6a1]">
                Restricted access
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-[#f4f8ff]">
                {mode === "login" || !adminSignupEnabled
                  ? "Sign in to continue"
                  : "Create admin access"}
              </h2>
              <p className="mt-2 text-sm text-[#93aac4]">
                {mode === "login" || !adminSignupEnabled
                  ? "Authenticated admins are redirected to the dashboard immediately."
                  : "New admin accounts are signed in and sent straight to the dashboard."}
              </p>
              {!adminSignupEnabled ? (
                <p className="mt-3 rounded-2xl border border-[#23446c] bg-[#0d1d33] px-4 py-3 text-sm text-[#c6ddf4]">
                  Admin signup is currently disabled.
                </p>
              ) : null}
            </div>

            <form className="mt-8 space-y-4" onSubmit={onSubmit}>
              {mode === "signup" && adminSignupEnabled ? (
                <label className="block">
                  <span className="mb-2 block text-sm text-[#c9d8e8]">Name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#0e1a2c] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition focus:border-[#57c6a1]"
                  />
                </label>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-sm text-[#c9d8e8]">Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0e1a2c] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition focus:border-[#9bd5ff]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-[#c9d8e8]">Password</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0e1a2c] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition focus:border-[#57c6a1]"
                />
              </label>

              {error ? (
                <p className="rounded-2xl border border-[#7d324d] bg-[#30101d] px-4 py-3 text-sm text-[#ffbfd5]">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[linear-gradient(90deg,#9bd5ff,#57c6a1)] px-4 py-3 text-sm font-semibold text-[#07111d] transition hover:brightness-105 disabled:opacity-60"
              >
                {loading
                  ? "Please wait..."
                  : mode === "login" || !adminSignupEnabled
                    ? "Enter admin dashboard"
                    : "Create admin account"}
              </button>
            </form>

            <p className="mt-6 text-sm text-[#93aac4]">
              Standard user access remains available at{" "}
              <Link href="/login" className="text-[#d8f3ff] hover:underline">
                /login
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
