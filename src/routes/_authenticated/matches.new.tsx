import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Plus, User as UserIcon, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { createMatch, getPlayerSummary } from "@/lib/match.functions";
import { decodeCourt } from "@/lib/rating";

type Search = { opponentId?: string; opponentName?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/_authenticated/matches/new")({
  head: () => ({
    meta: [
      { title: "Create match · Courtly" },
      { name: "description", content: "Post an open invite or invite a specific player." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    opponentId: typeof s.opponentId === "string" ? s.opponentId : undefined,
    opponentName: typeof s.opponentName === "string" ? s.opponentName : undefined,
  }),
  component: NewMatchPage,
});

function localNowMinutes(offsetMinutes = 60) {
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  d.setSeconds(0, 0);
  const tz = d.getTimezoneOffset();
  return new Date(d.getTime() - tz * 60_000).toISOString().slice(0, 16);
}

function NewMatchPage() {
  const { opponentId, opponentName } = Route.useSearch();
  const { data: profile } = useCurrentProfile();
  const navigate = useNavigate();

  const opponentIsRealUser = !!opponentId && UUID_RE.test(opponentId);

  const [mode, setMode] = useState<"open" | "direct">(opponentId ? "direct" : "open");
  const [format, setFormat] = useState<"singles" | "doubles">("singles");
  const [matchType, setMatchType] = useState<"rated" | "friendly">("rated");
  const [dateTime, setDateTime] = useState<string>(localNowMinutes(60 * 24));
  const [court, setCourt] = useState<string>("");
  const [customCourt, setCustomCourt] = useState<string>("");
  const [courtBooked, setCourtBooked] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [maxRating, setMaxRating] = useState<number>(0);
  const [message, setMessage] = useState<string>("");

  const currentRating = profile?.current_rating ?? 1200;
  useEffect(() => {
    setMinRating(Math.max(0, currentRating - 200));
    setMaxRating(currentRating + 200);
  }, [currentRating]);

  const preferredCourts = useMemo(
    () => (profile?.preferred_courts ?? []).map(decodeCourt).map((c) => c.name).filter(Boolean),
    [profile?.preferred_courts],
  );
  useEffect(() => {
    if (!court && preferredCourts.length) setCourt(preferredCourts[0]);
  }, [preferredCourts, court]);

  const fetchOpp = useServerFn(getPlayerSummary);
  const oppQuery = useQuery({
    queryKey: ["match", "opponent-summary", opponentId],
    queryFn: () => fetchOpp({ data: { id: opponentId! } }),
    enabled: opponentIsRealUser,
  });

  const submit = useServerFn(createMatch);
  const mutation = useMutation({
    mutationFn: submit,
    onSuccess: (row: any) => {
      toast.success("Match invite created");
      navigate({ to: "/matches/$id", params: { id: row.id } });
    },
    onError: (err: any) => toast.error(err?.message ?? "Could not create match"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (format === "doubles") return;
    const chosenCourt = (court === "__custom__" ? customCourt : court).trim();
    if (!chosenCourt) return toast.error("Choose a court or location");
    const iso = new Date(dateTime).toISOString();
    if (new Date(iso).getTime() <= Date.now()) return toast.error("Choose a future date & time");

    const useDirect = mode === "direct" && opponentIsRealUser;
    mutation.mutate({
      data: {
        opponent_id: useDirect ? opponentId! : null,
        date_time: iso,
        court_location: chosenCourt,
        court_booked: courtBooked,
        match_type: matchType,
        format,
        desired_min_rating: useDirect ? null : minRating || null,
        desired_max_rating: useDirect ? null : maxRating || null,
        message: message.trim() || null,
      },
    });
  }

  const isOpen = mode === "open" || !opponentIsRealUser;
  const isDoubles = format === "doubles";
  const primaryLabel = isDoubles
    ? "Doubles setup coming next"
    : isOpen
      ? "Post open invite"
      : "Send match invite";
  const minInput = localNowMinutes(0);

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => window.history.back()}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-navy">Create match</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isDoubles ? "Doubles match invite" : "Singles match invite"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Format */}
        <section className="rounded-3xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Format</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormat("singles")}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold ${format === "singles" ? "bg-navy text-primary-foreground" : "border border-border bg-background text-navy"}`}
            >
              <UserIcon className="h-4 w-4" /> Singles · 1 vs 1
            </button>
            <button
              type="button"
              onClick={() => setFormat("doubles")}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold ${format === "doubles" ? "bg-navy text-primary-foreground" : "border border-border bg-background text-navy"}`}
            >
              <Users className="h-4 w-4" /> Doubles · 2 vs 2
            </button>
          </div>
          {isDoubles && (
            <div className="mt-3 rounded-2xl border border-dashed border-court/50 bg-court/10 p-3">
              <p className="text-sm font-semibold text-navy">Doubles match setup coming next</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Partner and team selection isn't available yet. Switch to Singles to create a match now.
              </p>
            </div>
          )}
        </section>

        {/* Who */}
        <section className="rounded-3xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Who</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("open")}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold ${mode === "open" ? "bg-navy text-primary-foreground" : "border border-border bg-background text-navy"}`}
            >
              Open invite
            </button>
            <button
              type="button"
              onClick={() => setMode("direct")}
              disabled={!opponentId}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${mode === "direct" ? "bg-navy text-primary-foreground" : "border border-border bg-background text-navy"}`}
            >
              Invite specific player
            </button>
          </div>

          {mode === "direct" && opponentId && (
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-navy">
                <UserIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy">
                  {oppQuery.data?.name ?? opponentName ?? "Selected player"}
                </p>
                {!opponentIsRealUser && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Demo player — switch to open invite to post publicly.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Type */}
        <section className="rounded-3xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Type</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["rated", "friendly"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMatchType(t)}
                className={`rounded-full px-4 py-2.5 text-sm font-semibold capitalize ${matchType === t ? "bg-navy text-primary-foreground" : "border border-border bg-background text-navy"}`}
              >
                {t === "rated" ? "Rated match" : "Friendly match"}
              </button>
            ))}
          </div>
        </section>

        {/* Date & time */}
        <section className="rounded-3xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Date & time</h2>
          <input
            type="datetime-local"
            required
            min={minInput}
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className="mt-3 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court"
          />
        </section>

        {/* Location */}
        <section className="rounded-3xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-4 w-4" /> Location
          </h2>
          <div className="mt-3 space-y-2">
            {preferredCourts.map((c) => (
              <label key={c} className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm ${court === c ? "border-navy bg-navy/5 text-navy" : "border-border bg-background text-navy"}`}>
                <input type="radio" name="court" value={c} checked={court === c} onChange={() => setCourt(c)} />
                {c}
              </label>
            ))}
            <label className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm ${court === "__custom__" ? "border-navy bg-navy/5 text-navy" : "border-border bg-background text-navy"}`}>
              <input type="radio" name="court" value="__custom__" checked={court === "__custom__"} onChange={() => setCourt("__custom__")} />
              <Plus className="h-4 w-4" /> Add another court/location
            </label>
            {court === "__custom__" && (
              <input
                type="text"
                placeholder="e.g. The Interlace condo court"
                value={customCourt}
                onChange={(e) => setCustomCourt(e.target.value)}
                maxLength={200}
                className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court"
              />
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCourtBooked(true)}
              className={`rounded-full px-4 py-2.5 text-xs font-semibold ${courtBooked ? "bg-navy text-primary-foreground" : "border border-border bg-background text-navy"}`}
            >
              Court booked
            </button>
            <button
              type="button"
              onClick={() => setCourtBooked(false)}
              className={`rounded-full px-4 py-2.5 text-xs font-semibold ${!courtBooked ? "bg-navy text-primary-foreground" : "border border-border bg-background text-navy"}`}
            >
              Arrange together
            </button>
          </div>
        </section>

        {/* Rating range (open only) */}
        {isOpen && (
          <section className="rounded-3xl border border-border bg-card p-5">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Opponent rating range</h2>
            <p className="mt-1 text-xs text-muted-foreground">Default: your rating ±200 ({currentRating})</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-xs font-medium text-navy">
                Min
                <input
                  type="number"
                  min={0}
                  max={4000}
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court"
                />
              </label>
              <label className="text-xs font-medium text-navy">
                Max
                <input
                  type="number"
                  min={0}
                  max={4000}
                  value={maxRating}
                  onChange={(e) => setMaxRating(Number(e.target.value))}
                  className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court"
                />
              </label>
            </div>
          </section>
        )}

        {/* Message */}
        <section className="rounded-3xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Message (optional)</h2>
          <textarea
            rows={3}
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Say hi or share any details"
            className="mt-3 w-full resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-court"
          />
        </section>

        <button
          type="submit"
          disabled={mutation.isPending || isDoubles}
          className="w-full rounded-full bg-court px-5 py-3.5 text-sm font-semibold text-navy transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {mutation.isPending ? "Creating…" : primaryLabel}
        </button>
      </form>
    </AppShell>
  );
}
