import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarClock, Lock, MapPin } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar, ProvisionalBadge } from "@/components/PlayerBits";
import { currentUser, lastFiveResults, players } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/players/$id")({
  head: () => ({
    meta: [
      { title: "Player · Courtly" },
      { name: "description", content: "Player profile, rating and recent matches." },
    ],
  }),
  component: PlayerProfile,
});

function PlayerProfile() {
  const { id } = Route.useParams();
  const player = id === "me" ? currentUser : players.find((p) => p.id === id) ?? players[0];
  const isMe = id === "me";

  return (
    <AppShell>
      <Link
        to="/find"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      {/* Hero */}
      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4">
          <Avatar player={player} size={72} />
          <div className="min-w-0 pt-1">
            <h1 className="truncate font-display text-2xl font-bold text-navy">
              {player.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {player.wins}W · {player.losses}L
            </p>
            {player.provisional && (
              <div className="mt-2">
                <ProvisionalBadge />
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Rating
            </p>
            <p className="rating-hero text-5xl leading-none text-navy">{player.rating}</p>
            {typeof player.ratingChange === "number" && (
              <span className="mt-2 inline-block rounded-full bg-court px-2 py-0.5 text-xs font-bold text-navy">
                +{player.ratingChange}
              </span>
            )}
          </div>
        </div>

        {!isMe && (
          <button className="mt-6 w-full rounded-full bg-navy px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]">
            Invite to match
          </button>
        )}
      </section>

      {/* Locked contact */}
      {!isMe && (
        <section className="mt-4 rounded-3xl border border-dashed border-border bg-secondary/40 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-background text-navy">
              <Lock className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-navy">Contact hidden</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Shared after both players accept a match.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Courts + availability */}
      <section className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-navy">
            <MapPin className="h-4 w-4" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider">
              Preferred courts
            </h2>
          </div>
          <ul className="space-y-1.5 text-sm text-navy">
            {player.courts.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-navy">
            <CalendarClock className="h-4 w-4" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider">
              Availability
            </h2>
          </div>
          <ul className="space-y-1.5 text-sm text-navy">
            {player.availability.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Last 5 results */}
      <section className="mt-4 rounded-3xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Last 5 matches
          </h2>
        </div>
        <ul>
          {lastFiveResults.map((r, i) => (
            <li
              key={r.id}
              className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                  r.result === "W" ? "bg-court text-navy" : "bg-secondary text-muted-foreground"
                }`}
              >
                {r.result}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-navy">vs {r.opponent}</p>
                <p className="truncate text-xs text-muted-foreground">{r.score}</p>
              </div>
              <span
                className={`rating-hero text-sm ${
                  r.delta >= 0 ? "text-navy" : "text-destructive"
                }`}
              >
                {r.delta >= 0 ? "+" : ""}
                {r.delta}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
