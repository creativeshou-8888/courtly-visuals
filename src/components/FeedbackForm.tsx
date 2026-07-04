import { useState } from "react";
import { Award, X } from "lucide-react";
import { BADGE_OPTIONS } from "@/lib/feedback.functions";
import { BadgeMedal } from "@/components/BadgeMedal";

type Props = {
  opponentName: string;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (badges: string[], note: string | null) => void;
};

export function FeedbackForm({ opponentName, submitting, onCancel, onSubmit }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const NOTE_MAX = 300;

  function toggle(badge: string) {
    setSelected((prev) => {
      if (prev.includes(badge)) return prev.filter((b) => b !== badge);
      if (prev.length >= 3) return prev;
      return [...prev, badge];
    });
  }

  function handleSubmit() {
    const trimmed = note.trim();
    onSubmit(selected, trimmed.length ? trimmed : null);
  }

  const canSubmit = selected.length > 0 || note.trim().length > 0;

  return (
    <section className="mt-4 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-navy">
        <Award className="h-4 w-4" />
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider">
          Kudos for {opponentName}
        </h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Pick up to 3 achievement badges and leave an optional note.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {BADGE_OPTIONS.map((badge) => {
          const on = selected.includes(badge);
          const disabled = !on && selected.length >= 3;
          return (
            <BadgeMedal
              key={badge}
              name={badge}
              size="md"
              selected={on}
              disabled={disabled}
              interactive
              onClick={() => !disabled && toggle(badge)}
            />
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{selected.length}/3 selected</p>

      <div className="mt-4">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Note (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
          rows={3}
          placeholder="Say something nice…"
          className="mt-1 w-full rounded-2xl border border-border bg-background p-3 text-sm text-navy outline-none focus:border-navy"
        />
        <p className="mt-1 text-right text-[10px] text-muted-foreground">
          {note.length}/{NOTE_MAX}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          className="rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send kudos"}
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          className="rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
        >
          <span className="inline-flex items-center justify-center gap-1">
            <X className="h-3.5 w-3.5" /> Skip for now
          </span>
        </button>
      </div>
    </section>
  );
}
