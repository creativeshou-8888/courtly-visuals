import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Check } from "lucide-react";
import { completeOnboarding } from "@/lib/profile.functions";
import { useInvalidateProfile } from "@/hooks/use-current-profile";
import {
  AVAILABILITY_OPTIONS,
  COURT_OPTIONS,
  LEVELS,
  LEVEL_DESCRIPTIONS,
  type Level,
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

function OnboardingPage() {
  const router = useRouter();
  const invalidate = useInvalidateProfile();
  const submit = useServerFn(completeOnboarding);

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [level, setLevel] = useState<Level | null>(null);
  const [courts, setCourts] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function finish() {
    if (!level || !name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await submit({
        data: {
          name: name.trim(),
          photo_url: photoUrl.trim() || null,
          level,
          preferred_courts: courts,
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
            You're in
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-navy">
            Your starting rating
          </h1>
          <p className="mt-3 rating-hero text-6xl leading-none text-navy">{rating}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Provisional
          </p>
          <p className="mt-5 text-sm text-muted-foreground">
            Your first 5 rated matches calibrate your rating. It may swing more during this
            provisional window.
          </p>
          <button
            onClick={() => router.navigate({ to: "/find" })}
            className="mt-6 w-full rounded-full bg-navy px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            Find your first opponent
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
              Optional — a real photo helps opponents recognise you on court.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-court text-navy">
                {photoUrl ? (
                  <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-7 w-7" />
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-semibold text-navy" htmlFor="photo">
                  Photo URL
                </label>
                <input
                  id="photo"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-2xl border border-border bg-card px-3 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court"
                />
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
                    className={`w-full rounded-3xl border p-4 text-left transition-all ${
                      active
                        ? "border-navy bg-court/40 shadow-sm"
                        : "border-border bg-card hover:border-navy/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-base font-semibold text-navy">
                        {info.headline}
                      </span>
                      {active && (
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-navy text-court">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{info.body}</p>
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
              Pick venues you play at regularly. You can change this later.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {COURT_OPTIONS.map((c) => {
                const active = courts.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggle(courts, c, setCourts)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-navy bg-navy text-primary-foreground"
                        : "border-border bg-card text-navy"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 5 && (
          <section>
            <h1 className="font-display text-2xl font-bold text-navy">When can you play?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose all that apply.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {AVAILABILITY_OPTIONS.map((a) => {
                const active = availability.includes(a);
                return (
                  <button
                    key={a}
                    onClick={() => toggle(availability, a, setAvailability)}
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
              WhatsApp / phone number
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Only shared with opponents after you both accept a match. Never visible on your
              public profile.
            </p>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
              placeholder="+65 8123 4567"
              className="mt-6 w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-navy focus:outline-none focus:ring-2 focus:ring-court"
            />
          </section>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-2xl bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="pt-4">
        {step < TOTAL_STEPS ? (
          <button
            disabled={!canNext}
            onClick={() => setStep(step + 1)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-navy px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            disabled={submitting || !level || !name.trim()}
            onClick={finish}
            className="w-full rounded-full bg-navy px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? "Setting you up…" : "Finish setup"}
          </button>
        )}
      </div>
    </div>
  );
}
