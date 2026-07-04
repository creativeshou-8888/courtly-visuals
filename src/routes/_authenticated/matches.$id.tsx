import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardEdit,
  Flag,
  Lock,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Trophy,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ScoreEntry } from "@/components/ScoreEntry";
import {
  acceptMatch,
  cancelMatch,
  confirmScore,
  declineMatch,
  disputeScore,
  getMatch,
  submitScore,
  type ScoreSet,
} from "@/lib/match.functions";
import { initialsAvatar } from "@/hooks/use-current-profile";

export const Route = createFileRoute("/_authenticated/matches/$id")({
  head: () => ({
    meta: [
      { title: "Match · Courtly" },
      { name: "description", content: "Match invite details." },
    ],
  }),
  component: MatchDetail,
});

const statusLabels: Record<string, string> = {
  open: "Open invite",
  invited: "Invite sent",
  accepted: "Match accepted",
  declined: "Declined",
  score_pending: "Score pending",
  confirmation_pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  disputed: "Disputed",
  cancelled: "Cancelled",
  expired: "Expired",
  voided: "Voided",
};

function StatusPill({ status }: { status: string }) {
  const isLive = status === "open" || status === "invited";
  const isAccepted = status === "accepted";
  const cls = isAccepted
    ? "bg-navy text-primary-foreground"
    : isLive
      ? "bg-court text-navy"
      : "bg-secondary text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${cls}`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}

function PersonRow({ label, name, photo }: { label: string; name: string; photo: string | null }) {
  const src = photo || initialsAvatar(name);
  return (
    <div className="flex items-center gap-3">
      <img src={src} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-background" />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-navy">{name}</p>
      </div>
    </div>
  );
}

function MatchDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const fetchMatch = useServerFn(getMatch);
  const cancel = useServerFn(cancelMatch);
  const accept = useServerFn(acceptMatch);
  const decline = useServerFn(declineMatch);
  const submit = useServerFn(submitScore);
  const confirm = useServerFn(confirmScore);
  const dispute = useServerFn(disputeScore);
  const [scoreOpen, setScoreOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["match", id],
    queryFn: () => fetchMatch({ data: { id } }),
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["match", id] });
    qc.invalidateQueries({ queryKey: ["me", "outgoing-invites"] });
    qc.invalidateQueries({ queryKey: ["me", "incoming-invites"] });
    qc.invalidateQueries({ queryKey: ["me", "upcoming-matches"] });
    qc.invalidateQueries({ queryKey: ["find", "open-invites"] });
    qc.invalidateQueries({ queryKey: ["me", "profile"] });
  };

  const cancelMutation = useMutation({
    mutationFn: cancel,
    onSuccess: () => {
      toast.success("Invite cancelled");
      invalidateAll();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not cancel"),
  });
  const acceptMutation = useMutation({
    mutationFn: accept,
    onSuccess: () => {
      toast.success("Match accepted");
      invalidateAll();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not accept"),
  });
  const declineMutation = useMutation({
    mutationFn: decline,
    onSuccess: () => {
      toast.success("Invite declined");
      invalidateAll();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not decline"),
  });
  const submitMutation = useMutation({
    mutationFn: submit,
    onSuccess: () => {
      toast.success("Score submitted — waiting for opponent confirmation");
      setScoreOpen(false);
      invalidateAll();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not submit score"),
  });
  const confirmMutation = useMutation({
    mutationFn: confirm,
    onSuccess: () => {
      toast.success("Score confirmed");
      invalidateAll();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not confirm"),
  });
  const disputeMutation = useMutation({
    mutationFn: dispute,
    onSuccess: () => {
      toast("Score disputed — the result is held for review");
      invalidateAll();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not dispute"),
  });

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading match…</p>
      </AppShell>
    );
  }
  if (error || !data) {
    return (
      <AppShell>
        <button onClick={() => router.history.back()} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <p className="text-sm text-muted-foreground">Match not found or no longer visible.</p>
      </AppShell>
    );
  }

  const { match, creator, opponent, viewerIsCreator } = data;
  const when = new Date(match.date_time).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const isFuture = new Date(match.date_time).getTime() > Date.now();
  const canCancel = viewerIsCreator && (match.status === "open" || match.status === "invited");
  const canAcceptOpen = !viewerIsCreator && match.status === "open" && isFuture;
  const canRespondDirect =
    !viewerIsCreator && match.status === "invited" && isFuture; // opponent-only rows are only readable by the invited opponent per RLS
  const isAccepted = match.status === "accepted";

  return (
    <AppShell>
      <Link to="/home" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">
              {isAccepted ? "Match accepted" : match.opponent_id ? "Match invite" : "Open invite"}
            </h1>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
              {match.match_type === "rated" ? "Rated match" : "Friendly match"} · Singles
            </p>
          </div>
          <StatusPill status={match.status} />
        </div>

        <div className="mt-5 space-y-3">
          {creator && <PersonRow label="Creator" name={creator.name} photo={creator.photo_url} />}
          {match.opponent_id ? (
            opponent ? (
              <PersonRow label="Opponent" name={opponent.name} photo={opponent.photo_url} />
            ) : (
              <PersonRow label="Opponent" name="Player" photo={null} />
            )
          ) : (
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-navy">
                <UserIcon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Opponent</p>
                <p className="text-sm font-semibold text-navy">
                  Any player
                  {match.desired_min_rating != null && match.desired_max_rating != null
                    ? ` · ${match.desired_min_rating}–${match.desired_max_rating}`
                    : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-navy">
            <CalendarClock className="h-4 w-4" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider">When</h2>
          </div>
          <p className="mt-2 text-sm font-medium text-navy">{when}</p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-navy">
            <MapPin className="h-4 w-4" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider">Where</h2>
          </div>
          <p className="mt-2 text-sm font-medium text-navy">{match.court_location}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {match.court_booked ? "Court booked" : "Need to arrange together"}
          </p>
        </div>
      </section>

      {match.message && (
        <section className="mt-4 rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-navy">
            <MessageSquare className="h-4 w-4" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider">Message</h2>
          </div>
          <p className="mt-2 text-sm text-navy">{match.message}</p>
        </section>
      )}

      {isAccepted && (
        <>
          <section className="mt-4 rounded-3xl border border-court/40 bg-court/10 p-5">
            <div className="flex items-center gap-2 text-navy">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-sm font-semibold">Match accepted</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              After the match, score entry will be added in the next phase.
            </p>
          </section>

          <section className="mt-4 rounded-3xl border border-dashed border-border bg-secondary/40 p-5">
            <div className="flex items-center gap-2 text-navy">
              <Lock className="h-4 w-4" />
              <p className="text-sm font-medium">Contact sharing will be added in a later phase.</p>
            </div>
          </section>
        </>
      )}

      {canAcceptOpen && (
        <section className="mt-4 rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-navy">
            <ShieldCheck className="h-4 w-4" />
            <p className="text-sm font-medium">Ready to play?</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => acceptMutation.mutate({ data: { id } })}
              disabled={acceptMutation.isPending}
              className="rounded-full bg-court px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
            >
              {acceptMutation.isPending ? "Accepting…" : "Accept invite"}
            </button>
            <button
              onClick={() => router.history.back()}
              className="rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold text-navy"
            >
              Not for me
            </button>
          </div>
        </section>
      )}

      {canRespondDirect && (
        <section className="mt-4 rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-navy">
            <ShieldCheck className="h-4 w-4" />
            <p className="text-sm font-medium">You've been invited</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => acceptMutation.mutate({ data: { id } })}
              disabled={acceptMutation.isPending || declineMutation.isPending}
              className="rounded-full bg-court px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
            >
              {acceptMutation.isPending ? "Accepting…" : "Accept"}
            </button>
            <button
              onClick={() => declineMutation.mutate({ data: { id } })}
              disabled={acceptMutation.isPending || declineMutation.isPending}
              className="rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
            >
              {declineMutation.isPending ? "Declining…" : "Decline"}
            </button>
          </div>
        </section>
      )}

      {canCancel && (
        <button
          onClick={() => cancelMutation.mutate({ data: { id } })}
          disabled={cancelMutation.isPending}
          className="mt-4 w-full rounded-full border border-destructive/30 bg-background px-5 py-3 text-sm font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-60"
        >
          {cancelMutation.isPending ? "Cancelling…" : "Cancel invite"}
        </button>
      )}
    </AppShell>
  );
}
