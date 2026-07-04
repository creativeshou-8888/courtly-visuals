import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile } from "@/hooks/use-current-profile";

export const Route = createFileRoute("/_authenticated/profile/security")({
  head: () => ({
    meta: [
      { title: "Account security · Courtly" },
      { name: "description", content: "Manage your Courtly account password." },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  const router = useRouter();
  const { data: profile } = useCurrentProfile();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPw.length < 6) return setError("New password must be at least 6 characters.");
    if (newPw !== confirmPw) return setError("New passwords don't match.");
    if (!profile?.email) return setError("Email not available. Please refresh.");

    setSaving(true);
    try {
      // Re-verify current password by attempting a sign-in with it.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPw,
      });
      if (signInErr) {
        setError("Current password is incorrect.");
        return;
      }
      const { error: updErr } = await supabase.auth.updateUser({ password: newPw });
      if (updErr) throw updErr;
      setSuccess(true);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <button
        onClick={() => router.navigate({ to: "/profile" })}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" /> Back to profile
      </button>

      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-court">
          <ShieldCheck className="h-5 w-5 text-navy" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Account security</h1>
          <p className="text-sm text-muted-foreground">Change the password on {profile?.email}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <PasswordField
          id="current"
          label="Current password"
          value={currentPw}
          onChange={setCurrentPw}
          show={showCurrent}
          toggleShow={() => setShowCurrent((v) => !v)}
          autoComplete="current-password"
        />
        <PasswordField
          id="new"
          label="New password"
          value={newPw}
          onChange={setNewPw}
          show={showNew}
          toggleShow={() => setShowNew((v) => !v)}
          autoComplete="new-password"
        />
        <PasswordField
          id="confirm"
          label="Confirm new password"
          value={confirmPw}
          onChange={setConfirmPw}
          show={showNew}
          toggleShow={() => setShowNew((v) => !v)}
          autoComplete="new-password"
        />

        {error && (
          <p className="rounded-2xl bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-2xl bg-court/40 px-4 py-2 text-xs font-medium text-navy">
            Password updated.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-navy px-5 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Updating…" : "Update password"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Forgot your current password?{" "}
        <Link to="/forgot-password" className="font-medium text-navy hover:underline">
          Reset via email
        </Link>
      </p>
    </AppShell>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  toggleShow,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  toggleShow: () => void;
  autoComplete: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-navy" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          required
          minLength={6}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-full border border-border bg-background px-4 py-3 pr-12 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court"
        />
        <button
          type="button"
          onClick={toggleShow}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-navy"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
