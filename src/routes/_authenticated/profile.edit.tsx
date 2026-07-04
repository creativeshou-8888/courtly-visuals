import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, Plus, Trash2, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { correctStartingLevel, updateMyProfile } from "@/lib/profile.functions";
import { useCurrentProfile, useInvalidateProfile, initialsAvatar } from "@/hooks/use-current-profile";
import { supabase } from "@/integrations/supabase/client";
import {
  AVAILABILITY_OPTIONS,
  COURT_TYPES,
  LEVELS,
  LEVEL_DESCRIPTIONS,
  SG_AREAS,
  type CourtEntry,
  type Level,
  decodeCourt,
  encodeCourt,
} from "@/lib/rating";

export const Route = createFileRoute("/_authenticated/profile/edit")({
  head: () => ({
    meta: [
      { title: "Edit profile · Courtly" },
      { name: "description", content: "Update your Courtly profile." },
    ],
  }),
  component: EditProfilePage,
});

function emptyCourt(): CourtEntry {
  return { name: "", area: SG_AREAS[0], type: COURT_TYPES[0], canHost: false };
}

function EditProfilePage() {
  const { data: profile } = useCurrentProfile();
  const router = useRouter();
  const invalidate = useInvalidateProfile();
  const save = useServerFn(updateMyProfile);
  const correctLevel = useServerFn(correctStartingLevel);

  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [courts, setCourts] = useState<CourtEntry[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [level, setLevel] = useState<Level | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setPhotoUrl(profile.photo_url ?? "");
    setBio(profile.bio ?? "");
    setPhone(profile.phone ?? "");
    setCourts(
      profile.preferred_courts?.length
        ? profile.preferred_courts.map(decodeCourt)
        : [emptyCourt()],
    );
    setAvailability(profile.availability ?? []);
    setLevel((profile.level as Level | null) ?? null);
  }, [profile]);

  if (!profile) return null;

  const canEditLevel = profile.rated_matches === 0;

  function toggleAvailability(v: string) {
    setAvailability((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }
  function updateCourt(i: number, patch: Partial<CourtEntry>) {
    setCourts((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function addCourt() {
    setCourts((prev) => [...prev, emptyCourt()]);
  }
  function removeCourt(i: number) {
    setCourts((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function onPickPhoto(file: File | null) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError("Photo must be under 5 MB.");
    setUploading(true);
    setError(null);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${profile!.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signErr) throw signErr;
      setPhotoUrl(signed.signedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // If level changed and it's still allowed, update level first via secure RPC.
      if (canEditLevel && level && level !== profile!.level) {
        await correctLevel({ data: { level } });
      }
      await save({
        data: {
          name: name.trim() || undefined,
          photo_url: photoUrl || null,
          bio: bio.trim() || null,
          phone: phone.trim() || null,
          preferred_courts: courts
            .filter((c) => c.name.trim())
            .map((c) => encodeCourt({ ...c, name: c.name.trim() })),
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

  const displayPhoto = photoUrl || initialsAvatar(name || "You");

  return (
    <AppShell>
      <Link
        to="/profile"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" /> Back to profile
      </Link>

      <h1 className="font-display text-2xl font-bold text-navy">Edit profile</h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        {/* Photo */}
        <div className="rounded-3xl border border-border bg-card p-5">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Profile photo
          </h2>
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-court text-navy">
              {photoUrl ? (
                <img src={displayPhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-6 w-6" />
              )}
            </div>
            <div className="flex flex-1 flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "Uploading…" : photoUrl ? "Replace" : "Upload"}
              </button>
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl("")}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-4 py-2.5 text-xs font-semibold text-navy"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Basics */}
        <div className="rounded-3xl border border-border bg-card p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-navy" htmlFor="name">Name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
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

        {/* Starting level */}
        <div className="rounded-3xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Starting level
          </h2>
          {canEditLevel ? (
            <>
              <p className="mt-1 text-xs text-muted-foreground">
                You can correct your starting level until your first rated match. After that,
                it's locked and only rated match results move your rating.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {LEVELS.map((lv) => {
                  const key = lv.toFixed(1);
                  const active = level === lv;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setLevel(lv)}
                      className={`rounded-2xl border-2 px-3 py-2.5 text-left text-xs transition-colors ${
                        active
                          ? "border-navy bg-court/60"
                          : "border-border bg-background hover:border-navy/30"
                      }`}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Level {key}
                      </p>
                      <p className="mt-0.5 font-medium text-navy">
                        {LEVEL_DESCRIPTIONS[key].headline}
                      </p>
                      {active && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-navy">
                          <Check className="h-3 w-3" /> Selected
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Level is locked after your first rated match. Your rating now moves only from
              rated match results.
            </p>
          )}
        </div>

        {/* Courts */}
        <div className="rounded-3xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Preferred courts
          </h2>
          <div className="mt-3 space-y-3">
            {courts.map((c, i) => (
              <div key={i} className="rounded-2xl border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Court {i + 1}
                  </p>
                  {courts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCourt(i)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  )}
                </div>
                <div className="mt-2 space-y-2">
                  <input
                    value={c.name}
                    onChange={(e) => updateCourt(i, { name: e.target.value })}
                    placeholder="Court or condo name"
                    maxLength={80}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={c.area}
                      onChange={(e) => updateCourt(i, { area: e.target.value })}
                      className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court"
                    >
                      {SG_AREAS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                    <select
                      value={c.type}
                      onChange={(e) => updateCourt(i, { type: e.target.value })}
                      className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court"
                    >
                      {COURT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-navy">
                    <input
                      type="checkbox"
                      checked={c.canHost}
                      onChange={(e) => updateCourt(i, { canHost: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-navy focus:ring-court"
                    />
                    Can host matches here?
                  </label>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addCourt}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-border bg-background px-4 py-2.5 text-xs font-semibold text-navy hover:bg-secondary"
            >
              <Plus className="h-4 w-4" /> Add another court
            </button>
          </div>
        </div>

        {/* Availability */}
        <div className="rounded-3xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Availability
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {AVAILABILITY_OPTIONS.map((a) => {
              const active = availability.includes(a);
              return (
                <button type="button" key={a}
                  onClick={() => toggleAvailability(a)}
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
