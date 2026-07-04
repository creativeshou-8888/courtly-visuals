import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { CalendarClock, LogOut, MapPin, Pencil, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { ProvisionalBadge } from "@/components/PlayerBits";
import { useCurrentProfile, initialsAvatar } from "@/hooks/use-current-profile";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { LEVEL_DESCRIPTIONS, decodeCourt } from "@/lib/rating";
import { getMyRecentRatingChange } from "@/lib/match.functions";
import { getKudosForProfile } from "@/lib/feedback.functions";
import { Award } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile · Courtly" },
      { name: "description", content: "Your Courtly profile, rating and preferences." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useCurrentProfile();
  const router = useRouter();
  const qc = useQueryClient();
  const fetchRecent = useServerFn(getMyRecentRatingChange);
  const fetchKudos = useServerFn(getKudosForProfile);
  const { data: recent } = useQuery({
    queryKey: ["me", "recent-rating-change"],
    queryFn: () => fetchRecent(),
    staleTime: 30_000,
    enabled: !!profile,
  });
  const { data: kudos } = useQuery({
    queryKey: ["kudos", profile?.id],
    queryFn: () => fetchKudos({ data: { user_id: profile!.id } }),
    staleTime: 30_000,
    enabled: !!profile,
  });


  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  if (!profile) return null;

  const photo = profile.photo_url || initialsAvatar(profile.name || "You");
  const provisionalRemaining = Math.max(0, 5 - profile.rated_matches);
  const levelKey = profile.level ? profile.level.toFixed(1) : null;
  const levelInfo = levelKey ? LEVEL_DESCRIPTIONS[levelKey] : null;
  const courts = (profile.preferred_courts ?? []).map(decodeCourt);

  return (
    <AppShell>
      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4">
          <img
            src={photo}
            alt={profile.name}
            className="h-[72px] w-[72px] rounded-full object-cover ring-2 ring-background"
          />
          <div className="min-w-0 pt-1">
            <h1 className="truncate font-display text-2xl font-bold text-navy">
              {profile.name || "You"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.wins} {profile.wins === 1 ? "Win" : "Wins"} · {profile.losses}{" "}
              {profile.losses === 1 ? "Loss" : "Losses"}
            </p>
            {levelInfo && levelKey && (
              <p className="mt-1 text-xs font-medium text-navy">
                {levelInfo.headline} · Level {levelKey}
              </p>
            )}
            {profile.provisional && (
              <div className="mt-2">
                <ProvisionalBadge />
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Rating
            </p>
            <p className="rating-hero text-5xl leading-none text-navy">
              {profile.current_rating ?? "—"}
            </p>
            {recent && (
              <p
                className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${
                  recent.rating_change >= 0 ? "text-navy" : "text-destructive"
                }`}
              >
                {recent.rating_change >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {recent.rating_change >= 0 ? "+" : ""}
                {recent.rating_change}
                {recent.opponent_name ? ` vs ${recent.opponent_name}` : ""}
              </p>
            )}
          </div>
        </div>


        {profile.provisional && (
          <div className="mt-6 rounded-2xl bg-secondary/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Provisional progress
            </p>
            <p className="mt-1 text-sm text-navy">
              {profile.rated_matches} of 5 rated matches completed
              {provisionalRemaining > 0 && ` · ${provisionalRemaining} to go`}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background">
              <div
                className="h-full bg-navy transition-all"
                style={{ width: `${(profile.rated_matches / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Link
            to="/profile/edit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            <Pencil className="h-4 w-4" /> Edit profile
          </Link>
          <Link
            to="/profile/security"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-navy hover:bg-secondary"
          >
            <ShieldCheck className="h-4 w-4" /> Account security
          </Link>
        </div>
        <button
          onClick={signOut}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-navy hover:bg-secondary"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </section>

      {profile.bio && (
        <section className="mt-4 rounded-3xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            About
          </h2>
          <p className="mt-2 text-sm text-navy">{profile.bio}</p>
        </section>
      )}

      <section className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-navy">
            <MapPin className="h-4 w-4" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider">
              Preferred courts
            </h2>
          </div>
          {courts.length ? (
            <div className="flex flex-wrap gap-1.5">
              {courts.map((c, i) => (
                <span
                  key={`${c.name}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs text-navy"
                  title={[c.area, c.type, c.canHost ? "Can host" : ""].filter(Boolean).join(" · ")}
                >
                  {c.name}
                  {c.area && <span className="text-muted-foreground">· {c.area}</span>}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">None set yet.</p>
          )}
        </div>
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-navy">
            <CalendarClock className="h-4 w-4" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider">
              Availability
            </h2>
          </div>
          {profile.availability.length ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.availability.map((a) => (
                <span
                  key={a}
                  className="inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs text-navy"
                >
                  {a}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">None set yet.</p>
          )}
        </div>
      </section>
    </AppShell>
  );
}
