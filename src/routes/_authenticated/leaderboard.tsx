import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ProvisionalBadge } from "@/components/PlayerBits";
import { players } from "@/lib/mock-data";
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
  const [tab, setTab] = useState<"all" | "month">("all");
  const ranked = [...players].sort((a, b) => b.rating - a.rating);
  const myRank = 6; // pretend

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-navy">Leaderboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Singapore · Live rankings</p>
      </div>

      {/* Tabs */}
      <div className="mb-5 inline-flex rounded-full border border-border bg-card p-1">
        {(
          [
            ["all", "All-Time"],
            ["month", "This Month"],
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

      {/* You row (pinned) */}
      <div className="sticky top-14 z-10 mb-4 md:top-16">
        <div className="grid grid-cols-[2.5rem_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl bg-navy p-3 text-primary-foreground shadow-lg shadow-navy/20">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-court text-navy font-display font-bold">
            #{myRank}
          </span>
          <img src={currentUser.photo} alt="" className="h-10 w-10 rounded-full" />
          <div className="min-w-0">
            <p className="truncate font-semibold">You</p>
            <p className="truncate text-xs text-primary-foreground/70">
              {currentUser.wins}W · {currentUser.losses}L · +{currentUser.ratingChange} this week
            </p>
          </div>
          <span className="rating-hero text-2xl text-court">{currentUser.rating}</span>
        </div>
      </div>

      {/* Ranked list */}
      <ol className="space-y-2">
        {ranked.map((p, i) => {
          const rank = i + 1;
          const topThree = rank <= 3;
          return (
            <li
              key={p.id}
              className={`grid grid-cols-[2.5rem_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl border p-3 transition-shadow ${
                topThree
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
              <img src={p.photo} alt="" className="h-10 w-10 rounded-full" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-navy">{p.name}</p>
                  {p.provisional && <ProvisionalBadge />}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {p.wins}W · {p.losses}L
                </p>
              </div>
              <span className="rating-hero text-2xl text-navy">{p.rating}</span>
            </li>
          );
        })}
      </ol>
    </AppShell>
  );
}
