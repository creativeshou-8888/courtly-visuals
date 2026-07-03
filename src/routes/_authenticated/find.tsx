import { createFileRoute } from "@tanstack/react-router";
import { Search, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PlayerCard } from "@/components/PlayerBits";
import { players } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/find")({
  head: () => ({
    meta: [
      { title: "Find Players · Courtly" },
      { name: "description", content: "Filter by rating, location and availability to find your next match." },
    ],
  }),
  component: FindPage,
});

const filterChips = [
  "Rating 1600–1750",
  "Central & East",
  "Weekday evenings",
  "Weekends",
];

function FindPage() {
  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-navy">Find players</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {players.length} active players near you
        </p>
      </div>

      {/* Search */}
      <div className="mb-3 flex items-center gap-2">
        <div className="grid flex-1 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search name or venue"
            className="bg-transparent text-sm text-navy placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <button className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-card text-navy">
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Filter chips */}
      <div className="mb-6 -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {filterChips.map((c, i) => (
          <button
            key={c}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium ${
              i === 0
                ? "bg-navy text-primary-foreground"
                : "border border-border bg-card text-navy"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid gap-3 md:grid-cols-2">
        {players.map((p) => (
          <PlayerCard key={p.id} player={p} />
        ))}
      </div>
    </AppShell>
  );
}
