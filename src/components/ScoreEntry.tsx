import { useState } from "react";
import { validateTennisSets, type ScoreSet } from "@/lib/match.functions";

type Player = { id: string; name: string };
type SetInput = { a: string; b: string };

export function ScoreEntry({
  creator,
  opponent,
  submitting,
  onCancel,
  onSubmit,
  initialWinnerId,
  initialSets,
  submitLabel,
}: {
  creator: Player;
  opponent: Player;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (winnerId: string, sets: ScoreSet[]) => void;
  initialWinnerId?: string;
  initialSets?: ScoreSet[];
  submitLabel?: string;
}) {
  const [winnerId, setWinnerId] = useState<string>(initialWinnerId ?? "");
  const initialInputs: SetInput[] = (() => {
    const base: SetInput[] = [
      { a: "", b: "" },
      { a: "", b: "" },
      { a: "", b: "" },
    ];
    if (initialSets && initialSets.length) {
      for (let i = 0; i < Math.min(initialSets.length, 3); i++) {
        base[i] = { a: String(initialSets[i].a), b: String(initialSets[i].b) };
      }
    }
    return base;
  })();
  const [sets, setSets] = useState<SetInput[]>(initialInputs);
  const [thirdSet, setThirdSet] = useState(!!(initialSets && initialSets.length === 3));
  const [error, setError] = useState<string | null>(null);

  const activeSets = thirdSet ? sets : sets.slice(0, 2);

  const updateSet = (i: number, side: "a" | "b", value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    const next = [...sets];
    next[i] = { ...next[i], [side]: cleaned };
    setSets(next);
  };

  const toggleThird = () => {
    if (!thirdSet && sets.length < 3) {
      setSets([...sets, { a: "", b: "" }]);
    }
    setThirdSet((v) => !v);
  };

  const allFilled = activeSets.every((s) => s.a !== "" && s.b !== "");
  const canSubmit = !!winnerId && allFilled;

  const handleSubmit = () => {
    setError(null);
    if (!winnerId) return setError("Select the winner");
    if (!allFilled) return setError("Enter a score for every set");
    const parsed: ScoreSet[] = activeSets.map((s) => ({
      a: parseInt(s.a, 10),
      b: parseInt(s.b, 10),
    }));
    const creatorWon = winnerId === creator.id;
    const err = validateTennisSets(parsed, creatorWon);
    if (err) return setError(err);
    onSubmit(winnerId, parsed);
  };

  return (
    <section className="mt-4 rounded-3xl border border-border bg-card p-5">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-navy">
        Enter score
      </h2>

      <div className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Winner
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[creator, opponent].map((p) => {
            const selected = winnerId === p.id;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => setWinnerId(p.id)}
                className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold ${
                  selected
                    ? "border-navy bg-navy text-primary-foreground"
                    : "border-border bg-background text-navy"
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Set scores (games)
        </p>
        {activeSets.map((s, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <label className="flex flex-col text-xs text-muted-foreground">
              <span className="mb-1 truncate text-navy">{creator.name}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={30}
                placeholder="–"
                value={s.a}
                onChange={(e) => updateSet(i, "a", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-center text-lg font-semibold text-navy focus:border-navy focus:outline-none"
              />
            </label>
            <span className="mt-5 text-sm font-semibold text-muted-foreground">Set {i + 1}</span>
            <label className="flex flex-col text-xs text-muted-foreground">
              <span className="mb-1 truncate text-navy">{opponent.name}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={30}
                placeholder="–"
                value={s.b}
                onChange={(e) => updateSet(i, "b", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-center text-lg font-semibold text-navy focus:border-navy focus:outline-none"
              />
            </label>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={toggleThird}
        className="mt-3 text-xs font-semibold text-navy underline underline-offset-4"
      >
        {thirdSet ? "Remove third set" : "Add third set (or match tiebreak)"}
      </button>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Standard sets: 6–0 to 6–4, 7–5, 7–6. A third set may be a match tiebreak (e.g. 10–8, first
        to 10, win by 2).
      </p>

      {error && (
        <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          className="rounded-full bg-court px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
        >
          {submitting ? "Submitting…" : submitLabel ?? "Submit score"}
        </button>
      </div>
    </section>
  );
}
