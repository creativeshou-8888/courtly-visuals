import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Check, Plus, Trash2, Upload } from "lucide-react";
import { completeOnboarding } from "@/lib/profile.functions";
import { useCurrentProfile, useInvalidateProfile } from "@/hooks/use-current-profile";
import { supabase } from "@/integrations/supabase/client";
import {
  AVAILABILITY_OPTIONS,
  COURT_TYPES,
  LEVELS,
  LEVEL_DESCRIPTIONS,
  SG_AREAS,
  type CourtEntry,
  type Level,
  encodeCourt,
  ratingForLevel,
} from "@/lib/rating";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started · Courtly" },
      { name: "description", content: "Set up your Courtly profile." },
    ],
  }),
  component: OnboardingPage,
});

const TOTAL_STEPS = 6;

function emptyCourt(): CourtEntry {
  return { name: "", area: SG_AREAS[0], type: COURT_TYPES[0], canHost: false };
}

function OnboardingPage() {
  const router = useRouter();
  const { data: profile } = useCurrentProfile();
  const invalidate = useInvalidateProfile();
  const submit = useServerFn(completeOnboarding);

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [level, setLevel] = useState<Level | null>(null);
  const [courts, setCourts] = useState<CourtEntry[]>([emptyCourt()]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill the name captured at signup (from profile row created by trigger).
  useEffect(() => {
    if (!prefilled && profile?.name) {
      setName(profile.name);
      setPrefilled(true);
    }
  }, [profile?.name, prefilled]);

  function toggleAvailability(value: string) {
    setAvailability((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  async function onPickPhoto(file: File | null) {
    if (!file || !profile?.id) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5 MB.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5); // 5 years
      if (signErr) throw signErr;
      setPhotoUrl(signed.signedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
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

  async function finish() {
    if (!level || !name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const filledCourts = courts
        .filter((c) => c.name.trim())
        .map((c) => encodeCourt({ ...c, name: c.name.trim() }));
      await submit({
        data: {
          name: name.trim(),
          photo_url: photoUrl || null,
          level,
          preferred_courts: filledCourts,
          availability,
          phone: phone.trim() || null,
          bio: null,
        },
      });
      await invalidate();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (done && level) {
    const rating = ratingForLevel(level);
    return (
      <div className="mx-auto grid min-h-screen max-w-md place-items-center px-5">
        <div className="w-full rounded-3xl border border-border bg-card p-8 text-center">
          <span className="inline-flex items-center rounded-full bg-court px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-navy">
            You're officially rated
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-navy">
            Your starting rating
          </h1>
          <p className="mt-4 rating-hero text-6xl leading-none text-navy">{rating}</p>
          <p className="mt-2 text-sm font-semibold text-navy">Courtly Rating</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Provisional · 0/5 matches
          </p>
          <p className="mt-5 text-sm text-muted-foreground">
            Your first 5 rated matches calibrate your rating. Expect bigger swings during this
            provisional window.
          </p>
          <button
            onClick={() => router.navigate({ to: "/find" })}
            className="mt-6 w-full rounded-full bg-navy px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            Find your first opponent
          </button>
          <button
            onClick={() => router.navigate({ to: "/home" })}
            className="mt-2 w-full rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-navy hover:bg-secondary"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const canNext =
    (step === 1 && name.trim().length > 0) ||
    step === 2 ||
    (step === 3 && level !== null) ||
    step === 4 ||
    step === 5 ||
    step === 6;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-6">
      {/* Progress */}
      <div className="mb-6 flex items-center gap-2">
        {step > 1 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-navy"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <span className="h-9 w-9" />
        )}
        <div className="flex flex-1 items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < step ? "bg-navy" : "bg-secondary"
              }`}
            />
          ))}
        </div>
        <span className="w-10 text-right text-xs font-medium text-muted-foreground">
          {step}/{TOTAL_STEPS}
        </span>
      </div>

      <div className="flex-1">
        {step === 1 && (
          <section>
            <h1 className="font-display text-2xl font-bold text-navy">What's your name?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This is how other players will see you on Courtly.
            </p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="e.g. Alex Chen"
              className="mt-6 w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-navy focus:outline-none focus:ring-2 focus:ring-court"
            />
          </section>
        )}

        {step === 2 && (
          <section>
            <h1 className="font-display text-2xl font-bold text-navy">Add a photo</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              A real photo helps opponents recognise you on court. You can skip and add one later.
            </p>
            <div className="mt-6 flex flex-col items-center gap-4">
              <div className="grid h-32 w-32 place-items-center overflow-hidden rounded-full bg-court text-navy">
                {photoUrl ? (
                  <img src={photoUrl} alt="Your profile" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-9 w-9" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
              />
              <div className="flex w-full gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-navy px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading…" : photoUrl ? "Replace photo" : "Upload photo"}
                </button>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl("")}
                    className="inline-flex items-center justify-center gap-1 rounded-full border border-border bg-background px-4 py-3 text-sm font-semibold text-navy"
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h1 className="font-display text-2xl font-bold text-navy">Your playing level</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pick what best describes your current game. Be honest — this sets your starting
              rating and helps us find fair matches.
            </p>
            <div className="mt-5 space-y-2.5">
              {LEVELS.map((lv) => {
                const key = lv.toFixed(1);
                const info = LEVEL_DESCRIPTIONS[key];
                const active = level === lv;
                return (
                  <button
                    key={key}
                    onClick={() => setLevel(lv)}
                    className={`w-full rounded-3xl border-2 p-4 text-left transition-all ${
                      active
                        ? "border-navy bg-court/60 shadow-sm"
                        : "border-border bg-card hover:border-navy/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Level {key}
                        </p>
                        <p className="font-display text-base font-semibold text-navy">
                          {info.headline}
                        </p>
                      </div>
                      {active && (
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy text-court">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">{info.body}</p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <h1 className="font-display text-2xl font-bold text-navy">Preferred courts</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Add the venues you play at regularly. You can add more or edit these later.
            </p>
            <div className="mt-5 space-y-3">
              {courts.map((c, i) => (
                <div key={i} className="rounded-3xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                  <div className="mt-3 space-y-3">
                    <input
                      value={c.name}
                      onChange={(e) => updateCourt(i, { name: e.target.value })}
                      placeholder="Court or condo name"
                      maxLength={80}
                      className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={c.area}
                        onChange={(e) => updateCourt(i, { area: e.target.value })}
                        className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court"
                      >
                        {SG_AREAS.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                      <select
                        value={c.type}
                        onChange={(e) => updateCourt(i, { type: e.target.value })}
                        className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court"
                      >
                        {COURT_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-navy">
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
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-border bg-background px-4 py-3 text-sm font-semibold text-navy hover:bg-secondary"
              >
                <Plus className="h-4 w-4" /> Add another court
              </button>
            </div>
          </section>
        )}

        {step === 5 && (
          <section>
            <h1 className="font-display text-2xl font-bold text-navy">When can you play?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose all that apply. You can update this any time.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {AVAILABILITY_OPTIONS.map((a) => {
                const active = availability.includes(a);
                return (
                  <button
                    key={a}
                    onClick={() => toggleAvailability(a)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-navy bg-navy text-primary-foreground"
                        : "border-border bg-card text-navy"
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 6 && (
          <section>
            <h1 className="font-display text-2xl font-bold text-navy">
              How can opponents reach you?
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your contact stays private. It's only shared with an opponent after you both accept
              a match. Never visible on your public profile.
            </p>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
              placeholder="+65 8123 4567 (WhatsApp or phone)"
              className="mt-6 w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-navy focus:outline-none focus:ring-2 focus:ring-court"
            />
            <p className="mt-3 text-xs text-muted-foreground">
              This step is optional — you can add or change your contact later from your profile.
            </p>
          </section>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-2xl bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="pt-4 space-y-2">
        {step < TOTAL_STEPS ? (
          <>
            <button
              disabled={!canNext}
              onClick={() => setStep(step + 1)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-navy px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
            {step === 2 && (
              <button
                onClick={() => setStep(step + 1)}
                className="w-full rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-navy hover:bg-secondary"
              >
                Skip for now
              </button>
            )}
          </>
        ) : (
          <>
            <button
              disabled={submitting || !level || !name.trim()}
              onClick={finish}
              className="w-full rounded-full bg-navy px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? "Setting you up…" : "Finish setup"}
            </button>
            <button
              disabled={submitting || !level || !name.trim()}
              onClick={() => {
                setPhone("");
                finish();
              }}
              className="w-full rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-navy hover:bg-secondary disabled:opacity-60"
            >
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
