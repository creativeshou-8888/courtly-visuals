import { Link } from "@tanstack/react-router";
import { MapPin, CalendarClock } from "lucide-react";
import type { Player } from "@/lib/mock-data";

export function ProvisionalBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      Provisional
    </span>
  );
}

export function RatingBadge({ rating, delta }: { rating: number; delta?: number }) {
  return (
    <div className="flex flex-col items-end">
      <span className="rating-hero text-3xl leading-none text-navy">{rating}</span>
      {typeof delta === "number" && (
        <span
          className={`mt-1 text-[11px] font-semibold ${
            delta >= 0 ? "text-navy" : "text-destructive"
          }`}
        >
          <span
            className={`mr-1 inline-block rounded-full px-1.5 py-0.5 ${
              delta >= 0 ? "bg-court text-navy" : "bg-destructive/10 text-destructive"
            }`}
          >
            {delta >= 0 ? "+" : ""}
            {delta}
          </span>
          last match
        </span>
      )}
    </div>
  );
}

export function Avatar({ player, size = 56 }: { player: Player; size?: number }) {
  return (
    <img
      src={player.photo}
      alt={player.name}
      width={size}
      height={size}
      className="shrink-0 rounded-full ring-2 ring-background"
      style={{ width: size, height: size }}
    />
  );
}

export function PlayerCard({ player }: { player: Player }) {
  return (
    <article className="rounded-3xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar player={player} />
          <div className="min-w-0">
            <Link
              to="/players/$id"
              params={{ id: player.id }}
              className="flex items-center gap-2"
            >
              <h3 className="truncate font-display text-base font-semibold text-navy">
                {player.name}
              </h3>
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {player.wins}W · {player.losses}L
              {player.provisional ? " · " : ""}
            </p>
            {player.provisional && (
              <div className="mt-1.5">
                <ProvisionalBadge />
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <span className="rating-hero text-3xl leading-none text-navy">{player.rating}</span>
        </div>
      </div>

      <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">{player.courts.join(" · ")}</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5" />
          <span className="truncate">{player.availability.join(" · ")}</span>
        </div>
      </div>

      <Link
        to="/matches/new"
        search={{ opponentId: player.id, opponentName: player.name }}
        className="mt-4 block w-full rounded-full bg-court px-4 py-2.5 text-center text-sm font-semibold text-navy transition-transform active:scale-[0.98]"
      >
        Invite to match
      </Link>

    </article>
  );
}
