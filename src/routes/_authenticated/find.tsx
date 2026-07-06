import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { PlayerCard } from "@/components/PlayerBits";
import { FormatBadge, normalizeFormat } from "@/components/FormatBadge";
import type { Player } from "@/lib/mock-data";
import { listOpenInvitesForMe, searchPlayers, type MatchRow } from "@/lib/match.functions";
import { initialsAvatar, useCurrentProfile } from "@/hooks/use-current-profile";
import { decodeCourt } from "@/lib/rating";

export const Route = createFileRoute("/_authenticated/find")({
  head: () => ({
    meta: [
      { title: "Find Players · Courtly" },
      {
        name: "description",
        content: "Filter by rating, location and availability to find your next match.",
      },
    ],
  }),
  component: FindPage,
});

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type FindInvite = MatchRow & {
  creator: {
    id: string;
    name: string;
    photo_url: string | null;
    current_rating: number | null;
  } | null;
  joined_count: number | null;
  viewer_joined: boolean;
  viewer_within_rating_range: boolean;
};

function OpenInvitesNearMe({
  search,
  ratingEnabled,
  minRating,
  maxRating,
}: {
  search: string;
  ratingEnabled: boolean;
  minRating: number;
  maxRating: number;
}) {
  const fetch = useServerFn(listOpenInvitesForMe);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["find", "open-invites"],
    queryFn: () => fetch(),
    staleTime: 15_000,
    retry: 1,
  });
  const [formatFilter, setFormatFilter] = useState<"all" | "singles" | "doubles">("all");
  const allInvites = useMemo(() => (data ?? []) as FindInvite[], [data]);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const invites = useMemo(() => {
    return allInvites.filter((m) => {
      if (formatFilter !== "all" && normalizeFormat(m.format) !== formatFilter) return false;
      const isDoubles = normalizeFormat(m.format) === "doubles";
      const matchesSearch =
        normalizedSearch.length === 0 ||
        (m.creator?.name ?? "").toLocaleLowerCase().includes(normalizedSearch) ||
        m.court_location.toLocaleLowerCase().includes(normalizedSearch);
      if (!matchesSearch) return false;
      if (normalizedSearch.length > 0) return true;
      if (isDoubles) return true;
      if (!isDoubles && !m.viewer_within_rating_range) return false;
      if (!ratingEnabled) return true;
      const creatorRating = m.creator?.current_rating;
      return creatorRating == null || (creatorRating >= minRating && creatorRating <= maxRating);
    });
  }, [allInvites, formatFilter, normalizedSearch, ratingEnabled, minRating, maxRating]);

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Open invites near your level
        </h2>
      </div>

      <div className="mb-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {(["all", "singles", "doubles"] as const).map((f) => {
          const label = f === "all" ? "All formats" : f === "singles" ? "Singles" : "Doubles";
          const active = formatFilter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFormatFilter(f)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                active
                  ? "bg-navy text-primary-foreground"
                  : "border border-border bg-card text-navy"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Loading open invites…
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-destructive/40 bg-destructive/5 p-5 text-sm">
          <p className="font-semibold text-destructive">Couldn't load open invites</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(error as Error)?.message ?? "Something went wrong. Please try again."}
          </p>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-3 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-navy disabled:opacity-60"
          >
            {isFetching ? "Retrying…" : "Try again"}
          </button>
        </div>
      ) : invites.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-6 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-secondary text-navy">
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="mt-3 text-sm text-navy">No open invites in your rating range right now.</p>
          <p className="mt-1 text-xs text-muted-foreground">Check back soon, or post your own.</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-border bg-card">
          {invites.map((m, i) => {
            const isDoubles = normalizeFormat(m.format) === "doubles";
            const joined = isDoubles ? (m.joined_count ?? 1) : 0;
            const remaining = isDoubles ? Math.max(0, (m.max_players ?? 4) - joined) : null;
            const viewerJoined = !!m.viewer_joined;
            const outsideRating = !isDoubles && !m.viewer_within_rating_range;
            const content = (
              <>
                <img
                  src={m.creator?.photo_url || initialsAvatar(m.creator?.name || "Player")}
                  alt=""
                  className="h-11 w-11 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-navy">
                      {m.creator?.name ?? "Player"}
                      {!isDoubles && m.creator?.current_rating != null && (
                        <span className="ml-1 text-xs font-medium text-muted-foreground">
                          · {m.creator.current_rating}
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {formatWhen(m.date_time)} · {m.court_location}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-court">
                    {m.match_type === "rated" ? "Rated" : "Friendly"}
                    {" · "}
                    <span className="text-muted-foreground">
                      {m.court_booked ? "Court booked" : "Arrange together"}
                    </span>
                    {isDoubles && (
                      <span className="text-navy">
                        {" · "}
                        {joined}/{m.max_players} · {remaining} {remaining === 1 ? "spot" : "spots"}{" "}
                        left
                      </span>
                    )}
                    {!isDoubles && m.desired_min_rating != null && m.desired_max_rating != null && (
                      <span className="text-muted-foreground">
                        {" · "}
                        {m.desired_min_rating}–{m.desired_max_rating}
                      </span>
                    )}
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-navy">
                    {outsideRating ? (
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Outside your rating range
                      </span>
                    ) : viewerJoined ? (
                      <span className="rounded-full bg-court px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-navy">
                        You're in
                      </span>
                    ) : (
                      <>
                        View invite <ChevronRight className="h-3 w-3" />
                      </>
                    )}
                  </p>
                </div>
                <FormatBadge format={m.format} doublesStyle={m.doubles_style} size="md" prominent />
              </>
            );
            const rowClass = `grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 ${i > 0 ? "border-t border-border" : ""}`;
            return outsideRating ? (
              <div
                key={m.id}
                aria-disabled="true"
                className={`${rowClass} bg-secondary/20 opacity-75`}
              >
                {content}
              </div>
            ) : (
              <Link key={m.id} to="/matches/$id" params={{ id: m.id }} className={rowClass}>
                {content}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function FindPage() {
  const { data: profile } = useCurrentProfile();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const currentRating = profile?.current_rating ?? 1200;
  const [ratingEnabled, setRatingEnabled] = useState(true);
  const [minRating, setMinRating] = useState(Math.max(0, currentRating - 200));
  const [maxRating, setMaxRating] = useState(currentRating + 200);
  useEffect(() => {
    setMinRating(Math.max(0, currentRating - 200));
    setMaxRating(currentRating + 200);
  }, [currentRating]);
  const playerSearch = useServerFn(searchPlayers);
  const { data: playerRows, isLoading: playersLoading } = useQuery({
    queryKey: ["find", "players"],
    queryFn: () => playerSearch({ data: { query: "" } }),
    staleTime: 30_000,
  });

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visiblePlayers = useMemo(() => {
    return (playerRows ?? [])
      .map((p): Player => {
        const courts = (p.preferred_courts ?? []).map(decodeCourt).map((court) => court.name);
        return {
          id: p.id,
          name: p.name,
          rating: p.current_rating ?? 0,
          provisional: p.provisional,
          wins: p.wins,
          losses: p.losses,
          location: courts[0] ?? "Singapore",
          courts,
          availability: p.availability ?? [],
          photo: p.photo_url || initialsAvatar(p.name),
        };
      })
      .filter((p) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          p.name.toLocaleLowerCase().includes(normalizedSearch) ||
          p.location.toLocaleLowerCase().includes(normalizedSearch) ||
          p.courts.some((court) => court.toLocaleLowerCase().includes(normalizedSearch));
        if (!matchesSearch) return false;
        if (normalizedSearch.length > 0 || !ratingEnabled) return true;
        return p.rating >= minRating && p.rating <= maxRating;
      });
  }, [playerRows, normalizedSearch, ratingEnabled, minRating, maxRating]);

  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-navy">Find players</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {visiblePlayers.length} active players near you
        </p>
      </div>

      <OpenInvitesNearMe
        search={search}
        ratingEnabled={ratingEnabled}
        minRating={minRating}
        maxRating={maxRating}
      />

      {/* Search */}
      <div className="mb-3 flex items-center gap-2">
        <div className="grid flex-1 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or venue"
            className="bg-transparent text-sm text-navy placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((value) => !value)}
          aria-expanded={showFilters}
          aria-label="Adjust Find filters"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-card text-navy"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-6">
        <button
          type="button"
          onClick={() => setRatingEnabled((value) => !value)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${
            ratingEnabled
              ? "bg-navy text-primary-foreground"
              : "border border-border bg-card text-navy"
          }`}
        >
          {ratingEnabled ? `Rating ${minRating}–${maxRating} ×` : "Any rating"}
        </button>
        {showFilters && (
          <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-3">
            <label className="text-xs font-medium text-navy">
              Minimum rating
              <input
                type="number"
                min={0}
                max={4000}
                value={minRating}
                onChange={(event) => setMinRating(Number(event.target.value))}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-navy">
              Maximum rating
              <input
                type="number"
                min={0}
                max={4000}
                value={maxRating}
                onChange={(event) => setMaxRating(Number(event.target.value))}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="grid gap-3 md:grid-cols-2">
        {visiblePlayers.map((p) => (
          <PlayerCard key={p.id} player={p} />
        ))}
        {playersLoading && <p className="text-sm text-muted-foreground">Loading players…</p>}
        {!playersLoading && visiblePlayers.length === 0 && (
          <p className="text-sm text-muted-foreground">No players match your search and filters.</p>
        )}
      </div>
    </AppShell>
  );
}
