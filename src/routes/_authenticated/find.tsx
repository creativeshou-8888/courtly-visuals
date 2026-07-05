import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { PlayerCard } from "@/components/PlayerBits";
import { FormatBadge, normalizeFormat } from "@/components/FormatBadge";
import { players } from "@/lib/mock-data";
import { listOpenInvitesForMe } from "@/lib/match.functions";
import { initialsAvatar } from "@/hooks/use-current-profile";

export const Route = createFileRoute("/_authenticated/find")({
  head: () => ({
    meta: [
      { title: "Find Players · Courtly" },
      { name: "description", content: "Filter by rating, location and availability to find your next match." },
    ],
  }),
  component: FindPage,
});

const filterChips = [
  "Rating 1600–1750",
  "Central & East",
  "Weekday evenings",
  "Weekends",
];

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function OpenInvitesNearMe() {
  const fetch = useServerFn(listOpenInvitesForMe);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["find", "open-invites"],
    queryFn: () => fetch(),
    staleTime: 15_000,
    retry: 1,
  });
  const [formatFilter, setFormatFilter] = useState<"all" | "singles" | "doubles">("all");
  const allInvites = data ?? [];
  const invites = useMemo(
    () =>
      formatFilter === "all"
        ? allInvites
        : allInvites.filter((m: any) => normalizeFormat(m.format) === formatFilter),
    [allInvites, formatFilter],
  );


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
                active ? "bg-navy text-primary-foreground" : "border border-border bg-card text-navy"
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
          {invites.map((m: any, i: number) => {
            const isDoubles = normalizeFormat(m.format) === "doubles";
            const joined = m.joined_count ?? (isDoubles ? 1 : null);
            const remaining = isDoubles ? Math.max(0, (m.max_players ?? 4) - joined) : null;
            return (
              <Link
                key={m.id}
                to="/matches/$id"
                params={{ id: m.id }}
                className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 ${i > 0 ? "border-t border-border" : ""}`}
              >
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
                        {joined}/{m.max_players} · {remaining} {remaining === 1 ? "spot" : "spots"} left
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
                    View invite <ChevronRight className="h-3 w-3" />
                  </p>
                </div>
                <FormatBadge format={m.format} doublesStyle={m.doubles_style} size="md" prominent />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function FindPage() {
  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-navy">Find players</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {players.length} active players near you
        </p>
      </div>

      <OpenInvitesNearMe />

      {/* Search */}
      <div className="mb-3 flex items-center gap-2">
        <div className="grid flex-1 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search name or venue"
            className="bg-transparent text-sm text-navy placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <button className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-card text-navy">
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Filter chips */}
      <div className="mb-6 -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {filterChips.map((c, i) => (
          <button
            key={c}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium ${
              i === 0
                ? "bg-navy text-primary-foreground"
                : "border border-border bg-card text-navy"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid gap-3 md:grid-cols-2">
        {players.map((p) => (
          <PlayerCard key={p.id} player={p} />
        ))}
      </div>
    </AppShell>
  );
}
