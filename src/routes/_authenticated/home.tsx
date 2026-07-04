import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, ChevronRight, Trophy, Inbox, CheckCircle2, Award } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/PlayerBits";
import { recentResults } from "@/lib/mock-data";
import { useCurrentProfile, initialsAvatar } from "@/hooks/use-current-profile";
import { useSkippedKudos } from "@/lib/kudos-skipped";
import {
  listMyOutgoingInvites,
  listIncomingInvites,
  listUpcomingMatches,
  listMyRecentMatches,
} from "@/lib/match.functions";


export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home · Courtly" },
      { name: "description", content: "Your matches, invites and community results." },
    ],
  }),
  component: HomePage,
});

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between px-1">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {action && <span className="text-xs font-medium text-navy">{action}</span>}
    </div>
  );
}

function OutgoingInvites() {
  const fetchInvites = useServerFn(listMyOutgoingInvites);
  const { data } = useQuery({
    queryKey: ["me", "outgoing-invites"],
    queryFn: () => fetchInvites(),
    staleTime: 15_000,
  });
  const invites = data ?? [];

  return (
    <section className="mb-6">
      <SectionHeader title="My outgoing invites" />
      {invites.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-6 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-secondary text-navy">
            <Inbox className="h-4 w-4" />
          </div>
          <p className="mt-3 text-sm text-navy">No outgoing invites yet.</p>
          <Link
            to="/matches/new"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4 text-court" /> Create a match
          </Link>
        </div>
      ) : (
        <div className="rounded-3xl border border-border bg-card">
          {invites.map((m, i) => {
            const when = new Date(m.date_time).toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });
            return (
              <Link
                key={m.id}
                to="/matches/$id"
                params={{ id: m.id }}
                className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 ${i > 0 ? "border-t border-border" : ""}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy">
                    {m.opponent_id ? m.opponent_name ?? "Player" : "Open invite"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {when} · {m.court_location}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {m.match_type === "rated" ? "Rated" : "Friendly"} ·{" "}
                    <span className="text-navy">
                      {m.status === "open" ? "Open" : m.status === "invited" ? "Invited" : m.status}
                    </span>
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function IncomingInvites() {
  const fetch = useServerFn(listIncomingInvites);
  const { data } = useQuery({
    queryKey: ["me", "incoming-invites"],
    queryFn: () => fetch(),
    staleTime: 15_000,
  });
  const invites = data ?? [];
  if (invites.length === 0) return null;
  return (
    <section className="mb-6">
      <SectionHeader title="Incoming invites" />
      <div className="rounded-3xl border border-border bg-card">
        {invites.map((m, i) => (
          <Link
            key={m.id}
            to="/matches/$id"
            params={{ id: m.id }}
            className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 ${i > 0 ? "border-t border-border" : ""}`}
          >
            <img
              src={m.creator?.photo_url || initialsAvatar(m.creator?.name || "Player")}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-navy">
                {m.creator?.name ?? "Player"}
                {m.creator?.current_rating != null && (
                  <span className="ml-1 text-xs font-medium text-muted-foreground">· {m.creator.current_rating}</span>
                )}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {formatWhen(m.date_time)} · {m.court_location}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-court">
                {m.match_type === "rated" ? "Rated" : "Friendly"} · Invited you
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function UpcomingMatches() {
  const fetch = useServerFn(listUpcomingMatches);
  const { data } = useQuery({
    queryKey: ["me", "upcoming-matches"],
    queryFn: () => fetch(),
    staleTime: 15_000,
  });
  const matches = data ?? [];
  if (matches.length === 0) return null;
  return (
    <section className="mb-6">
      <SectionHeader title="Upcoming matches" />
      <div className="rounded-3xl border border-border bg-card">
        {matches.map((m, i) => (
          <Link
            key={m.id}
            to="/matches/$id"
            params={{ id: m.id }}
            className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 ${i > 0 ? "border-t border-border" : ""}`}
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-court text-navy">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-navy">
                {m.creator?.name ?? "Player"} vs {m.opponent?.name ?? "Player"}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {formatWhen(m.date_time)} · {m.court_location}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-navy">
                {m.match_type === "rated" ? "Rated" : "Friendly"} ·{" "}
                {m.status === "score_pending"
                  ? "Score pending"
                  : new Date(m.date_time).getTime() <= Date.now()
                    ? "Ready to score"
                    : "Accepted"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function RecentMatches() {
  const fetch = useServerFn(listMyRecentMatches);
  const { data } = useQuery({
    queryKey: ["me", "recent-matches"],
    queryFn: () => fetch(),
    staleTime: 15_000,
  });
  const matches = data ?? [];
  if (matches.length === 0) return null;
  return (
    <section className="mb-6">
      <SectionHeader title="My recent matches" />
      <div className="rounded-3xl border border-border bg-card">
        {matches.map((m, i) => {
          const when = new Date(m.date_time).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          const score = (m.score_sets ?? [])
            .map((s: { a: number; b: number }) => (m.viewer_is_creator ? `${s.a}–${s.b}` : `${s.b}–${s.a}`))
            .join(", ");
          const change = m.rating_change;
          const changeStr =
            change == null ? null : `${change > 0 ? "+" : ""}${change}`;
          return (
            <Link
              key={m.id}
              to="/matches/$id"
              params={{ id: m.id }}
              className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 ${i > 0 ? "border-t border-border" : ""}`}
            >
              <img
                src={m.opponent?.photo_url || initialsAvatar(m.opponent?.name || "Player")}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy">
                  {m.opponent?.name ?? "Player"}
                </p>
                <p className="mt-0.5 truncate text-xs">
                  <span
                    className={`font-semibold ${m.won ? "text-navy" : "text-muted-foreground"}`}
                  >
                    {m.won ? "WIN" : "LOSS"}
                  </span>
                  {score && <span className="text-muted-foreground"> · {score}</span>}
                  {changeStr && (
                    <span
                      className={`ml-1 font-semibold ${
                        (change ?? 0) >= 0 ? "text-navy" : "text-destructive"
                      }`}
                    >
                      · {changeStr}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {when}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function HomePage() {

  const { data: profile } = useCurrentProfile();
  const first = profile?.name?.split(" ")[0] || "there";
  const photo = profile?.photo_url || initialsAvatar(profile?.name || "You");
  const hasMatches = (profile?.rated_matches ?? 0) > 0;

  return (
    <AppShell>
      {/* Greeting */}
      <div className="mb-6 flex items-center gap-3">
        <img src={photo} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-background" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Welcome back</p>
          <h1 className="truncate font-display text-xl font-bold text-navy">{first}</h1>
        </div>
        <div className="ml-auto rounded-2xl bg-navy px-4 py-2 text-right">
          <p className="text-[10px] font-medium uppercase tracking-wider text-court">Rating</p>
          <p className="rating-hero text-2xl leading-none text-primary-foreground">
            {profile?.current_rating ?? "—"}
          </p>
        </div>
      </div>

      {!hasMatches ? (
        <section className="mb-6 rounded-3xl border border-border bg-card p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-court">
            <Trophy className="h-5 w-5 text-navy" />
          </div>
          <h2 className="mt-3 font-display text-lg font-bold text-navy">
            You haven't played a rated match yet
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Find your first opponent and start climbing the Singapore leaderboard.
          </p>
          <Link
            to="/find"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4 text-court" /> Find your first opponent
          </Link>
        </section>
      ) : null}

      <IncomingInvites />
      <UpcomingMatches />
      <OutgoingInvites />
      <RecentMatches />


      {/* Recent community results — placeholder content */}
      <section className="mb-6">
        <SectionHeader title="Recent community results" />
        <div className="rounded-3xl border border-border bg-card">
          {recentResults.map((r, i) => (
            <div
              key={r.id}
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <div className="min-w-0 flex items-center gap-3">
                <Avatar player={r.a} size={32} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy">
                    {r.a.name} <span className="text-muted-foreground">def.</span> {r.b.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.when}</p>
                </div>
              </div>
              <span className="rating-hero text-sm text-navy">{r.score}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Floating create match */}
      <Link
        to="/matches/new"
        className="fixed bottom-24 right-5 z-20 inline-flex items-center gap-2 rounded-full bg-navy px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-navy/25 md:bottom-8"
      >
        <Plus className="h-5 w-5 text-court" />
        Create match
      </Link>
    </AppShell>
  );
}
