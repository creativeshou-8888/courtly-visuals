import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

const createSchema = z
  .object({
    opponent_id: uuid.nullable(),
    date_time: z.string().min(1),
    court_location: z.string().trim().min(1).max(200),
    court_booked: z.boolean(),
    match_type: z.enum(["rated", "friendly"]),
    desired_min_rating: z.number().int().min(0).max(4000).nullable(),
    desired_max_rating: z.number().int().min(0).max(4000).nullable(),
    message: z.string().trim().max(500).nullable(),
  })
  .refine((d) => new Date(d.date_time).getTime() > Date.now(), {
    message: "Match must be in the future",
    path: ["date_time"],
  })
  .refine(
    (d) =>
      d.desired_min_rating == null ||
      d.desired_max_rating == null ||
      d.desired_min_rating <= d.desired_max_rating,
    { message: "Min rating must be ≤ max rating", path: ["desired_min_rating"] },
  );

export type ScoreSet = { a: number; b: number };
export type MatchRow = {
  id: string;
  creator_id: string;
  opponent_id: string | null;
  date_time: string;
  court_location: string;
  court_booked: boolean;
  match_type: "rated" | "friendly";
  status:
    | "open"
    | "invited"
    | "accepted"
    | "declined"
    | "score_pending"
    | "confirmation_pending"
    | "confirmed"
    | "disputed"
    | "cancelled"
    | "expired"
    | "voided";
  desired_min_rating: number | null;
  desired_max_rating: number | null;
  message: string | null;
  created_at: string;
  updated_at: string;
  winner_id: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  confirmed_at: string | null;
  score_sets: ScoreSet[] | null;
};

export function validateTennisSets(sets: ScoreSet[], creatorWon: boolean): string | null {
  if (!Array.isArray(sets) || sets.length < 2 || sets.length > 3) {
    return "A best-of-3 match needs 2 or 3 sets";
  }
  let aSets = 0;
  let bSets = 0;
  for (let i = 0; i < sets.length; i++) {
    const { a, b } = sets[i];
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
      return `Set ${i + 1}: enter whole non-negative game counts`;
    }
    if (a === b) return `Set ${i + 1} cannot be a tie (${a}-${b})`;
    const isFinal = i === sets.length - 1 && sets.length === 3;
    const standard =
      (a === 6 && b >= 0 && b <= 4) ||
      (b === 6 && a >= 0 && a <= 4) ||
      (a === 7 && (b === 5 || b === 6)) ||
      (b === 7 && (a === 5 || a === 6));
    const matchTb = isFinal && ((a >= 10 && a - b >= 2) || (b >= 10 && b - a >= 2));
    if (!standard && !matchTb) {
      return `Invalid tennis set score: ${a}-${b}`;
    }
    if (a > b) aSets++;
    else bSets++;
  }
  if (!((aSets === 2 && bSets <= 1) || (bSets === 2 && aSets <= 1))) {
    return "A match must be won 2 sets to 0 or 2 sets to 1";
  }
  if (creatorWon && aSets < bSets) return "Set scores do not match the selected winner";
  if (!creatorWon && bSets < aSets) return "Set scores do not match the selected winner";
  return null;
}

export const createMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ context, data }) => {
    if (data.opponent_id === context.userId) {
      throw new Error("You cannot invite yourself");
    }
    const status = data.opponent_id ? "invited" : "open";
    const payload = {
      creator_id: context.userId,
      opponent_id: data.opponent_id,
      date_time: data.date_time,
      court_location: data.court_location,
      court_booked: data.court_booked,
      match_type: data.match_type,
      desired_min_rating: data.opponent_id ? null : data.desired_min_rating,
      desired_max_rating: data.opponent_id ? null : data.desired_max_rating,
      message: data.message,
      status,
    };
    const { data: row, error } = await (context.supabase as any)
      .from("matches")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as MatchRow;
  });

export const getMatch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("matches")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const ids = [row.creator_id, row.opponent_id].filter(Boolean) as string[];
    let profiles: Record<string, { id: string; name: string; photo_url: string | null; current_rating: number | null }> = {};
    if (ids.length) {
      const { data: profs } = await (context.supabase as any)
        .from("profiles")
        .select("id,name,photo_url,current_rating")
        .in("id", ids);
      for (const p of (profs ?? []) as any[]) profiles[p.id] = p;
    }
    return {
      match: row as MatchRow,
      creator: profiles[row.creator_id] ?? null,
      opponent: row.opponent_id ? profiles[row.opponent_id] ?? null : null,
      viewerIsCreator: row.creator_id === context.userId,
    };
  });

export const listMyOutgoingInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("matches")
      .select("*")
      .eq("creator_id", context.userId)
      .in("status", ["open", "invited"])
      .order("date_time", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as MatchRow[];
    const oppIds = Array.from(
      new Set(rows.map((r) => r.opponent_id).filter(Boolean) as string[]),
    );
    let profiles: Record<string, { id: string; name: string }> = {};
    if (oppIds.length) {
      const { data: profs } = await (context.supabase as any)
        .from("profiles")
        .select("id,name")
        .in("id", oppIds);
      for (const p of (profs ?? []) as any[]) profiles[p.id] = p;
    }
    return rows.map((r) => ({
      ...r,
      opponent_name: r.opponent_id ? profiles[r.opponent_id]?.name ?? null : null,
    }));
  });

export const cancelMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("matches")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("creator_id", context.userId)
      .in("status", ["open", "invited"])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as MatchRow;
  });

export const getPlayerSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("profiles")
      .select("id,name,photo_url,current_rating")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row as { id: string; name: string; photo_url: string | null; current_rating: number | null } | null;
  });

export const acceptMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await (context.supabase as any).rpc("accept_match", { _id: data.id });
    if (error) throw new Error(error.message);
    return row as MatchRow;
  });

export const declineMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await (context.supabase as any).rpc("decline_match", { _id: data.id });
    if (error) throw new Error(error.message);
    return row as MatchRow;
  });

export const listOpenInvitesForMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me } = await (context.supabase as any)
      .from("profiles")
      .select("current_rating")
      .eq("id", context.userId)
      .maybeSingle();
    const myRating: number | null = me?.current_rating ?? null;

    const nowIso = new Date().toISOString();
    const { data, error } = await (context.supabase as any)
      .from("matches")
      .select("*")
      .eq("status", "open")
      .is("opponent_id", null)
      .neq("creator_id", context.userId)
      .gt("date_time", nowIso)
      .order("date_time", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as MatchRow[];

    const filtered = myRating == null
      ? rows
      : rows.filter((r) =>
          (r.desired_min_rating == null || myRating >= r.desired_min_rating) &&
          (r.desired_max_rating == null || myRating <= r.desired_max_rating),
        );

    const creatorIds = Array.from(new Set(filtered.map((r) => r.creator_id)));
    const profiles: Record<string, { id: string; name: string; photo_url: string | null; current_rating: number | null }> = {};
    if (creatorIds.length) {
      const { data: profs } = await (context.supabase as any)
        .from("profiles")
        .select("id,name,photo_url,current_rating")
        .in("id", creatorIds);
      for (const p of (profs ?? []) as any[]) profiles[p.id] = p;
    }
    return filtered.map((r) => ({ ...r, creator: profiles[r.creator_id] ?? null }));
  });

export const listIncomingInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("matches")
      .select("*")
      .eq("opponent_id", context.userId)
      .eq("status", "invited")
      .order("date_time", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as MatchRow[];
    const ids = Array.from(new Set(rows.map((r) => r.creator_id)));
    const profiles: Record<string, { id: string; name: string; photo_url: string | null; current_rating: number | null }> = {};
    if (ids.length) {
      const { data: profs } = await (context.supabase as any)
        .from("profiles")
        .select("id,name,photo_url,current_rating")
        .in("id", ids);
      for (const p of (profs ?? []) as any[]) profiles[p.id] = p;
    }
    return rows.map((r) => ({ ...r, creator: profiles[r.creator_id] ?? null }));
  });

export const listUpcomingMatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const nowIso = new Date().toISOString();
    const { data, error } = await (context.supabase as any)
      .from("matches")
      .select("*")
      .eq("status", "accepted")
      .gt("date_time", nowIso)
      .or(`creator_id.eq.${context.userId},opponent_id.eq.${context.userId}`)
      .order("date_time", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as MatchRow[];
    const ids = Array.from(new Set(rows.flatMap((r) => [r.creator_id, r.opponent_id]).filter(Boolean) as string[]));
    const profiles: Record<string, { id: string; name: string; photo_url: string | null }> = {};
    if (ids.length) {
      const { data: profs } = await (context.supabase as any)
        .from("profiles")
        .select("id,name,photo_url")
        .in("id", ids);
      for (const p of (profs ?? []) as any[]) profiles[p.id] = p;
    }
    return rows.map((r) => ({
      ...r,
      creator: profiles[r.creator_id] ?? null,
      opponent: r.opponent_id ? profiles[r.opponent_id] ?? null : null,
    }));
  });
