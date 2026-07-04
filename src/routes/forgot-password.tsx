import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Forgot password · Courtly" },
      { name: "description", content: "Reset your Courtly account password." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Link to="/auth" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </header>
      <main className="mx-auto grid max-w-md gap-6 px-5 pt-8 pb-16">
        {sent ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-court">
              <Mail className="h-6 w-6 text-navy" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-navy">Check your email</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              If an account exists for <span className="font-semibold text-navy">{email}</span>, we've
              sent a reset link. Check your spam folder if you don't see it.
            </p>
          </div>
        ) : (
          <>
            <div>
              <h1 className="font-display text-3xl font-bold text-navy">Forgot password</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter the email you used to sign up and we'll send you a reset link.
              </p>
            </div>
            <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-border bg-card p-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-navy" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                {submitting ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
