import { useState, useEffect, useRef } from "react";
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
  UserPlus,
  User as UserIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ScoreEntry } from "@/components/ScoreEntry";
import {
  acceptMatch,
  addMatchGuest,
  cancelMatch,
  cancelDisputedMatch,
  confirmScore,
  declineMatch,
  disputeScore,
  getMatch,
  joinDoublesMatch,
  listMatchParticipants,
  removeMatchGuest,
  resubmitScore,
  submitScore,
  type ScoreSet,
} from "@/lib/match.functions";
import {
  getMyFeedbackForMatch,
  submitFeedback,
} from "@/lib/feedback.functions";
import { FeedbackForm } from "@/components/FeedbackForm";
import { BadgeMedal } from "@/components/BadgeMedal";
import { FormatBadge } from "@/components/FormatBadge";
import { markKudosSkipped, clearKudosSkipped } from "@/lib/kudos-skipped";
import { initialsAvatar, useCurrentProfile } from "@/hooks/use-current-profile";


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

function StatusPill({ status, overrideLabel }: { status: string; overrideLabel?: string }) {
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
      {overrideLabel ?? statusLabels[status] ?? status}
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
  const { data: myProfile } = useCurrentProfile();
  const qc = useQueryClient();
  const fetchMatch = useServerFn(getMatch);
  const cancel = useServerFn(cancelMatch);
  const accept = useServerFn(acceptMatch);
  const decline = useServerFn(declineMatch);
  const submit = useServerFn(submitScore);
  const confirm = useServerFn(confirmScore);
  const dispute = useServerFn(disputeScore);
  const resubmit = useServerFn(resubmitScore);
  const cancelDisputed = useServerFn(cancelDisputedMatch);
  const joinDoubles = useServerFn(joinDoublesMatch);
  const fetchParticipants = useServerFn(listMatchParticipants);
  const addGuestFn = useServerFn(addMatchGuest);
  const removeGuestFn = useServerFn(removeMatchGuest);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
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
  const resubmitMutation = useMutation({
    mutationFn: resubmit,
    onSuccess: () => {
      toast.success("Score resubmitted — waiting for opponent confirmation");
      setEditOpen(false);
      invalidateAll();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not resubmit score"),
  });
  const cancelDisputedMutation = useMutation({
    mutationFn: cancelDisputed,
    onSuccess: () => {
      toast.success("Match cancelled");
      setConfirmCancelOpen(false);
      invalidateAll();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not cancel match"),
  });
  const feedbackMutation = useMutation({
    mutationFn: sendFeedback,
    onSuccess: () => {
      toast.success("Kudos sent");
      setFeedbackOpen(false);
      clearKudosSkipped(id);
      qc.invalidateQueries({ queryKey: ["match", id, "my-feedback"] });
      qc.invalidateQueries({ queryKey: ["kudos"] });
      qc.invalidateQueries({ queryKey: ["leaderboard", "badges"] });
      qc.invalidateQueries({ queryKey: ["me", "recent-matches"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not send feedback"),
  });

  const isDoublesMatch = ((data?.match as any)?.format ?? "singles") === "doubles";
  const { data: participants } = useQuery({
    queryKey: ["match", id, "participants"],
    queryFn: () => fetchParticipants({ data: { id } }),
    enabled: !!data && isDoublesMatch,
    staleTime: 15_000,
  });
  const joinMutation = useMutation({
    mutationFn: joinDoubles,
    onSuccess: () => {
      toast.success("Joined match");
      qc.invalidateQueries({ queryKey: ["match", id, "participants"] });
      invalidateAll();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not join match"),
  });
  const addGuestMutation = useMutation({
    mutationFn: addGuestFn,
    onSuccess: () => {
      toast.success("Guest added");
      setGuestDialogOpen(false);
      setGuestName("");
      qc.invalidateQueries({ queryKey: ["match", id, "participants"] });
      invalidateAll();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not add guest"),
  });
  const removeGuestMutation = useMutation({
    mutationFn: removeGuestFn,
    onSuccess: () => {
      toast.success("Guest removed");
      qc.invalidateQueries({ queryKey: ["match", id, "participants"] });
      invalidateAll();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not remove guest"),
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
  const isDoubles = ((match as any).format ?? "singles") === "doubles";
  const maxPlayers: number = (match as any).max_players ?? (isDoubles ? 4 : 2);
  const doublesStyle: "standard" | "rotating" | null = (match as any).doubles_style ?? null;
  type Participant = { user_id: string; joined_at: string; profile: { id: string; name: string; photo_url: string | null; current_rating: number | null } | null };
  type Guest = { id: string; name: string; added_by: string; created_at: string };
  const partsPayload = (participants ?? { participants: [], guests: [] }) as { participants: Participant[]; guests: Guest[] };
  const partsList: Participant[] = partsPayload.participants;
  const guestList: Guest[] = partsPayload.guests;
  const guestCount = isDoubles ? guestList.length : 0;
  const joinedCount = isDoubles ? partsList.length + guestCount : 0;
  const remainingSpots = Math.max(0, maxPlayers - joinedCount);
  const myId = myProfile?.id;
  const currentUserId = viewerIsCreator ? match.creator_id : match.opponent_id ?? myId;
  const viewerIsParticipant = isDoubles && !!myId && partsList.some((p) => p.user_id === myId);
  const isFull = isDoubles && joinedCount >= maxPlayers;
  const canManageGuests = isDoubles && viewerIsCreator && doublesStyle === "standard" && (match.status === "open" || match.status === "accepted");
  const canCancel = viewerIsCreator && (match.status === "open" || match.status === "invited");
  const canAcceptOpen = !isDoubles && !viewerIsCreator && match.status === "open" && isFuture;
  const canRespondDirect = !isDoubles && !viewerIsCreator && match.status === "invited" && isFuture;
  const isAccepted = match.status === "accepted";
  const isPending = match.status === "score_pending";
  const isConfirmed = match.status === "confirmed";
  const isDisputed = match.status === "disputed";
  const canEnterScore = !isDoubles && isAccepted && isPastScheduled && match.opponent_id != null;
  const isSubmitter = !isDoubles && (isPending || isDisputed) && match.submitted_by === currentUserId;
  const canConfirmOrDispute = !isDoubles && isPending && !isSubmitter;
  const canResolveDispute = !isDoubles && isDisputed && isSubmitter;
  const canJoinDoubles = isDoubles && match.status === "open" && isFuture && !viewerIsCreator && !viewerIsParticipant && !isFull;

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
                    : isDoubles && isFull
                      ? "Match confirmed"
                      : isAccepted
                        ? "Match accepted"
                        : match.opponent_id
                          ? "Match invite"
                          : "Open invite"}
            </h1>
            <p className="mt-1 inline-flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <span>{match.match_type === "rated" ? "Rated match" : "Friendly match"}</span>
              <FormatBadge format={(match as any).format} doublesStyle={(match as any).doubles_style} />
            </p>
          </div>
          <StatusPill status={match.status} overrideLabel={isDoubles && isFull ? "Match full" : undefined} />
        </div>

        <div className="mt-5 space-y-3">
          {isDoubles ? (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Players · {joinedCount}/{maxPlayers}
                {remainingSpots > 0 && match.status === "open" && (
                  <span className="ml-2 text-court">{remainingSpots} {remainingSpots === 1 ? "spot" : "spots"} left</span>
                )}
              </p>
              <div className="space-y-2">
                {partsList.map((p, i) => (
                  <div key={p.user_id} className="flex items-center gap-3 rounded-2xl border border-navy/20 bg-navy/5 p-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-navy">
                      {i + 1}
                    </span>
                    <img
                      src={p.profile?.photo_url || initialsAvatar(p.profile?.name || "Player")}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-navy">
                      {p.profile?.name ?? "Player"}
                      {p.user_id === match.creator_id && (
                        <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">· host</span>
                      )}
                    </p>
                  </div>
                ))}
                {guestList.map((g, i) => (
                  <div key={g.id} className="flex items-center gap-3 rounded-2xl border border-navy/20 bg-navy/5 p-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-navy">
                      {partsList.length + i + 1}
                    </span>
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-court/40 text-navy">
                      <UserIcon className="h-4 w-4" />
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-navy">
                      {g.name}
                      <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">· guest</span>
                    </p>
                    {canManageGuests && (
                      <button
                        type="button"
                        onClick={() => removeGuestMutation.mutate({ data: { guest_id: g.id } })}
                        disabled={removeGuestMutation.isPending}
                        aria-label={`Remove ${g.name}`}
                        className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {Array.from({ length: remainingSpots }).map((_, i) => {
                  const slotNum = partsList.length + guestCount + i + 1;
                  if (canManageGuests) {
                    return (
                      <button
                        key={`empty-${i}`}
                        type="button"
                        onClick={() => setGuestDialogOpen(true)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-court/60 bg-court/5 p-2.5 text-left transition-colors hover:bg-court/15"
                      >
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground">
                          {slotNum}
                        </span>
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-court text-navy">
                          <UserPlus className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-semibold text-navy">
                          Open spot
                          <span className="ml-1 text-xs font-normal text-muted-foreground">— tap to add a friend</span>
                        </span>
                      </button>
                    );
                  }
                  return (
                    <div key={`empty-${i}`} className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-background p-2.5">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground">
                        {slotNum}
                      </span>
                      <p className="text-sm text-muted-foreground">Open spot</p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
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
            </>
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

      {isConfirmed && match.match_type === "rated" && match.opponent_id && (
        <KudosBlock
          matchId={id}
          opponentName={(viewerIsCreator ? opponent?.name : creator?.name) ?? "your opponent"}
          myFeedback={myFeedback}
          feedbackOpen={feedbackOpen}
          feedbackSkipped={feedbackSkipped}
          setFeedbackOpen={setFeedbackOpen}
          setFeedbackSkipped={setFeedbackSkipped}
          submitting={feedbackMutation.isPending}
          onSubmit={(badges, note) =>
            feedbackMutation.mutate({ data: { match_id: id, badges, note } })
          }
        />
      )}

      {isDoubles && canJoinDoubles && (
        <section className="mt-4 rounded-3xl border border-court/40 bg-court/10 p-5">
          <div className="flex items-center gap-2 text-navy">
            <UserIcon className="h-4 w-4" />
            <p className="text-sm font-semibold">Join this doubles match</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {remainingSpots} {remainingSpots === 1 ? "spot" : "spots"} left · {joinedCount}/{maxPlayers} players
          </p>
          <button
            onClick={() => joinMutation.mutate({ data: { id } })}
            disabled={joinMutation.isPending}
            className="mt-3 w-full rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {joinMutation.isPending ? "Joining…" : "Join match"}
          </button>
        </section>
      )}

      {isDoubles && viewerIsParticipant && match.status === "open" && (
        <section className="mt-4 rounded-3xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-navy">You're in this match</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Waiting for {remainingSpots} more {remainingSpots === 1 ? "player" : "players"} to join.
          </p>
        </section>
      )}

      {isDoubles && isFull && !isConfirmed && (
        <section className="mt-4 rounded-3xl border border-dashed border-court/50 bg-court/10 p-5">
          <p className="text-sm font-semibold text-navy">Match full — {joinedCount}/{maxPlayers} players</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Doubles scoring coming next. You'll be able to enter the result here in an upcoming update.
          </p>
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

          {canResolveDispute && !editOpen && (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                onClick={() => setEditOpen(true)}
                disabled={resubmitMutation.isPending || cancelDisputedMutation.isPending}
                className="rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-1">
                  <ClipboardEdit className="h-3.5 w-3.5" />
                  Edit & resubmit score
                </span>
              </button>
              <button
                onClick={() => setConfirmCancelOpen(true)}
                disabled={resubmitMutation.isPending || cancelDisputedMutation.isPending}
                className="rounded-full border border-destructive/40 bg-background px-4 py-2.5 text-sm font-semibold text-destructive disabled:opacity-60"
              >
                Cancel match
              </button>
            </div>
          )}

          {isDisputed && !isSubmitter && (
            <p className="mt-4 rounded-2xl bg-background/70 px-3 py-2 text-xs text-muted-foreground">
              Waiting for {(viewerIsCreator ? opponent?.name : creator?.name) ?? "your opponent"} to edit &amp; resubmit the score or cancel the match.
            </p>
          )}
        </section>
      )}

      {canResolveDispute && editOpen && creator && opponent && (
        <ScoreEntry
          creator={{ id: creator.id, name: creator.name }}
          opponent={{ id: opponent.id, name: opponent.name }}
          submitting={resubmitMutation.isPending}
          initialWinnerId={match.winner_id ?? undefined}
          initialSets={sets.length ? sets : undefined}
          submitLabel="Resubmit score"
          onCancel={() => setEditOpen(false)}
          onSubmit={(winnerId, newSets) =>
            resubmitMutation.mutate({ data: { id, winner_id: winnerId, sets: newSets } })
          }
        />
      )}

      {confirmCancelOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-background p-5">
            <h3 className="font-display text-base font-semibold text-navy">Cancel this match?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This match will be marked cancelled. No ratings, wins, losses, provisional progress, leaderboard, community result, or kudos will be recorded. This cannot be undone.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setConfirmCancelOpen(false)}
                disabled={cancelDisputedMutation.isPending}
                className="rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
              >
                Keep match
              </button>
              <button
                onClick={() => cancelDisputedMutation.mutate({ data: { id } })}
                disabled={cancelDisputedMutation.isPending}
                className="rounded-full bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-60"
              >
                {cancelDisputedMutation.isPending ? "Cancelling…" : "Cancel match"}
              </button>
            </div>
          </div>
        </div>
      )}

      {guestDialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-background p-5">
            <h3 className="font-display text-base font-semibold text-navy">Fill this open spot</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Leave it open so a Courtly player can join, or add a friend who doesn't have a Courtly account.
            </p>

            <button
              type="button"
              onClick={() => {
                setGuestDialogOpen(false);
                setGuestName("");
              }}
              className="mt-4 w-full rounded-2xl border border-border bg-card p-3 text-left text-sm font-semibold text-navy hover:bg-secondary"
            >
              Leave open for Courtly players
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                Anyone at the right level can join this spot.
              </span>
            </button>

            <div className="mt-3 rounded-2xl border border-border bg-card p-3">
              <label htmlFor="guest-name" className="text-sm font-semibold text-navy">
                Add a friend without a Courtly account
              </label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                No email or phone needed. They'll show up as a guest — no rating, no leaderboard, no kudos.
              </p>
              <input
                id="guest-name"
                type="text"
                autoFocus
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                maxLength={40}
                placeholder="Name or nickname"
                className="mt-3 w-full rounded-full border border-border bg-background px-4 py-2 text-sm text-navy placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-court"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGuestDialogOpen(false);
                    setGuestName("");
                  }}
                  disabled={addGuestMutation.isPending}
                  className="rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    addGuestMutation.mutate({ data: { match_id: id, name: guestName.trim() } })
                  }
                  disabled={addGuestMutation.isPending || guestName.trim().length === 0}
                  className="rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {addGuestMutation.isPending ? "Adding…" : "Add guest"}
                </button>
              </div>
            </div>
          </div>
        </div>
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

type MyFeedback = { id: string; badges: string[]; note: string | null; created_at: string } | null | undefined;

function KudosBlock({
  matchId,
  opponentName,
  myFeedback,
  feedbackOpen,
  feedbackSkipped,
  setFeedbackOpen,
  setFeedbackSkipped,
  submitting,
  onSubmit,
}: {
  matchId: string;
  opponentName: string;
  myFeedback: MyFeedback;
  feedbackOpen: boolean;
  feedbackSkipped: boolean;
  setFeedbackOpen: (v: boolean) => void;
  setFeedbackSkipped: (v: boolean) => void;
  submitting: boolean;
  onSubmit: (badges: string[], note: string | null) => void;
}) {
  const sectionRef = useRef<HTMLDivElement | null>(null);

  // Auto-open when navigated with #kudos
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#kudos" && !myFeedback && !feedbackOpen) {
      clearKudosSkipped(matchId);
      setFeedbackSkipped(false);
      setFeedbackOpen(true);
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
  }, [matchId, myFeedback]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={sectionRef} id="kudos">
      {myFeedback ? (
        <section className="mt-4 rounded-3xl border border-court/40 bg-court/10 p-5">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy">
            Kudos sent to {opponentName}
            <CheckCircle2 className="h-4 w-4 text-navy" />
          </p>
          {myFeedback.badges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {myFeedback.badges.map((b) => (
                <BadgeMedal key={b} name={b} size="sm" />
              ))}
            </div>
          )}
          {myFeedback.note && (
            <blockquote className="mt-3 rounded-2xl bg-background/70 p-3 text-sm italic text-navy">
              "{myFeedback.note}"
            </blockquote>
          )}
        </section>
      ) : feedbackOpen ? (
        <FeedbackForm
          opponentName={opponentName}
          submitting={submitting}
          onCancel={() => {
            markKudosSkipped(matchId);
            setFeedbackOpen(false);
            setFeedbackSkipped(true);
          }}
          onSubmit={onSubmit}
        />
      ) : feedbackSkipped ? null : (
        <section className="mt-4 rounded-3xl border border-court/40 bg-court/10 p-5">
          <p className="text-sm font-semibold text-navy">Give {opponentName} some kudos?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pick up to 3 achievement badges and leave an optional note.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setFeedbackOpen(true)}
              className="rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Give kudos
            </button>
            <button
              onClick={() => {
                markKudosSkipped(matchId);
                setFeedbackSkipped(true);
              }}
              className="rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold text-navy"
            >
              Skip for now
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

