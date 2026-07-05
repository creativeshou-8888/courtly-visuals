import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Plus, Search, User as UserIcon, Users, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useCurrentProfile, initialsAvatar } from "@/hooks/use-current-profile";
import { createMatch, getPlayerSummary, searchPlayers } from "@/lib/match.functions";
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

function PartnerPicker({
  selected,
  onSelect,
  onClear,
}: {
  selected: { id: string; name: string; photo_url: string | null } | null;
  onSelect: (p: { id: string; name: string; photo_url: string | null }) => void;
  onClear: () => void;
}) {
  const [q, setQ] = useState("");
  const search = useServerFn(searchPlayers);
  const { data, isFetching } = useQuery({
    queryKey: ["match", "player-search", q],
    queryFn: () => search({ data: { query: q } }),
    staleTime: 15_000,
  });
  if (selected) {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
        <img
          src={selected.photo_url || initialsAvatar(selected.name)}
          alt=""
          className="h-9 w-9 rounded-full object-cover"
        />
        <p className="flex-1 truncate text-sm font-semibold text-navy">{selected.name}</p>
        <button
          type="button"
          onClick={onClear}
          className="grid h-8 w-8 place-items-center rounded-full border border-border text-navy"
          aria-label="Remove partner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }
  return (
    <div className="mt-3">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a player by name"
          className="bg-transparent text-sm text-navy placeholder:text-muted-foreground focus:outline-none"
        />
      </div>
      <div className="mt-2 max-h-56 overflow-y-auto rounded-2xl border border-border bg-background">
        {isFetching && !data ? (
          <p className="p-3 text-xs text-muted-foreground">Searching…</p>
        ) : (data ?? []).length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">No players found.</p>
        ) : (
          (data ?? []).map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p)}
              className={`flex w-full items-center gap-3 p-3 text-left hover:bg-secondary ${i > 0 ? "border-t border-border" : ""}`}
            >
              <img
                src={p.photo_url || initialsAvatar(p.name)}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy">{p.name}</p>
                {p.current_rating != null && (
                  <p className="text-[11px] text-muted-foreground">Rating {p.current_rating}</p>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function SlotList({ slots }: { slots: (string | null)[] }) {
  return (
    <div className="mt-3 space-y-2">
      {slots.map((label, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 rounded-2xl border p-3 text-sm ${
            label ? "border-navy/30 bg-navy/5 text-navy" : "border-dashed border-border bg-background text-muted-foreground"
          }`}
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-navy">
            {i + 1}
          </span>
          <span className={label ? "font-semibold" : ""}>{label ?? "Open spot"}</span>
        </div>
      ))}
    </div>
  );
}

function NewMatchPage() {
  const { opponentId, opponentName } = Route.useSearch();
  const { data: profile } = useCurrentProfile();
  const navigate = useNavigate();

  const opponentIsRealUser = !!opponentId && UUID_RE.test(opponentId);

  const [mode, setMode] = useState<"open" | "direct">(opponentId ? "direct" : "open");
  const [format, setFormat] = useState<"singles" | "doubles">("singles");
  const [doublesStyle, setDoublesStyle] = useState<"standard" | "rotating">("standard");
  const [rotatingCount, setRotatingCount] = useState<5 | 6>(5);
  const [partnerMode, setPartnerMode] = useState<"find" | "picked">("find");
  const [partner, setPartner] = useState<{ id: string; name: string; photo_url: string | null } | null>(null);

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

  // Force friendly when Rotating Doubles is picked
  useEffect(() => {
    if (format === "doubles" && doublesStyle === "rotating" && matchType === "rated") {
      setMatchType("friendly");
    }
  }, [format, doublesStyle, matchType]);

  const fetchOpp = useServerFn(getPlayerSummary);
  const oppQuery = useQuery({
    queryKey: ["match", "opponent-summary", opponentId],
    queryFn: () => fetchOpp({ data: { id: opponentId! } }),
    enabled: opponentIsRealUser && format === "singles",
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

  const meName = profile?.name?.split(" ")[0] ?? "You";
  const meLabel = `${profile?.name ?? "You"} (you)`;

  const slotsPreview: (string | null)[] = useMemo(() => {
    if (format !== "doubles") return [];
    if (doublesStyle === "standard") {
      if (partnerMode === "picked") {
        return [meLabel, partner?.name ?? null, null, null];
      }
      return [meLabel, null, null, null];
    }
    // rotating
    const total = rotatingCount;
    return [meLabel, ...Array.from({ length: total - 1 }, () => null)];
  }, [format, doublesStyle, partnerMode, partner, rotatingCount, meLabel]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const chosenCourt = (court === "__custom__" ? customCourt : court).trim();
    if (!chosenCourt) return toast.error("Choose a court or location");
    const iso = new Date(dateTime).toISOString();
    if (new Date(iso).getTime() <= Date.now()) return toast.error("Choose a future date & time");

    if (format === "doubles") {
      const isStandard = doublesStyle === "standard";
      const useDirect = false; // doubles uses participants, not opponent_id
      const partnerId = isStandard && partnerMode === "picked" ? partner?.id ?? null : null;
      if (isStandard && partnerMode === "picked" && !partnerId) {
        return toast.error("Select your partner or choose 'Find 3 players'");
      }
      mutation.mutate({
        data: {
          opponent_id: null,
          date_time: iso,
          court_location: chosenCourt,
          court_booked: courtBooked,
          match_type: matchType,
          format: "doubles",
          doubles_style: doublesStyle,
          max_players: isStandard ? 4 : rotatingCount,
          partner_id: partnerId,
          desired_min_rating: null,
          desired_max_rating: null,
          message: message.trim() || null,
        },
      });
      return;
    }

    // Singles path (unchanged)
    const useDirect = mode === "direct" && opponentIsRealUser;
    mutation.mutate({
      data: {
        opponent_id: useDirect ? opponentId! : null,
        date_time: iso,
        court_location: chosenCourt,
        court_booked: courtBooked,
        match_type: matchType,
        format: "singles",
        doubles_style: null,
        max_players: 2,
        partner_id: null,
        desired_min_rating: useDirect ? null : minRating || null,
        desired_max_rating: useDirect ? null : maxRating || null,
        message: message.trim() || null,
      },
    });
  }

  const isOpen = mode === "open" || !opponentIsRealUser;
  const isDoubles = format === "doubles";
  const primaryLabel = isDoubles
    ? "Post doubles invite"
    : isOpen
      ? "Post open invite"
      : "Send match invite";
  const minInput = localNowMinutes(0);
  const ratedDisabled = isDoubles && doublesStyle === "rotating";

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
        </section>

        {/* Doubles setup */}
        {isDoubles && (
          <section className="rounded-3xl border border-border bg-card p-5">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Game style</h2>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setDoublesStyle("standard")}
                className={`rounded-2xl px-4 py-3 text-left text-sm ${doublesStyle === "standard" ? "border-2 border-navy bg-navy/5" : "border border-border bg-background"}`}
              >
                <p className="font-semibold text-navy">Standard Doubles</p>
                <p className="mt-0.5 text-xs text-muted-foreground">4 players · fixed 2 vs 2</p>
              </button>
              <button
                type="button"
                onClick={() => setDoublesStyle("rotating")}
                className={`rounded-2xl px-4 py-3 text-left text-sm ${doublesStyle === "rotating" ? "border-2 border-navy bg-navy/5" : "border border-border bg-background"}`}
              >
                <p className="font-semibold text-navy">Rotating Doubles</p>
                <p className="mt-0.5 text-xs text-muted-foreground">5 or 6 players · take turns</p>
              </button>
            </div>

            {doublesStyle === "standard" && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Players</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => { setPartnerMode("find"); setPartner(null); }}
                    className={`rounded-full px-4 py-2.5 text-sm font-semibold ${partnerMode === "find" ? "bg-navy text-primary-foreground" : "border border-border bg-background text-navy"}`}
                  >
                    Find 3 players
                  </button>
                  <button
                    type="button"
                    onClick={() => setPartnerMode("picked")}
                    className={`rounded-full px-4 py-2.5 text-sm font-semibold ${partnerMode === "picked" ? "bg-navy text-primary-foreground" : "border border-border bg-background text-navy"}`}
                  >
                    I have a partner
                  </button>
                </div>
                {partnerMode === "picked" && (
                  <PartnerPicker
                    selected={partner}
                    onSelect={setPartner}
                    onClear={() => setPartner(null)}
                  />
                )}
                <SlotList slots={slotsPreview} />
              </div>
            )}

            {doublesStyle === "rotating" && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Player count</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRotatingCount(n as 5 | 6)}
                      className={`rounded-full px-4 py-2.5 text-sm font-semibold ${rotatingCount === n ? "bg-navy text-primary-foreground" : "border border-border bg-background text-navy"}`}
                    >
                      {n} players
                    </button>
                  ))}
                </div>
                <SlotList slots={slotsPreview} />
                <p className="mt-3 rounded-2xl border border-dashed border-court/50 bg-court/10 p-3 text-xs text-muted-foreground">
                  Rotating Doubles is friendly-only for now because partners and opponents change during the session.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Who (singles only) */}
        {!isDoubles && (
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
        )}

        {/* Type */}
        <section className="rounded-3xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Type</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["rated", "friendly"] as const).map((t) => (
              <button
                key={t}
                type="button"
                disabled={t === "rated" && ratedDisabled}
                onClick={() => setMatchType(t)}
                className={`rounded-full px-4 py-2.5 text-sm font-semibold capitalize disabled:opacity-40 ${matchType === t ? "bg-navy text-primary-foreground" : "border border-border bg-background text-navy"}`}
              >
                {t === "rated" ? "Rated match" : "Friendly match"}
              </button>
            ))}
          </div>
          {ratedDisabled && (
            <p className="mt-2 text-xs text-muted-foreground">
              Rotating Doubles is friendly-only for now.
            </p>
          )}
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

        {/* Rating range (singles open only) */}
        {!isDoubles && isOpen && (
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
          disabled={mutation.isPending}
          className="w-full rounded-full bg-court px-5 py-3.5 text-sm font-semibold text-navy transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {mutation.isPending ? "Creating…" : primaryLabel}
        </button>
      </form>
    </AppShell>
  );
}
