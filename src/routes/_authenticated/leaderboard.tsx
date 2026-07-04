import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { ProvisionalBadge } from "@/components/PlayerBits";
import { getLeaderboard } from "@/lib/match.functions";
import { getBadgeLeaderboard } from "@/lib/feedback.functions";
import { Award } from "lucide-react";
import { useCurrentProfile, initialsAvatar } from "@/hooks/use-current-profile";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard · Courtly" },
      { name: "description", content: "Singapore's rated tennis leaderboard." },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const [tab, setTab] = useState<"all" | "month" | "badges">("all");
  const { data: profile } = useCurrentProfile();
  const fetchLb = useServerFn(getLeaderboard);
  const fetchBadges = useServerFn(getBadgeLeaderboard);
  const { data: lb, isLoading } = useQuery({
    queryKey: ["leaderboard", "all-time"],
    queryFn: () => fetchLb(),
    staleTime: 30_000,
  });
  const { data: badgeLb, isLoading: badgesLoading } = useQuery({
    queryKey: ["leaderboard", "badges"],
    queryFn: () => fetchBadges(),
    staleTime: 30_000,
    enabled: tab === "badges",
  });

  const photo = profile?.photo_url || initialsAvatar(profile?.name || "You");
  const hasMatches = (profile?.rated_matches ?? 0) > 0;
  const top = lb?.top ?? [];
  const me = lb?.me ?? null;
  const meInTop = me ? top.some((p) => p.id === me.id) : false;

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-navy">Leaderboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Singapore · Top 50 · Live rankings</p>
      </div>

      <div className="mb-5 inline-flex rounded-full border border-border bg-card p-1">
        {(
          [
            ["all", "Rating"],
            ["month", "This Month"],
            ["badges", "Badges"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              tab === id ? "bg-navy text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "month" && (
        <div className="mb-4 rounded-3xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
          Monthly rankings arrive in a later phase. Showing All-Time below.
        </div>
      )}

      {tab === "badges" && (
        <BadgesTab loading={badgesLoading} data={badgeLb ?? []} />
      )}

      {tab !== "badges" && (
      <>


      {/* You row (pinned) */}
      <div className="sticky top-14 z-10 mb-4 md:top-16">
        {hasMatches && me ? (
          <div className="grid grid-cols-[2.5rem_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl bg-navy p-3 text-primary-foreground shadow-lg shadow-navy/20">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-court text-navy font-display font-bold">
              #{me.rank}
            </span>
            <img src={photo} alt="" className="h-10 w-10 rounded-full object-cover" />
            <div className="min-w-0">
              <p className="truncate font-semibold">You</p>
              <p className="truncate text-xs text-primary-foreground/70">
                {me.wins}W · {me.losses}L
                {me.provisional ? " · Provisional" : ""}
              </p>
            </div>
            <span className="rating-hero text-2xl text-court">{me.current_rating}</span>
          </div>
        ) : (
          <div className="grid grid-cols-[2.5rem_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl border border-dashed border-navy/20 bg-card p-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-navy font-display text-xs font-bold">
              —
            </span>
            <img src={photo} alt="" className="h-10 w-10 rounded-full object-cover" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-navy">Rank pending</p>
              <p className="truncate text-xs text-muted-foreground">
                Play your first rated match to enter the rankings.
              </p>
            </div>
            <Link
              to="/find"
              className="rounded-full bg-navy px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Find
            </Link>
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading rankings…</p>
      ) : top.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No ranked players yet. Be the first to complete a rated match.
        </div>
      ) : (
        <ol className="space-y-2">
          {top.map((p) => {
            const rank = p.rank;
            const topThree = rank <= 3;
            const isMe = me?.id === p.id;
            return (
              <li
                key={p.id}
                className={`grid grid-cols-[2.5rem_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl border p-3 transition-shadow ${
                  isMe
                    ? "border-navy/40 bg-navy/5"
                    : topThree
                      ? "border-court/50 bg-court/10"
                      : "border-border bg-card hover:shadow-sm"
                }`}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-full font-display text-sm font-bold ${
                    topThree ? "bg-navy text-court" : "bg-secondary text-navy"
                  }`}
                >
                  {rank}
                </span>
                <img
                  src={p.photo_url || initialsAvatar(p.name)}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-navy">{p.name}</p>
                    {p.provisional && <ProvisionalBadge />}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.wins}W · {p.losses}L
                  </p>
                </div>
                <span className="rating-hero text-2xl text-navy">{p.current_rating}</span>
              </li>
            );
          })}
        </ol>
      )}

      {me && !meInTop && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          You're ranked #{me.rank} of {lb?.total ?? me.rank}.
        </p>
      )}
      </>
      )}
    </AppShell>
  );
}

function BadgesTab({
  loading,
  data,
}: {
  loading: boolean;
  data: { badge: string; players: { id: string; name: string; photo_url: string | null; count: number }[] }[];
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading badges…</p>;
  }
  const hasAny = data.some((d) => d.players.length > 0);
  if (!hasAny) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No badges awarded yet. Give kudos after your next rated match.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {data.map((cat) => {
        const meta = getBadgeMeta(cat.badge);
        const Icon = meta.icon;
        return (
          <section key={cat.badge} className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className={`grid h-10 w-10 place-items-center rounded-2xl ${meta.accentBg}`}>
                <Icon className={`h-5 w-5 ${meta.accent}`} strokeWidth={2.25} />
              </div>
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-navy">
                {cat.badge}
              </h2>
            </div>
            {cat.players.length === 0 ? (
              <p className="text-xs text-muted-foreground">No awards yet.</p>
            ) : (
              <ol className="space-y-1.5">
                {cat.players.map((p, i) => (
                  <li
                    key={p.id}
                    className="grid grid-cols-[1.75rem_auto_minmax(0,1fr)_auto] items-center gap-2"
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-secondary text-[11px] font-bold text-navy">
                      {i + 1}
                    </span>
                    <img
                      src={p.photo_url || initialsAvatar(p.name)}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                    />
                    <p className="truncate text-sm text-navy">{p.name}</p>
                    <span className="rounded-full bg-navy px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                      ×{p.count}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}


