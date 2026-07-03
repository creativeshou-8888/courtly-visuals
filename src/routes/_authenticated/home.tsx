import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Check, X, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/PlayerBits";
import {
  openInvites,
  pendingConfirmation,
  recentResults,
  upcomingMatches,
} from "@/lib/mock-data";
import { useCurrentProfile, initialsAvatar } from "@/hooks/use-current-profile";

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

function HomePage() {
  const { data: profile } = useCurrentProfile();
  const first = profile?.name?.split(" ")[0] || "there";
  const photo = profile?.photo_url || initialsAvatar(profile?.name || "You");
  return (
    <AppShell>
      {/* Greeting */}
      <div className="mb-6 flex items-center gap-3">
        <img src={photo} alt="" className="h-12 w-12 rounded-full ring-2 ring-background" />
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


      {/* Pending confirmation */}
      <section className="mb-6">
        <div className="rounded-3xl bg-court p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">
            Score awaiting your confirmation
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Avatar player={pendingConfirmation.opponent} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-semibold text-navy">
                vs {pendingConfirmation.opponent.name}
              </p>
              <p className="truncate text-xs text-navy/70">{pendingConfirmation.playedAt}</p>
            </div>
            <div className="text-right">
              <p className="rating-hero text-lg text-navy">{pendingConfirmation.score}</p>
              <p className="text-[11px] font-semibold text-navy/80">
                Rating {pendingConfirmation.ratingDelta > 0 ? "+" : ""}
                {pendingConfirmation.ratingDelta}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="inline-flex items-center justify-center gap-1.5 rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              <Check className="h-4 w-4" /> Confirm
            </button>
            <button className="inline-flex items-center justify-center gap-1.5 rounded-full border border-navy/20 bg-background/40 px-4 py-2.5 text-sm font-semibold text-navy">
              <X className="h-4 w-4" /> Dispute
            </button>
          </div>
        </div>
      </section>

      {/* Upcoming matches */}
      <section className="mb-6">
        <SectionHeader title="Upcoming matches" action="See all" />
        <div className="space-y-2">
          {upcomingMatches.map((m) => (
            <div
              key={m.id}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <Avatar player={m.opponent} size={44} />
              <div className="min-w-0">
                <p className="truncate font-medium text-navy">vs {m.opponent.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.when} · {m.court}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          ))}
        </div>
      </section>

      {/* Open invites */}
      <section className="mb-6">
        <SectionHeader title="Open invites near your level" />
        <div className="grid gap-3 md:grid-cols-2">
          {openInvites.map((inv) => (
            <div key={inv.id} className="rounded-3xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <Avatar player={inv.from} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy">{inv.from.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{inv.level}</p>
                </div>
                <span className="ml-auto rating-hero text-xl text-navy">{inv.from.rating}</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {inv.when} · {inv.court}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="rounded-full bg-court px-3 py-2 text-xs font-semibold text-navy">
                  Accept
                </button>
                <button className="rounded-full border border-border px-3 py-2 text-xs font-semibold text-navy">
                  Pass
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent community results */}
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
              <div className="min-w-0">
                <p className="truncate font-medium text-navy">
                  {r.a.name} <span className="text-muted-foreground">def.</span> {r.b.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.when}</p>
              </div>
              <span className="rating-hero text-sm text-navy">{r.score}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Floating create match */}
      <Link
        to="/find"
        className="fixed bottom-24 right-5 z-20 inline-flex items-center gap-2 rounded-full bg-navy px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-navy/25 md:bottom-8"
      >
        <Plus className="h-5 w-5 text-court" />
        Create match
      </Link>
    </AppShell>
  );
}
