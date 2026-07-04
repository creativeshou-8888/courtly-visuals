import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Mail } from "lucide-react";
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

function friendlyAuthError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Email or password is incorrect. Please check and try again.";
  }
  if (m.includes("email not confirmed")) {
    return "Please confirm your email before signing in. Check your inbox for the verification link.";
  }
  return raw;
}

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Post-signup state
  const [signupSent, setSignupSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.navigate({ to: "/home", replace: true });
    });
  }, [router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || signupSent) return;
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (err) throw err;
        // If email confirmation is required, session will be null.
        if (!data.session) {
          setSentEmail(email);
          setSignupSent(true);
          setResendCooldown(60);
          return;
        }
        router.navigate({ to: "/home", replace: true });
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        router.navigate({ to: "/home", replace: true });
      }
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : "Something went wrong"));
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    if (resendCooldown > 0) return;
    setResendMsg(null);
    try {
      const { error: err } = await supabase.auth.resend({
        type: "signup",
        email: sentEmail,
        options: { emailRedirectTo: window.location.origin },
      });
      if (err) throw err;
      setResendMsg("We've sent a fresh verification email.");
      setResendCooldown(60);
    } catch (err) {
      setResendMsg(err instanceof Error ? err.message : "Couldn't resend right now.");
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
        {signupSent ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-court">
              <Mail className="h-6 w-6 text-navy" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-navy">Check your email</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              We sent a verification link to
            </p>
            <p className="mt-1 break-all text-sm font-semibold text-navy">{sentEmail}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Click the link inside to activate your account, then come back here to sign in.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Can't see it? Check your spam or promotions folder.
            </p>

            {resendMsg && (
              <p className="mt-4 rounded-2xl bg-secondary/60 px-4 py-2 text-xs font-medium text-navy">
                {resendMsg}
              </p>
            )}

            <button
              onClick={resend}
              disabled={resendCooldown > 0}
              className="mt-6 w-full rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-navy transition-colors hover:bg-secondary disabled:opacity-50"
            >
              {resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : "Resend verification email"}
            </button>
            <button
              onClick={() => {
                setSignupSent(false);
                setMode("signin");
                setPassword("");
              }}
              className="mt-3 w-full rounded-full bg-navy px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
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
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-full border border-border bg-background px-4 py-3 pr-12 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-navy"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {mode === "signin" && (
                  <div className="pt-1 text-right">
                    <Link to="/forgot-password" className="text-xs font-medium text-navy hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                )}
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
          </>
        )}
      </main>
    </div>
  );
}
