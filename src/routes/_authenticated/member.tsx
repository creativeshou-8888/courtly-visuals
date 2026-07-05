import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Gift,
  Sparkles,
  Trophy,
  UsersRound,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/member")({
  head: () => ({
    meta: [
      { title: "Courtly+ · Coming soon" },
      {
        name: "description",
        content:
          "Courtly+ is coming soon — priority tournament access, advanced insights and premium tools for regular tennis groups.",
      },
      { property: "og:title", content: "Courtly+ · Coming soon" },
      {
        property: "og:description",
        content:
          "Priority tournament access, advanced insights and premium tools for regular tennis groups.",
      },
    ],
  }),
  component: MemberPage,
});

const benefits = [
  {
    icon: Trophy,
    title: "Priority tournament registration",
    body: "Get earlier access to draws and priority when you enter Courtly tournaments.",
  },
  {
    icon: Zap,
    title: "Priority waitlist",
    body: "Jump to the front when tournament players withdraw last minute.",
  },
  {
    icon: Calendar,
    title: "Early access to new tournaments",
    body: "See and register for new Courtly tournaments before anyone else.",
  },
  {
    icon: BarChart3,
    title: "Advanced performance insights",
    body: "Deeper stats, form curves and head-to-head breakdowns on every opponent.",
  },
  {
    icon: UsersRound,
    title: "Premium tools for tennis groups",
    body: "Better coordination for regular weekly hitting partners and Doubles crews.",
  },
  {
    icon: Gift,
    title: "One guaranteed tournament entry each year",
    body: "After 12 continuous months as a Courtly+ member, one guaranteed entry into an eligible Courtly tournament, every year.",
  },
];

function MemberPage() {
  const [joined, setJoined] = useState(false);

  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-3xl border border-border bg-navy p-6 text-primary-foreground md:p-10">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-court/25 blur-3xl" aria-hidden />
        <div className="absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-court/15 blur-3xl" aria-hidden />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-court px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-navy">
            <Sparkles className="h-3.5 w-3.5" /> Coming soon
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Courtly+
          </h1>
          <p className="mt-3 max-w-xl font-display text-lg text-court md:text-2xl">
            Play more. Compete more. Get your shot.
          </p>
          <p className="mt-5 max-w-xl text-sm text-primary-foreground/80 md:text-base">
            Courtly+ is designed for players who want deeper match insights,
            priority tournament access, and better tools for regular tennis groups.
          </p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          What you'll get
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {benefits.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-3xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-court text-navy">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-base font-semibold text-navy">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-dashed border-border bg-secondary/40 p-5">
        <p className="text-sm text-navy">
          <span className="font-semibold">Core Courtly stays free.</span>{" "}
          Finding players, creating and joining matches, recording scores,
          ratings, leaderboards, kudos and basic match history will always be
          included for every player.
        </p>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6 text-center md:p-8">
        <p className="font-display text-lg font-semibold text-navy">
          Courtly+ is coming soon
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Join the waitlist and we'll let you know the moment it opens up.
        </p>
        {joined ? (
          <p className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-court px-4 py-2.5 text-sm font-semibold text-navy">
            <CheckCircle2 className="h-4 w-4" />
            You're on the Courtly+ waitlist.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setJoined(true)}
            className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" /> Join the waitlist
          </button>
        )}
      </section>
    </AppShell>
  );
}
