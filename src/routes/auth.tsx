import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · Courtly" },
      { name: "description", content: "Sign in or create your Courtly account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.navigate({ to: "/home", replace: true });
    });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
      }
      router.navigate({ to: "/home", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-navy">
            <span className="h-3 w-3 rounded-full bg-court" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-navy">
            Courtly
          </span>
        </Link>
      </header>

      <main className="mx-auto grid max-w-md gap-6 px-5 pt-10 pb-16">
        <div>
          <h1 className="font-display text-3xl font-bold text-navy">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to find matches and track your rating."
              : "Sign up to join the Singapore rated tennis community."}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-border bg-card p-6">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-navy" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                minLength={1}
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-full border border-border bg-background px-4 py-3 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-navy" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-full border border-border bg-background px-4 py-3 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-navy" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-full border border-border bg-background px-4 py-3 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court"
            />
          </div>

          {error && (
            <p className="rounded-2xl bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-navy px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode(mode === "signin" ? "signup" : "signin");
          }}
          className="text-center text-sm text-muted-foreground hover:text-navy"
        >
          {mode === "signin"
            ? "New to Courtly? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </main>
    </div>
  );
}
