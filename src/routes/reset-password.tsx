import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password · Courtly" },
      { name: "description", content: "Set a new password for your Courtly account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase places the recovery info in the URL hash. Wait for the client to
    // consume it and produce a session, otherwise updateUser() will fail.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      setTimeout(() => router.navigate({ to: "/home", replace: true }), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto grid max-w-md gap-6 px-5 pt-16 pb-16">
        <div>
          <h1 className="font-display text-3xl font-bold text-navy">Set a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a password you haven't used elsewhere.
          </p>
        </div>

        {done ? (
          <div className="rounded-3xl border border-border bg-card p-6 text-center text-sm text-navy">
            Password updated. Redirecting…
          </div>
        ) : !ready ? (
          <div className="rounded-3xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Verifying your reset link…
            <div className="mt-4">
              <Link to="/forgot-password" className="text-xs font-medium text-navy hover:underline">
                Link expired? Request a new one
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-border bg-card p-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-navy" htmlFor="password">New password</label>
              <div className="relative">
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-full border border-border bg-background px-4 py-3 pr-12 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-navy"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-navy" htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                type={show ? "text" : "password"}
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              className="w-full rounded-full bg-navy px-5 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Update password"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
