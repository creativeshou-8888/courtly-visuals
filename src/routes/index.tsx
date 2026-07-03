import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Search, Swords, TrendingUp } from "lucide-react";
import { players } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Courtly — Rated tennis for Singapore" },
      { name: "description", content: "Find rated tennis partners, log matches, and climb the Singapore leaderboard." },
      { property: "og:title", content: "Courtly — Rated tennis for Singapore" },
      { property: "og:description", content: "Find. Play. Compete. Rated tennis matches for Singapore players." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const top10 = [...players].sort((a, b) => b.rating - a.rating).slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 md:py-7">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-navy">
            <span className="h-3.5 w-3.5 rounded-full bg-court" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-navy">Courtly</span>
        </div>
        <Link
          to="/home"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-navy hover:bg-secondary"
        >
          Sign in
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-5 pt-6 md:pt-16">
        <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <span className="inline-flex items-center rounded-full bg-court px-3 py-1 text-xs font-semibold uppercase tracking-wider text-navy">
              Singapore · Recreational
            </span>
            <h1 className="mt-5 font-display text-5xl font-bold leading-[1.02] tracking-tight text-navy md:text-7xl">
              Find.<br />Play.<br />
              <span className="relative inline-block">
                Compete.
                <span className="absolute -bottom-2 left-0 h-2 w-full rounded-full bg-court" />
              </span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">
              Rated tennis matches for Singapore players. Skip the guesswork — meet
              partners at your level and watch your rating grow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/home"
                className="inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
              >
                Join Courtly <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/home"
                className="inline-flex items-center rounded-full border border-border bg-background px-6 py-3.5 text-sm font-semibold text-navy hover:bg-secondary"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Leaderboard preview */}
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Top 10 · This Month
              </h2>
              <span className="text-xs text-muted-foreground">SG</span>
            </div>
            <ol className="space-y-2">
              {top10.map((p, i) => (
                <li
                  key={p.id}
                  className={`grid grid-cols-[1.5rem_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-3 py-2 ${
                    i < 3 ? "bg-secondary" : ""
                  }`}
                >
                  <span
                    className={`text-sm font-bold ${
                      i === 0 ? "text-navy" : "text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <img src={p.photo} alt="" className="h-8 w-8 rounded-full" />
                  <span className="truncate text-sm font-medium text-navy">{p.name}</span>
                  <span className="rating-hero text-base text-navy">{p.rating}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 3-step explainer */}
      <section className="mx-auto mt-20 max-w-5xl px-5 pb-20 md:mt-32">
        <h2 className="font-display text-2xl font-bold text-navy md:text-3xl">
          How it works
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { n: "01", title: "Find a player", body: "Filter by rating, location and availability across Singapore.", Icon: Search },
            { n: "02", title: "Play a rated match", body: "Meet up on court. Confirm your score together after.", Icon: Swords },
            { n: "03", title: "Watch your rating climb", body: "Every match updates your rating and your leaderboard rank.", Icon: TrendingUp },
          ].map(({ n, title, body, Icon }) => (
            <div key={n} className="rounded-3xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold text-muted-foreground">{n}</span>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-court text-navy">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <h3 className="mt-6 font-display text-xl font-semibold text-navy">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © 2026 Courtly · Made for Singapore tennis
      </footer>
    </div>
  );
}
