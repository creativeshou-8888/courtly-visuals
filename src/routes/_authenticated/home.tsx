import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, ChevronRight, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/PlayerBits";
import { recentResults } from "@/lib/mock-data";
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
        to="/find"
        className="fixed bottom-24 right-5 z-20 inline-flex items-center gap-2 rounded-full bg-navy px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-navy/25 md:bottom-8"
      >
        <ChevronRight className="hidden" />
        <Plus className="h-5 w-5 text-court" />
        Create match
      </Link>
    </AppShell>
  );
}
