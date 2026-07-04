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
import {
  getMyFeedbackForMatch,
  submitFeedback,
} from "@/lib/feedback.functions";
import { FeedbackForm } from "@/components/FeedbackForm";
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
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSkipped, setFeedbackSkipped] = useState(false);

  const fetchMyFeedback = useServerFn(getMyFeedbackForMatch);
  const sendFeedback = useServerFn(submitFeedback);

  const { data, isLoading, error } = useQuery({
    queryKey: ["match", id],
    queryFn: () => fetchMatch({ data: { id } }),
  });

  const { data: myFeedback } = useQuery({
    queryKey: ["match", id, "my-feedback"],
    queryFn: () => fetchMyFeedback({ data: { match_id: id } }),
    enabled: !!data && data.match.status === "confirmed",
    staleTime: 30_000,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["match", id] });
    qc.invalidateQueries({ queryKey: ["me", "outgoing-invites"] });
    qc.invalidateQueries({ queryKey: ["me", "incoming-invites"] });
    qc.invalidateQueries({ queryKey: ["me", "upcoming-matches"] });
    qc.invalidateQueries({ queryKey: ["find", "open-invites"] });
    qc.invalidateQueries({ queryKey: ["me", "profile"] });
    qc.invalidateQueries({ queryKey: ["me", "recent-rating-change"] });
    qc.invalidateQueries({ queryKey: ["leaderboard", "all-time"] });
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
  const feedbackMutation = useMutation({
    mutationFn: sendFeedback,
    onSuccess: () => {
      toast.success("Kudos sent");
      setFeedbackOpen(false);
      qc.invalidateQueries({ queryKey: ["match", id, "my-feedback"] });
      qc.invalidateQueries({ queryKey: ["kudos"] });
      qc.invalidateQueries({ queryKey: ["leaderboard", "badges"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not send feedback"),
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
  const nowMs = Date.now();
  const isFuture = new Date(match.date_time).getTime() > nowMs;
  const isPastScheduled = new Date(match.date_time).getTime() <= nowMs;
  const currentUserId = viewerIsCreator ? match.creator_id : match.opponent_id;
  const canCancel = viewerIsCreator && (match.status === "open" || match.status === "invited");
  const canAcceptOpen = !viewerIsCreator && match.status === "open" && isFuture;
  const canRespondDirect = !viewerIsCreator && match.status === "invited" && isFuture;
  const isAccepted = match.status === "accepted";
  const isPending = match.status === "score_pending";
  const isConfirmed = match.status === "confirmed";
  const isDisputed = match.status === "disputed";
  const canEnterScore = isAccepted && isPastScheduled && match.opponent_id != null;
  const isSubmitter = isPending && match.submitted_by === currentUserId;
  const canConfirmOrDispute = isPending && !isSubmitter;

  const winnerName =
    match.winner_id === match.creator_id
      ? creator?.name ?? "Player"
      : opponent?.name ?? "Player";
  const loserName =
    match.winner_id === match.creator_id
      ? opponent?.name ?? "Player"
      : creator?.name ?? "Player";

  const sets: ScoreSet[] = Array.isArray(match.score_sets) ? (match.score_sets as ScoreSet[]) : [];
  const displaySets = sets.map((s) =>
    match.winner_id === match.creator_id ? `${s.a}–${s.b}` : `${s.b}–${s.a}`,
  );

  return (
    <AppShell>
      <Link to="/home" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">
              {isConfirmed
                ? "Match result"
                : isPending
                  ? "Score awaiting confirmation"
                  : isDisputed
                    ? "Score disputed"
                    : isAccepted
                      ? "Match accepted"
                      : match.opponent_id
                        ? "Match invite"
                        : "Open invite"}
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

      {(isConfirmed || isPending || isDisputed) && sets.length > 0 && (
        <section
          className={`mt-4 rounded-3xl border p-5 ${
            isConfirmed
              ? "border-court/40 bg-court/10"
              : isDisputed
                ? "border-destructive/30 bg-destructive/5"
                : "border-border bg-card"
          }`}
        >
          <div className="flex items-center gap-2 text-navy">
            <Trophy className="h-4 w-4" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider">
              {isConfirmed ? "Final result" : "Submitted result"}
            </h2>
          </div>
          <p className="mt-3 text-sm font-semibold text-navy">
            {winnerName} <span className="text-muted-foreground">def.</span> {loserName}
          </p>
          <p className="mt-1 rating-hero text-lg text-navy">{displaySets.join(", ")}</p>
          {isPending && (
            <p className="mt-2 text-xs text-muted-foreground">
              Submitted by {match.submitted_by === match.creator_id ? creator?.name ?? "creator" : opponent?.name ?? "opponent"}
            </p>
          )}
        </section>
      )}

      {isAccepted && (
        <>
          {canEnterScore ? (
            !scoreOpen ? (
              <section className="mt-4 rounded-3xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 text-navy">
                  <ClipboardEdit className="h-4 w-4" />
                  <p className="text-sm font-semibold">Match time has passed</p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Either player can enter the score. Your opponent will then confirm or dispute it.
                </p>
                <button
                  onClick={() => setScoreOpen(true)}
                  className="mt-3 w-full rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  Enter score
                </button>
              </section>
            ) : (
              creator && opponent && (
                <ScoreEntry
                  creator={{ id: creator.id, name: creator.name }}
                  opponent={{ id: opponent.id, name: opponent.name }}
                  submitting={submitMutation.isPending}
                  onCancel={() => setScoreOpen(false)}
                  onSubmit={(winnerId, sets) =>
                    submitMutation.mutate({ data: { id, winner_id: winnerId, sets } })
                  }
                />
              )
            )
          ) : (
            <section className="mt-4 rounded-3xl border border-court/40 bg-court/10 p-5">
              <div className="flex items-center gap-2 text-navy">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-sm font-semibold">Match accepted</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                You'll be able to enter the score right after the scheduled match time.
              </p>
            </section>
          )}

          <section className="mt-4 rounded-3xl border border-dashed border-border bg-secondary/40 p-5">
            <div className="flex items-center gap-2 text-navy">
              <Lock className="h-4 w-4" />
              <p className="text-sm font-medium">Contact sharing will be added in a later phase.</p>
            </div>
          </section>
        </>
      )}

      {isPending && isSubmitter && (
        <section className="mt-4 rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-navy">
            <ShieldCheck className="h-4 w-4" />
            <p className="text-sm font-medium">Score submitted — waiting for opponent confirmation</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Your opponent will confirm or dispute the result. Ratings update on confirmation for rated matches.
          </p>
        </section>
      )}

      {canConfirmOrDispute && (
        <section className="mt-4 rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-navy">
            <ShieldCheck className="h-4 w-4" />
            <p className="text-sm font-medium">Does this result look right?</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => confirmMutation.mutate({ data: { id } })}
              disabled={confirmMutation.isPending || disputeMutation.isPending}
              className="rounded-full bg-court px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
            >
              {confirmMutation.isPending ? "Confirming…" : "Confirm score"}
            </button>
            <button
              onClick={() => disputeMutation.mutate({ data: { id } })}
              disabled={confirmMutation.isPending || disputeMutation.isPending}
              className="rounded-full border border-destructive/40 bg-background px-4 py-2.5 text-sm font-semibold text-destructive disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-1">
                <Flag className="h-3.5 w-3.5" />
                {disputeMutation.isPending ? "Disputing…" : "Dispute"}
              </span>
            </button>
          </div>
        </section>
      )}

      {isDisputed && (
        <section className="mt-4 rounded-3xl border border-destructive/30 bg-destructive/5 p-5">
          <p className="text-sm font-semibold text-destructive">Score disputed</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The submitted score is held for review. Ratings won't change until this is resolved.
          </p>
        </section>
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
