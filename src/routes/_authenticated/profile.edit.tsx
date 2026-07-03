import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { updateMyProfile } from "@/lib/profile.functions";
import { useCurrentProfile, useInvalidateProfile } from "@/hooks/use-current-profile";
import { AVAILABILITY_OPTIONS, COURT_OPTIONS } from "@/lib/rating";

export const Route = createFileRoute("/_authenticated/profile/edit")({
  head: () => ({
    meta: [
      { title: "Edit profile · Courtly" },
      { name: "description", content: "Update your Courtly profile." },
    ],
  }),
  component: EditProfilePage,
});

function EditProfilePage() {
  const { data: profile } = useCurrentProfile();
  const router = useRouter();
  const invalidate = useInvalidateProfile();
  const save = useServerFn(updateMyProfile);

  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [courts, setCourts] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setPhotoUrl(profile.photo_url ?? "");
    setBio(profile.bio ?? "");
    setPhone(profile.phone ?? "");
    setCourts(profile.preferred_courts ?? []);
    setAvailability(profile.availability ?? []);
  }, [profile]);

  function toggle(list: string[], v: string, setter: (n: string[]) => void) {
    setter(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await save({
        data: {
          name: name.trim() || undefined,
          photo_url: photoUrl.trim() || null,
          bio: bio.trim() || null,
          phone: phone.trim() || null,
          preferred_courts: courts,
          availability,
        },
      });
      await invalidate();
      router.navigate({ to: "/profile" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return null;

  return (
    <AppShell>
      <Link
        to="/profile"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" /> Back to profile
      </Link>

      <h1 className="font-display text-2xl font-bold text-navy">Edit profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your playing level and rating can't be changed here.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div className="rounded-3xl border border-border bg-card p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-navy" htmlFor="name">Name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
              className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-navy" htmlFor="photo">Photo URL</label>
            <input id="photo" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} maxLength={2048}
              placeholder="https://…"
              className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-navy" htmlFor="bio">Bio</label>
            <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={3}
              className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-navy" htmlFor="phone">
              WhatsApp / phone
            </label>
            <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30}
              placeholder="+65 8123 4567"
              className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court" />
            <p className="text-[11px] text-muted-foreground">
              Never shown publicly. Shared only with accepted match opponents.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Preferred courts
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {COURT_OPTIONS.map((c) => {
              const active = courts.includes(c);
              return (
                <button type="button" key={c}
                  onClick={() => toggle(courts, c, setCourts)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium ${
                    active ? "border-navy bg-navy text-primary-foreground" : "border-border bg-background text-navy"
                  }`}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Availability
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {AVAILABILITY_OPTIONS.map((a) => {
              const active = availability.includes(a);
              return (
                <button type="button" key={a}
                  onClick={() => toggle(availability, a, setAvailability)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium ${
                    active ? "border-navy bg-navy text-primary-foreground" : "border-border bg-background text-navy"
                  }`}>
                  {a}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="rounded-2xl bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive">
            {error}
          </p>
        )}

        <button type="submit" disabled={saving}
          className="w-full rounded-full bg-navy px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </AppShell>
  );
}
